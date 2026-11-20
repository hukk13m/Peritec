import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/errors.js';

export type Role = 'admin' | 'sales' | 'engineering' | 'customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  phone?: string;
  position?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, companyId: user.companyId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as any }
  );
}

export async function loadUserFromToken(token: string): Promise<AuthUser> {
  let payload: any;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  const user = await User.findById(payload.sub).lean();
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status === 'locked') throw ApiError.forbidden('Account is locked');
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    companyId: user.companyId ? String(user.companyId) : null,
    phone: user.phone,
    position: user.position,
  };
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  // Allows <a href> downloads of protected PDFs from the browser.
  if (typeof req.query.token === 'string' && req.query.token) return req.query.token;
  return undefined;
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized();
    req.token = token;
    req.user = await loadUserFromToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (token) req.user = await loadUserFromToken(token);
  } catch {
    // guests stay anonymous
  }
  next();
};

/**
 * BR-08 / BR-12 / BR-16 — server-side role gate. Never rely on hidden UI.
 */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          req.user.role === 'engineering'
            ? 'Engineering staff can check configurations but cannot send commercial quotations.'
            : 'Your role is not allowed to perform this action.'
        )
      );
    }
    next();
  };

/** Internal staff = admin + sales + engineering (never customer). */
export const requireInternal = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'customer') return next(ApiError.forbidden());
  next();
};

export const isInternal = (req: Request) =>
  !!req.user && ['admin', 'sales', 'engineering'].includes(req.user.role);

/**
 * BR-12 — customers may only touch records that belong to their own company.
 */
export function assertCompanyAccess(req: Request, companyId?: unknown) {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.role !== 'customer') return;
  const owner = companyId ? String(companyId) : '';
  if (!req.user.companyId || owner !== req.user.companyId) {
    // 403 without leaking whether the record exists
    throw ApiError.forbidden('You can only access documents that belong to your company.');
  }
}
