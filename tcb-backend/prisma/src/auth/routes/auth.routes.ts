import { Router } from 'express';
import passport from '../config/passport';
import { validate } from '../../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  googleCallback,
} from '../controllers/auth.controller';

const router = Router();

// ── Email / Password ──────────────────────────
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// ── Token management (reads refreshToken from httpOnly cookie) ──
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);

// ── Google OAuth ──────────────────────────────
router.get('/google', (req, res, next) => {
  // Only attempt Google auth if strategy is registered
  try {
    passport.authenticate('google', { session: false })(req, res, next);
  } catch {
    res.status(501).json({ status: 'error', message: 'Google OAuth not configured' });
  }
});

router.get(
  '/google/callback',
  (req, res, next) => {
    try {
      passport.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login?error=google_failed`,
      })(req, res, next);
    } catch {
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login?error=google_failed`,
      );
    }
  },
  googleCallback,
);

export default router;
