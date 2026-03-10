import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getSQL } from '../db/pool.js';
import { signToken, requireAuth } from './middleware.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const sql = getSQL();
    const [user] = await sql`
      SELECT u.*, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${email.toLowerCase()} AND u.is_active = true
    `;

    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    // Update last login
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    });

    res.cookie('srh_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        companyId: user.company_id,
        companyName: user.company_name,
      },
    });
  } catch (e: any) {
    console.error('[AUTH] Login error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('srh_session');
  res.json({ ok: true });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).user;
    const sql = getSQL();
    const [user] = await sql`
      SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.company_id, u.last_login,
             c.name as company_name, c.canton
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ${userId} AND u.is_active = true
    `;
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ user });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/setup — First-time admin creation (only if no users exist)
authRouter.post('/setup', async (req, res) => {
  try {
    const sql = getSQL();
    const [count] = await sql`SELECT COUNT(*)::int as c FROM users`;
    if (count.c > 0) return res.status(403).json({ error: 'Setup déjà effectué' });

    const { email, password, companyName, canton } = req.body;
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'email, password et companyName requis' });
    }

    // Create company
    const [company] = await sql`
      INSERT INTO companies (name, canton) VALUES (${companyName}, ${canton || 'JU'})
      RETURNING id
    `;

    // Create admin user
    const hash = await bcrypt.hash(password, 12);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role, company_id)
      VALUES (${email.toLowerCase()}, ${hash}, 'admin', ${company.id})
      RETURNING id, email, role, company_id
    `;

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    });

    res.cookie('srh_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[AUTH] 🎉 Setup: admin ${email} + company "${companyName}" créés`);
    res.json({ ok: true, user });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/setup-check — check if initial setup needed
authRouter.get('/setup-check', async (_req, res) => {
  try {
    const sql = getSQL();
    const [{ c }] = await sql`SELECT COUNT(*)::int as c FROM users WHERE is_active = true`;
    res.json({ needsSetup: c === 0 });
  } catch {
    res.json({ needsSetup: false });
  }
});
