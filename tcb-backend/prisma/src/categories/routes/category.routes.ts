import { Router } from 'express';
import { handleGetPostsByCategorySlug } from '../../posts/controllers/post.controller';

const router = Router();

// GET /categories/:slug/posts — Public, paginated, published only
router.get('/:slug/posts', handleGetPostsByCategorySlug);

export default router;
