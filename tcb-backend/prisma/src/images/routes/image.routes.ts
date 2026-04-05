import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../auth/middleware/authenticate';
import { authorize } from '../../auth/middleware/authorize';
import {
  handleUploadImage,
  handleGetPostImages,
  handleDeleteImage,
} from '../controllers/image.controller';

const router = Router();

// Multer config — memory storage, 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/svg+xml',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// POST /images/upload — authenticated, WRITER+
router.post(
  '/upload',
  authenticate,
  authorize('WRITER', 'EDITOR', 'ADMIN'),
  upload.single('file'),
  handleUploadImage,
);

// GET /images/post/:postId — authenticated
router.get(
  '/post/:postId',
  authenticate,
  authorize('WRITER', 'EDITOR', 'ADMIN'),
  handleGetPostImages,
);

// DELETE /images/:id — authenticated
router.delete('/:id', authenticate, authorize('WRITER', 'EDITOR', 'ADMIN'), handleDeleteImage);

export default router;
