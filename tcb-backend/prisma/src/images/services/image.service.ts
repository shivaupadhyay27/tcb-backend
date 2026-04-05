import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { ImageType } from '@prisma/client';

// ── Cloudinary URL builder ───────────────────
// Ensures f_auto (WebP/AVIF), q_auto, and size limits

const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'tcb_uploads';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 4096;

export function enforceCloudinaryTransforms(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  // Strip existing transforms, re-apply enforced ones
  parts[1].replace(/^[^/]+\//, (match) => {
    if (match.includes(',')) return ''; // strip existing transforms
    return match;
  });
  return `${parts[0]}/upload/f_auto,q_auto/${parts[1]}`;
}

// ── Upload via Cloudinary unsigned preset ─────

export interface UploadResult {
  id: string;
  url: string;
  publicId: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export async function uploadImage(options: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  uploadedById: string;
  postId?: string;
  altText?: string;
  caption?: string;
  type?: ImageType;
}): Promise<UploadResult> {
  const {
    fileBuffer,
    fileName,
    mimeType,
    uploadedById,
    postId,
    altText,
    caption,
    type = 'INLINE',
  } = options;

  // Validate size
  if (fileBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError(`Image exceeds ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB limit`, 422);
  }

  // Validate mime type
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/svg+xml',
  ];
  if (!allowed.includes(mimeType)) {
    throw new AppError(`Unsupported image type: ${mimeType}. Allowed: ${allowed.join(', ')}`, 422);
  }

  // Upload to Cloudinary
  let cloudinaryResult: {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
  };

  if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    // Signed upload
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', fileBuffer, { filename: fileName, contentType: mimeType });
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    form.append('folder', 'tcb');

    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha256')
      .update(
        `folder=tcb&timestamp=${timestamp}&upload_preset=${CLOUDINARY_UPLOAD_PRESET}${CLOUDINARY_API_SECRET}`,
      )
      .digest('hex');

    form.append('api_key', CLOUDINARY_API_KEY);
    form.append('timestamp', timestamp.toString());
    form.append('signature', signature);

    // form-data is compatible with fetch in Node.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: form as any,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AppError(`Cloudinary upload failed: ${err}`, 502);
    }

    cloudinaryResult = (await res.json()) as typeof cloudinaryResult;
  } else {
    // Dev fallback — store as a data URL placeholder
    const base64 = fileBuffer.toString('base64');
    cloudinaryResult = {
      secure_url: `data:${mimeType};base64,${base64.slice(0, 100)}...`,
      public_id: `dev_${Date.now()}_${fileName}`,
      width: 800,
      height: 600,
      bytes: fileBuffer.length,
      format: mimeType.split('/')[1],
    };
    console.warn('[Image] Cloudinary not configured — using dev placeholder');
  }

  // Validate dimensions
  if (cloudinaryResult.width > MAX_DIMENSION || cloudinaryResult.height > MAX_DIMENSION) {
    throw new AppError(`Image dimensions exceed ${MAX_DIMENSION}px maximum`, 422);
  }

  // Enforce WebP/AVIF via f_auto transform
  const finalUrl = enforceCloudinaryTransforms(cloudinaryResult.secure_url);

  // Save to DB
  const image = await prisma.image.create({
    data: {
      url: finalUrl,
      publicId: cloudinaryResult.public_id,
      altText: altText || '',
      caption,
      type,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      sizeBytes: cloudinaryResult.bytes,
      mimeType,
      postId: postId || null,
      uploadedById,
    },
  });

  return {
    id: image.id,
    url: image.url,
    publicId: image.publicId,
    width: cloudinaryResult.width,
    height: cloudinaryResult.height,
    sizeBytes: cloudinaryResult.bytes,
    mimeType,
  };
}

// ── Get images ───────────────────────────────

export async function getImagesByPost(postId: string) {
  return prisma.image.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteImage(imageId: string, userId: string, userRole: string) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: { id: true, uploadedById: true, publicId: true },
  });
  if (!image) throw new AppError('Image not found', 404);

  const isOwner = image.uploadedById === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have permission to delete this image', 403);
  }

  // TODO: Delete from Cloudinary via API in production

  await prisma.image.delete({ where: { id: imageId } });
}
