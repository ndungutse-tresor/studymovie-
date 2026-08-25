import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../services/auth.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again shortly.' } },
});

const registerSchema = z.object({
  accessCode: z.string().trim().min(6, 'Enter the access code from your admission letter.'),
  password: z.string().min(10, 'Use at least 10 characters.'),
  timezone: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    res.status(201).json(await auth.register(input));
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    res.json(await auth.login(email, password));
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
    res.json(await auth.refresh(refreshToken));
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
    res.json(await auth.logout(refreshToken));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await auth.currentUser(req.user!.id) });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({ fullName: z.string().trim().min(2).optional(), timezone: z.string().trim().optional() })
      .parse(req.body);
    res.json({ user: await auth.updateProfile(req.user!.id, input) });
  }),
);

authRouter.post(
  '/password',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(10) })
      .parse(req.body);
    res.json(await auth.changePassword(req.user!.id, input.currentPassword, input.newPassword));
  }),
);
