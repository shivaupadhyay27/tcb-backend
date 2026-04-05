import { Router } from 'express';
import { handleGetPostsByAuthorSlug } from '../../posts/controllers/post.controller';

const router = Router();

// GET /authors/:slug/posts — Public, paginated, published only
router.get('/:slug/posts', handleGetPostsByAuthorSlug);

export default router;
