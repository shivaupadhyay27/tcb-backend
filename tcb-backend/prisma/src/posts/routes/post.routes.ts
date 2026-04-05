import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate';
import { authorize } from '../../auth/middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createPostSchema,
  updatePostSchema,
  publishPostSchema,
} from '../validators/post.validators';
import {
  handleCreatePost,
  handleUpdatePost,
  handleGetPost,
  handleGetPostBySlug,
  handleListPosts,
  handleListPublishedPosts,
  handleDeletePost,
} from '../controllers/post.controller';
import {
  handlePublishPost,
  handleUnpublishPost,
  handleGetPublishHistory,
  handleValidatePublish,
} from '../controllers/publish.controller';
import { handleGetInternalSuggestions } from '../controllers/internal-suggestions.controller';

const router = Router();

// ── Internal suggestions (public) ────────────
// Koi bhi user related posts dekh sakta hai — login ki zaroorat nahi
router.get('/:id/internal-suggestions', handleGetInternalSuggestions);

// ── Public (published only) ───────────────────
router.get('/published', handleListPublishedPosts);
router.get('/slug/:slug', handleGetPostBySlug);

// ── Protected (admin list — all statuses) ─────
router.get('/', authenticate, authorize('WRITER', 'EDITOR', 'ADMIN'), handleListPosts);

router.get('/:id', authenticate, authorize('WRITER', 'EDITOR', 'ADMIN'), handleGetPost);

// ── Publish workflow (Editor+ only) ───────────
router.put(
  '/:id/publish',
  authenticate,
  authorize('EDITOR', 'ADMIN'),
  validate(publishPostSchema),
  handlePublishPost,
);

router.put('/:id/unpublish', authenticate, authorize('EDITOR', 'ADMIN'), handleUnpublishPost);

router.get(
  '/:id/publish-history',
  authenticate,
  authorize('EDITOR', 'ADMIN'),
  handleGetPublishHistory,
);

router.post(
  '/:id/validate-publish',
  authenticate,
  authorize('EDITOR', 'ADMIN'),
  handleValidatePublish,
);

// ── Create / Update / Delete ──────────────────
router.post(
  '/',
  authenticate,
  authorize('WRITER', 'EDITOR', 'ADMIN'),
  validate(createPostSchema),
  handleCreatePost,
);

router.put(
  '/:id',
  authenticate,
  authorize('WRITER', 'EDITOR', 'ADMIN'),
  validate(updatePostSchema),
  handleUpdatePost,
);

router.delete('/:id', authenticate, authorize('ADMIN'), handleDeletePost);

export default router;
