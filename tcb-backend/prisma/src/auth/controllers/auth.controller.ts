import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../services/auth.service';
import {
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../services/token.service';
import { RegisterInput, LoginInput } from '../validators/auth.validators';

// ── Cookie config ─────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production';

function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
  // refreshToken — httpOnly, not accessible to JS
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'strict' : 'lax',
    path: '/api/v1/auth', // only sent to auth endpoints
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // accessToken — httpOnly too for maximum security
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'strict' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}

function clearTokenCookies(res: Response): void {
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.clearCookie('accessToken', { path: '/' });
}

// ── Register ──────────────────────────────────

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body as RegisterInput;
    const tokens = await registerUser(name, email, password);

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    // Also send accessToken in body for the FE to decode user info
    res.status(201).json({
      status: 'success',
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;
    const tokens = await loginUser(email, password);

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(200).json({
      status: 'success',
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
};

// ── Refresh ───────────────────────────────────

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Read refreshToken from httpOnly cookie (preferred) or body (fallback)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ status: 'error', message: 'No refresh token provided' });
      return;
    }

    const tokens = await rotateRefreshToken(refreshToken);

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(200).json({
      status: 'success',
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    clearTokenCookies(res);

    res.status(200).json({ status: 'success', message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

// ── Logout All ────────────────────────────────

export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await revokeAllUserTokens(req.user!.sub);

    clearTokenCookies(res);

    res.status(200).json({ status: 'success', message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
};

// ── Google Callback ───────────────────────────

export const googleCallback = (req: Request, res: Response): void => {
  const tokens = req.user as unknown as { accessToken: string; refreshToken: string };
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

  // Redirect without tokens in URL — they're in httpOnly cookies now
  res.redirect(`${FRONTEND_URL}/auth/callback?success=true`);
};
