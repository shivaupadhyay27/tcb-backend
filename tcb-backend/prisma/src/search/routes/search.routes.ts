import { Router } from 'express';
import { authenticate } from '../../auth/middleware/authenticate';
import { authorize } from '../../auth/middleware/authorize';
import {
  handleSearch,
  handleRelatedPosts,
  handlePopularPosts,
  handleSearchAnalytics,
} from '../controllers/search.controller';

const router = Router();

// ── Public ────────────────────────────────────
router.get('/', handleSearch);

// ── Admin only ────────────────────────────────
router.get('/analytics', authenticate, authorize('ADMIN'), handleSearchAnalytics);

export default router;

// ── Exported for mounting on post routes ──────
export { handleRelatedPosts, handlePopularPosts };
