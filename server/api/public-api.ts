/**
 * SWISSRH — API Publique v1
 * ============================================================
 * Endpoints REST documentés pour intégrations tierces.
 * Authentification : Bearer API Key (header X-API-Key)
 *
 * GET  /api/v1/status                  — sanity check
 * GET  /api/v1/employees               — liste employés actifs
 * GET  /api/v1/employees/:id           — détail employé
 * GET  /api/v1/payslips?year=&month=   — bulletins
 * GET  /api/v1/payslips/:id            — bulletin détaillé
 * POST /api/v1/payslips                — créer bulletin (import)
 * GET  /api/v1/absences?from=&to=      — absences
 * GET  /api/v1/shifts?from=&to=        — shifts
 * GET  /api/v1/reports/summary?year=   — résumé annuel
 *
 * Gestion clés API :
 * GET  /api/v1/keys                    — lister clés (admin)
 * POST /api/v1/keys                    — créer clé
 * DELETE /api/v1/keys/:id              — révoquer
 * ============================================================
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getSQL } from '../db/pool.js';
import crypto from 'crypto';

export const publicApiRouter = Router();

// ── Rate limiter simple in-memory ───────────────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = Number(process.env.SWISSRH_API_RATE_LIMIT || 100); // req/heure

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key  = req.headers['x-api-key'] as string || req.ip || 'anon';
  const now  = Date.now();
  const hour = Math.floor(now / 3600000);
  const mapKey = `${key}:${hour}`;
  const entry  = rateLimitMap.get(mapKey) || { count: 0, reset: (hour + 1) * 3600000 };
  entry.count++;
  rateLimitMap.set(mapKey, entry);

  res.setHeader('X-RateLimit-Limit',     String(RATE_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT - entry.count)));
  res.setHeader('X-RateLimit-Reset',     String(Math.floor(entry.reset / 1000)));

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: `Limite ${RATE_LIMIT} requêtes/heure atteinte`,
      retry_after: Math.ceil((entry.reset - now) / 1000),
    });
  }
  next();
}

// ── Auth middleware API key ─────────────────────────────────
async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({
      error: 'missing_api_key',
      message: 'Header X-API-Key requis. Créez une clé sur /settings → API.',
    });
  }
  const sql = getSQL();
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  try {
    const [keyRow] = await sql`
      SELECT k.*, c.name as company_name
      FROM api_keys k JOIN companies c ON c.id = k.company_id
      WHERE k.key_hash = ${keyHash} AND k.is_active = true
        AND (k.expires_at IS NULL OR k.expires_at > NOW())
    `;
    if (!keyRow) {
      return res.status(401).json({ error: 'invalid_api_key', message: 'Clé API invalide ou expirée' });
    }
    // Update last_used
    await sql`UPDATE api_keys SET last_used = NOW(), request_count = request_count + 1 WHERE id = ${keyRow.id}`;
    (req as any).apiContext = { companyId: keyRow.company_id, keyId: keyRow.id, keyName: keyRow.name };
    next();
  } catch (e: any) {
    res.status(500).json({ error: 'server_error', message: e.message });
  }
}

// Apply rate limit + auth to all /api/v1/* except status
publicApiRouter.use(rateLimit);
publicApiRouter.use((req, res, next) => {
  if (req.path === '/status') return next();
  apiKeyAuth(req, res, next);
});

// Helper
const ctx = (req: Request) => (req as any).apiContext as { companyId: number; keyId: number };

// ── GET /api/v1/status ──────────────────────────────────────
publicApiRouter.get('/status', (_req, res) => {
  res.json({
    ok: true,
    service:  'SwissRH API',
    version:  process.env.SWISSRH_API_VERSION || 'v1',
    ts:       new Date().toISOString(),
    docs:     'https://swissrh.ch/api-docs',
  });
});

// ── GET /api/v1/employees ───────────────────────────────────
publicApiRouter.get('/employees', async (req, res) => {
  const sql = getSQL();
  const { companyId } = ctx(req);
  const { department, active = 'true' } = req.query;
  try {
    const employees = await sql`
      SELECT id, first_name, last_name, email, department, position,
             contract_type, activity_rate, weekly_hours, hire_date,
             salary_type, is_active, created_at
      FROM employees
      WHERE company_id = ${companyId}
        ${active !== 'all' ? sql`AND is_active = ${active === 'true'}` : sql``}
        ${department ? sql`AND department = ${String(department)}` : sql``}
      ORDER BY last_name, first_name
    `;
    res.json({ ok: true, count: employees.length, data: employees });
  } catch (e: any) { res.status(500).json({ error: 'server_error', message: e.message }); }
});

// ── GET /api/v1/employees/:id ───────────────────────────────
publicApiRouter.get('/employees/:id', async (req, res) => {
  const sql = getSQL();
  const { companyId } = ctx(req);
  try {
    const [emp] = await sql`
      SELECT id, first_name, last_name, email, phone, department, position,
             contract_type, activity_rate, weekly_hours, hire_date,
             salary_type, salary_amount, vacation_weeks, is_active
      FROM employees
      WHERE id = ${Number(req.params.id)} AND company_id = ${companyId}
    `;
    if (!emp) return res.status(404).json({ error: 'not_found', message: 'Employé introuvable' });
    res.json({ ok: true, data: emp });
  } catch (e: any) { res.status(500).json({ error: 'server_error', message: e.message }); }
});

// ── GET /api/v1/payslips ────────────────────────────────────
publicApiRouter.get('/payslips', async (req, res) => {
  const sql = getSQL();
  const { companyId } = ctx(req);
  const { year, month, employee_id } = req.query;
  try {
    const payslips = await sql`
      SELECT p.id, p.employee_id, e.first_name, e.last_name,
             p.period_year, p.period_month,
             p.gross_salary, p.net_salary, p.total_deductions,
             p.avs_employee, p.ac_employee, p.lpp_employee,
             p.total_employer, p.activity_rate, p.created_at
      FROM payslips p JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${companyId}
        ${year        ? sql`AND p.period_year  = ${Number(year)}`         : sql``}
        ${month       ? sql`AND p.period_month = ${Number(month)}`        : sql``}
        ${employee_id ? sql`AND p.employee_id  = ${Number(employee_id)}`  : sql``}
      ORDER BY p.period_year DESC, p.period_month DESC, e.last_name
      LIMIT 500
    `;
    const totals = {
      gross:    payslips.reduce((s: number, p: any) => s + Number(p.gross_salary), 0),
      net:      payslips.reduce((s: number, p: any) => s + Number(p.net_salary),   0),
      employer: payslips.reduce((s: number, p: any) => s + Number(p.total_employer||0), 0),
    };
    res.json({ ok: true, count: payslips.length, totals, data: payslips });
  } catch (e: any) { res.status(500).json({ error: 'server_error', message: e.message }); }
});

// ── GET /api/v1/payslips/:id ────────────────────────────────
publicApiRouter.get('/payslips/:id', async (req, res) => {
  const sql = getSQL();
  const { companyId } = ctx(req);
  try {
    const [p] = await sql`
      SELECT p.*, e.first_name, e.last_name, e.department
      FROM payslips p JOIN employees e ON p.employee_id = e.id
      WHERE p.id = ${Number(req.params.id)} AND p.company_id = ${companyId}
    `;
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true, data: p });
  } catch (e: any) { res.status(500).json({ error: 'server_error', message: e.message }); }
});

// ── GET /api/v1/absences ────────────────────────────────────
publicApiRouter.get('/absences', async (req, res) => {
  const sql = getSQL();
  const { companyId } = ctx(req);
  const { from, to, status, employee_id } = req.query;
  const dateFrom = String(from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10));
  const dateTo   = String(to   || new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0,10));
  try {
    const absences = await sql`
      SELECT a.id, a.employee_id, e.first_name, e.last_name,
             a.absence_type, a.start_date, a.end_date, a.working_days,
             a.status, a.reason, a.created_at
      FROM absence_requests a JOIN employees e ON a.employee_id = e.id
      WHERE a.company_id = ${companyId}
        AND a.start_date BETWEEN ${dateFrom} AND ${dateTo}
        ${status      ? sql`AND a.status      = ${String(status)}`          : sql``}
        ${employee_id ? sql`AND a.employee_id = ${Number(employee_id)}`     : sql``}
      ORDER BY a.start_date DESC
      LIMIT 1000
    `;
    res.json({ ok: true, count: absences.length, data: absences });
  } catch (e: any) { res.status(500).json({ error: 'server_error', message: e.message }); }
});

// ── GET /api/v1/shifts ──────────────────────────────────────
publicApiRouter.get('/shifts', async (req, res) => {
  const sql = getSQL();
  const { companyId } = ctx(req);
  const { from, to, employee_id } = req.query;
  const dateFrom = String(from || new Date().toISOString().slice(0,10));
  const dateTo   = String(to   || new Date(Date.now() + 7*86400000).toISOString().slice(0,10));
  try {
    const shifts = await sql`
      SELECT s.id, s.employee_id, e.first_name, e.last_name,
             s.shift_date, s.start_time, s.end_time, s.break_minutes,
             s.role_label, s.status
      FROM shifts s JOIN employees e ON s.employee_id = e.id
      WHERE s.company_id = ${companyId}
        AND s.shift_date BETWEEN ${dateFrom} AND ${dateTo}
        ${employee_id ? sql`AND s.employee_id = ${Number(employee_id)}` : sql``}
      ORDER BY s.shift_date, s.start_time
      LIMIT 1000
    `;
    res.json({ ok: true, count: shifts.length, data: shifts });
  } catch (e: any) { res.status(500).json({ error: 'server_error', message: e.message }); }
});

// ── GET /api/v1/reports/summary?year= ──────────────────────
publicApiRouter.get('/reports/summary', async (req, res) => {
  const sql = getSQL();
  const { companyId } = ctx(req);
  const year = Number(req.query.year || new Date().getFullYear());
  try {
    const [summary] = await sql`
      SELECT
        COUNT(DISTINCT p.employee_id)::int             AS employee_count,
        COUNT(p.id)::int                               AS payslip_count,
        SUM(p.gross_salary)::numeric                   AS total_gross,
        SUM(p.net_salary)::numeric                     AS total_net,
        SUM(p.total_employer)::numeric                 AS total_employer_cost,
        SUM(p.avs_employee+p.avs_employer)::numeric    AS total_avs,
        SUM(p.lpp_employee+p.lpp_employer)::numeric    AS total_lpp,
        AVG(p.gross_salary)::numeric                   AS avg_gross
      FROM payslips p
      WHERE p.company_id = ${companyId} AND p.period_year = ${year}
    `;
    const monthly = await sql`
      SELECT period_month,
        COUNT(*)::int AS count,
        SUM(gross_salary)::numeric AS gross,
        SUM(net_salary)::numeric AS net
      FROM payslips
      WHERE company_id = ${companyId} AND period_year = ${year}
      GROUP BY period_month ORDER BY period_month
    `;
    res.json({ ok: true, year, summary, monthly });
  } catch (e: any) { res.status(500).json({ error: 'server_error', message: e.message }); }
});

// ════════════════════════════════════════════════════════════
// GESTION DES CLÉS API
// ════════════════════════════════════════════════════════════
// Ces endpoints utilisent l'auth JWT standard (pas X-API-Key)
import { requireAdmin, type JwtPayload } from '../auth/middleware.js';

export const apiKeysRouter = Router();

// GET /api/keys — lister clés
apiKeysRouter.get('/', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  try {
    const keys = await sql`
      SELECT id, name, key_prefix, scopes, is_active,
             last_used, request_count, expires_at, created_at
      FROM api_keys
      WHERE company_id = ${user.companyId}
      ORDER BY created_at DESC
    `;
    res.json({ ok: true, keys });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/keys — créer clé
apiKeysRouter.post('/', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const { name, scopes = ['read'], expires_days } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });

  try {
    // Générer clé sécurisée: srh_live_<32 bytes hex>
    const rawKey   = `srh_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash  = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix   = rawKey.slice(0, 14); // "srh_live_xxxx"
    const expiresAt = expires_days
      ? new Date(Date.now() + Number(expires_days) * 86400000).toISOString()
      : null;

    const [key] = await sql`
      INSERT INTO api_keys (company_id, name, key_hash, key_prefix, scopes, expires_at, created_by)
      VALUES (${user.companyId}, ${name}, ${keyHash}, ${prefix},
              ${JSON.stringify(scopes)}, ${expiresAt}, ${user.userId})
      RETURNING id, name, key_prefix, scopes, expires_at, created_at
    `;

    // Retourner la clé EN CLAIR une seule fois
    res.json({
      ok: true,
      key: { ...key, api_key: rawKey },
      warning: '⚠️ Conservez cette clé — elle ne sera plus affichée',
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/keys/:id — révoquer
apiKeysRouter.delete('/:id', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  try {
    await sql`
      UPDATE api_keys SET is_active = false
      WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId}
    `;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
