/**
 * SWISSRH — Auth Middleware
 * Pattern identique à WIN WIN V2
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'swissrh-dev-secret-change-in-prod';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  companyId: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// Require any authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.srh_session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session invalide ou expirée' });

  (req as any).user = payload;
  next();
}

// Require admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.srh_session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session invalide ou expirée' });

  if (payload.role !== 'admin') {
    console.warn(`[SECURITY] ⛔ Non-admin: ${payload.email} → ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur' });
  }

  (req as any).user = payload;
  next();
}
