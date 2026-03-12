/**
 * SWISSRH — Notes de frais
 * GET  /api/expenses                          — liste rapports (RH)
 * POST /api/expenses                          — créer un rapport
 * GET  /api/expenses/:id                      — détail + items
 * POST /api/expenses/:id/items                — ajouter un item
 * DELETE /api/expenses/:id/items/:itemId      — supprimer item
 * PUT  /api/expenses/:id/submit               — soumettre pour approbation
 * PUT  /api/expenses/:id/approve              — approuver (manager)
 * PUT  /api/expenses/:id/reject               — refuser (manager)
 * GET  /api/expenses/my                       — mes propres frais (employé)
 * GET  /api/exports/expenses.csv?year=&month= — export CSV
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager, type JwtPayload } from '../auth/middleware.js';

export const expensesRouter = Router();

const KM_RATE = 0.70; // CHF/km (barème fiscal suisse 2025)

// GET /api/expenses — liste RH
expensesRouter.get('/', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { year, month, status } = req.query;

  try {
    const reports = await sql`
      SELECT r.*, e.first_name, e.last_name,
             COUNT(i.id)::int as items_count
      FROM expense_reports r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN expense_items i ON i.report_id = r.id
      WHERE r.company_id = ${user.companyId}
        ${year  ? sql`AND r.period_year  = ${Number(year)}`  : sql``}
        ${month ? sql`AND r.period_month = ${Number(month)}` : sql``}
        ${status ? sql`AND r.status = ${String(status)}` : sql``}
      GROUP BY r.id, e.first_name, e.last_name
      ORDER BY r.created_at DESC
    `;
    const totalPending = reports.filter((r: any) => r.status === 'submitted')
      .reduce((s: number, r: any) => s + Number(r.total_amount||0), 0);
    res.json({ ok: true, reports, totalPending });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/expenses/my — portal employé
expensesRouter.get('/my', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    // Pour les employés qui ont un employee_id dans leur JWT
    // sinon on cherche par email
    const [emp] = await sql`
      SELECT id FROM employees WHERE company_id = ${user.companyId}
        AND email = ${user.email} LIMIT 1
    `;
    if (!emp) return res.json({ ok: true, reports: [] });

    const reports = await sql`
      SELECT r.*, COUNT(i.id)::int as items_count
      FROM expense_reports r
      LEFT JOIN expense_items i ON i.report_id = r.id
      WHERE r.employee_id = ${emp.id} AND r.company_id = ${user.companyId}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    res.json({ ok: true, reports });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/expenses
expensesRouter.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { employee_id, title, period_year, period_month } = req.body;
  const empId = employee_id || user.employeeId;
  if (!empId || !title) return res.status(400).json({ error: 'employee_id et title requis' });

  try {
    const y = period_year  || new Date().getFullYear();
    const m = period_month || new Date().getMonth() + 1;
    const [report] = await sql`
      INSERT INTO expense_reports (company_id, employee_id, title, period_year, period_month)
      VALUES (${user.companyId}, ${empId}, ${title}, ${y}, ${m})
      RETURNING *
    `;
    res.json({ ok: true, report });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/expenses/:id
expensesRouter.get('/:id', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    const [report] = await sql`
      SELECT r.*, e.first_name, e.last_name
      FROM expense_reports r JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ${Number(req.params.id)} AND r.company_id = ${user.companyId}
    `;
    if (!report) return res.status(404).json({ error: 'Rapport introuvable' });
    const items = await sql`
      SELECT * FROM expense_items WHERE report_id = ${report.id} ORDER BY expense_date, id
    `;
    res.json({ ok: true, report, items });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/expenses/:id/items
expensesRouter.post('/:id/items', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { expense_date, category, description, amount, vat_rate, km_distance } = req.body;
  if (!expense_date || !category || !description)
    return res.status(400).json({ error: 'expense_date, category, description requis' });

  try {
    const [report] = await sql`
      SELECT id, status FROM expense_reports
      WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId}
    `;
    if (!report) return res.status(404).json({ error: 'Rapport introuvable' });
    if (report.status !== 'draft') return res.status(400).json({ error: 'Rapport déjà soumis' });

    // Calcul montant km auto
    let finalAmount = Number(amount || 0);
    if (category === 'km' && km_distance) {
      finalAmount = Number(km_distance) * KM_RATE;
    }
    const vatRate   = Number(vat_rate || 0);
    const vatAmount = finalAmount * vatRate;

    const [item] = await sql`
      INSERT INTO expense_items
        (report_id, company_id, expense_date, category, description, amount, vat_rate, vat_amount, km_distance)
      VALUES (${report.id}, ${user.companyId}, ${expense_date}, ${category},
              ${description}, ${finalAmount}, ${vatRate}, ${vatAmount}, ${km_distance||null})
      RETURNING *
    `;

    // Recalcul total rapport
    await sql`
      UPDATE expense_reports SET
        total_amount = (SELECT COALESCE(SUM(amount),0) FROM expense_items WHERE report_id = ${report.id}),
        updated_at = NOW()
      WHERE id = ${report.id}
    `;

    res.json({ ok: true, item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/expenses/:id/items/:itemId
expensesRouter.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    await sql`DELETE FROM expense_items WHERE id = ${Number(req.params.itemId)} AND company_id = ${user.companyId}`;
    await sql`
      UPDATE expense_reports SET
        total_amount = (SELECT COALESCE(SUM(amount),0) FROM expense_items WHERE report_id = ${Number(req.params.id)}),
        updated_at = NOW()
      WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId}
    `;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/expenses/:id/submit
expensesRouter.put('/:id/submit', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    const [r] = await sql`
      UPDATE expense_reports SET status = 'submitted', updated_at = NOW()
      WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId} AND status = 'draft'
      RETURNING *
    `;
    if (!r) return res.status(400).json({ error: 'Impossible de soumettre' });
    res.json({ ok: true, report: r });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/expenses/:id/approve
expensesRouter.put('/:id/approve', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    const [r] = await sql`
      UPDATE expense_reports SET status = 'approved', approved_by = ${user.userId}, approved_at = NOW(), updated_at = NOW()
      WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId} AND status = 'submitted'
      RETURNING *
    `;
    if (!r) return res.status(400).json({ error: 'Impossible d\'approuver' });
    res.json({ ok: true, report: r });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/expenses/:id/reject
expensesRouter.put('/:id/reject', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { reason } = req.body;
  try {
    const [r] = await sql`
      UPDATE expense_reports SET
        status = 'rejected', notes = ${reason||null}, updated_at = NOW()
      WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId} AND status = 'submitted'
      RETURNING *
    `;
    if (!r) return res.status(400).json({ error: 'Impossible de refuser' });
    res.json({ ok: true, report: r });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
