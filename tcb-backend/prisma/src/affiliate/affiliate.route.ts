import { Router } from 'express';
import { handleAffiliateRedirect } from './affiliate.controller';

const router = Router();

router.get('/:slug', handleAffiliateRedirect);

export default router;
