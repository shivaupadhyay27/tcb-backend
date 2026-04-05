import { Request, Response, NextFunction } from 'express';
import { uploadImage, getImagesByPost, deleteImage } from '../services/image.service';
import { ImageType } from '@prisma/client';

// POST /images/upload
export const handleUploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'No file uploaded' });
      return;
    }

    const result = await uploadImage({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedById: req.user!.sub,
      postId: req.body.postId || undefined,
      altText: req.body.altText || '',
      caption: req.body.caption || undefined,
      type: (req.body.type as ImageType) || 'INLINE',
    });

    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// GET /images/post/:postId
export const handleGetPostImages = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const images = await getImagesByPost(req.params.postId);
    res.status(200).json({ status: 'success', data: images });
  } catch (err) {
    next(err);
  }
};

// DELETE /images/:id
export const handleDeleteImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await deleteImage(req.params.id, req.user!.sub, req.user!.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
