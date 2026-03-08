/**
 * SWISSRH — Auth Middleware
 * ============================================================
 * Rôles : admin | rh_manager | employee
 *
 * - admin       : accès total
 * - rh_manager  : accès à son équipe + données agrégées
 * - employee    : accès à ses propres données uniquement
 * ============================================================
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('[AUTH] JWT_SECRET_KEY manquante — obligatoire en prod');
}
const _secret = JWT_SECRET || 'swissrh-dev-secret-CHANGE-IN-PROD-min-32-chars';

export interface JwtPayload {
  userId:      number;
  email:       string;
  role:        'admin' | 'rh_manager' | 'employee';
  companyId:   number;
  employeeId?: number; // pour role=employee → son propre ID employé
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, _secret, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, _secret) as JwtPayload;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  return req.cookies?.srh_session ||
    req.headers.authorization?.replace('Bearer ', '') ||
    null;
}

/** Tous rôles authentifiés */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session invalide ou expirée' });
  (req as any).user = payload;
  next();
}

/** Admin uniquement */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
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

/** Admin ou rh_manager */
export function requireManager(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session invalide ou expirée' });
  if (!['admin', 'rh_manager'].includes(payload.role)) {
    console.warn(`[SECURITY] ⛔ Non-manager: ${payload.email} → ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Accès réservé aux gestionnaires RH' });
  }
  (req as any).user = payload;
  next();
}

/** Vérifie qu'un employé ne peut accéder qu'à ses propres données */
export function canAccessEmployee(requester: JwtPayload, targetEmployeeId: number): boolean {
  if (requester.role === 'admin' || requester.role === 'rh_manager') return true;
  return requester.employeeId === targetEmployeeId;
}
