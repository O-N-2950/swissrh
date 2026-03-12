/**
 * SWISSRH — API Multi-mandants (Fiduciaires)
 * ============================================================
 * GET  /api/tenants                    — liste mes mandats
 * POST /api/tenants                    — créer un mandat
 * GET  /api/tenants/:id/companies      — entreprises du mandat
 * POST /api/tenants/:id/companies      — rattacher une entreprise
 * DELETE /api/tenants/:id/companies/:companyId — détacher
 * POST /api/tenants/:id/switch/:companyId      — switcher de contexte
 * ============================================================
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireAdmin, type JwtPayload } from '../auth/middleware.js';
import jwt from 'jsonwebtoken';

export const tenantRouter = Router();

const JWT_SECRET = () => process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'dev-secret';

// ─────────────────────────────────────────────────────────────
// GET /api/tenants — Liste des mandats accessibles
// ─────────────────────────────────────────────────────────────
tenantRouter.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();

  try {
    let tenants: any[];

    if (user.role === 'admin' && user.tenantId) {
      // Fiduciaire connecté → ses mandats
      tenants = await sql`
        SELECT t.*, COUNT(c.id)::int as company_count
        FROM tenants t
        LEFT JOIN companies c ON c.tenant_id = t.id
        WHERE t.id = ${user.tenantId}
        GROUP BY t.id
      `;
    } else {
      // Sinon → mandats liés à cet user via tenant_users
      tenants = await sql`
        SELECT t.*, COUNT(c.id)::int as company_count, tu.role as my_role
        FROM tenant_users tu
        JOIN tenants t ON t.id = tu.tenant_id
        LEFT JOIN companies c ON c.tenant_id = t.id
        WHERE tu.user_id = ${user.userId}
        GROUP BY t.id, tu.role
        ORDER BY t.name
      `;
    }

    res.json({ ok: true, tenants });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/tenants — Créer un mandat fiduciaire
// ─────────────────────────────────────────────────────────────
tenantRouter.post('/', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const { name, email, phone, address, npa, city, uid } = req.body;

  if (!name) return res.status(400).json({ error: 'name requis' });

  try {
    const slug = name.toLowerCase()
      .replace(/[àâä]/g,'a').replace(/[éèêë]/g,'e')
      .replace(/[ùûü]/g,'u').replace(/[ôö]/g,'o')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

    const [tenant] = await sql`
      INSERT INTO tenants (name, slug, email, phone, address, npa, city, uid)
      VALUES (${name}, ${slug}, ${email||null}, ${phone||null},
              ${address||null}, ${npa||null}, ${city||null}, ${uid||null})
      RETURNING *
    `;

    // Lier l'user créateur au tenant
    await sql`
      INSERT INTO tenant_users (tenant_id, user_id, role)
      VALUES (${tenant.id}, ${user.userId}, 'admin')
      ON CONFLICT DO NOTHING
    `;

    res.json({ ok: true, tenant });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenants/:id/companies — Entreprises d'un mandat
// ─────────────────────────────────────────────────────────────
tenantRouter.get('/:id/companies', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const tenantId = Number(req.params.id);

  try {
    // Vérifier accès
    const [access] = await sql`
      SELECT 1 FROM tenant_users
      WHERE tenant_id = ${tenantId} AND user_id = ${user.userId}
      LIMIT 1
    `;
    if (!access) return res.status(403).json({ error: 'Accès refusé' });

    const companies = await sql`
      SELECT c.id, c.name, c.legal_form, c.canton, c.uid,
             COUNT(e.id)::int as employee_count,
             MAX(p.period_year)::int as last_payroll_year,
             MAX(p.period_month)::int as last_payroll_month
      FROM companies c
      LEFT JOIN employees e ON e.company_id = c.id AND e.is_active = true
      LEFT JOIN payslips p ON p.company_id = c.id
      WHERE c.tenant_id = ${tenantId}
      GROUP BY c.id, c.name, c.legal_form, c.canton, c.uid
      ORDER BY c.name
    `;

    res.json({ ok: true, companies });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/tenants/:id/companies — Rattacher une entreprise
// ─────────────────────────────────────────────────────────────
tenantRouter.post('/:id/companies', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const tenantId  = Number(req.params.id);
  const { companyId } = req.body;

  if (!companyId) return res.status(400).json({ error: 'companyId requis' });

  try {
    const [access] = await sql`
      SELECT 1 FROM tenant_users
      WHERE tenant_id = ${tenantId} AND user_id = ${user.userId} AND role = 'admin'
      LIMIT 1
    `;
    if (!access) return res.status(403).json({ error: 'Accès admin requis' });

    await sql`
      UPDATE companies SET tenant_id = ${tenantId} WHERE id = ${companyId}
    `;

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/tenants/:id/companies/:companyId — Détacher
// ─────────────────────────────────────────────────────────────
tenantRouter.delete('/:id/companies/:companyId', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const tenantId  = Number(req.params.id);
  const companyId = Number(req.params.companyId);

  try {
    const [access] = await sql`
      SELECT 1 FROM tenant_users
      WHERE tenant_id = ${tenantId} AND user_id = ${user.userId} AND role = 'admin'
      LIMIT 1
    `;
    if (!access) return res.status(403).json({ error: 'Accès admin requis' });

    await sql`UPDATE companies SET tenant_id = NULL WHERE id = ${companyId} AND tenant_id = ${tenantId}`;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/tenants/:id/switch/:companyId
// Switcher vers le contexte d'une entreprise cliente
// Retourne un nouveau JWT avec companyId remplacé
// ─────────────────────────────────────────────────────────────
tenantRouter.post('/:id/switch/:companyId', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const tenantId  = Number(req.params.id);
  const companyId = Number(req.params.companyId);

  try {
    // Vérifier que l'user a accès au tenant ET que l'entreprise appartient au tenant
    const [access] = await sql`
      SELECT tu.role FROM tenant_users tu
      JOIN companies c ON c.id = ${companyId} AND c.tenant_id = ${tenantId}
      WHERE tu.tenant_id = ${tenantId} AND tu.user_id = ${user.userId}
      LIMIT 1
    `;
    if (!access) return res.status(403).json({ error: 'Accès refusé à cette entreprise' });

    const [company] = await sql`SELECT name FROM companies WHERE id = ${companyId}`;

    // Émettre un nouveau JWT avec le companyId de l'entreprise cliente
    const newPayload = {
      userId:    user.userId,
      email:     user.email,
      role:      'admin',          // fiduciaire agit en admin dans l'entreprise cliente
      companyId: companyId,
      tenantId:  tenantId,         // conserve l'origine fiduciaire
      isFiduciaire: true,
      originalCompanyId: user.companyId,
    };

    const token = jwt.sign(newPayload, JWT_SECRET(), { expiresIn: '8h' });

    res.cookie('srh_session', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   8 * 60 * 60 * 1000,
      path:     '/',
    });

    res.json({
      ok: true,
      companyId,
      companyName: company?.name,
      token,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/tenants/exit — Retour contexte fiduciaire d'origine
// ─────────────────────────────────────────────────────────────
tenantRouter.post('/exit', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;

  if (!user.isFiduciaire || !user.originalCompanyId) {
    return res.status(400).json({ error: 'Pas en mode fiduciaire' });
  }

  const newPayload = {
    userId:    user.userId,
    email:     user.email,
    role:      'admin',
    companyId: user.originalCompanyId,
    tenantId:  user.tenantId,
  };

  const token = jwt.sign(newPayload, JWT_SECRET(), { expiresIn: '8h' });

  res.cookie('srh_session', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   8 * 60 * 60 * 1000,
    path:     '/',
  });

  res.json({ ok: true, companyId: user.originalCompanyId, token });
});
