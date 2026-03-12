/**
 * SWISSRH — Planning shifts
 * GET    /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD
 * POST   /api/shifts                — créer un shift
 * PUT    /api/shifts/:id            — modifier
 * DELETE /api/shifts/:id            — supprimer
 * POST   /api/shifts/bulk           — créer plusieurs shifts d'un coup
 * GET    /api/shifts/week?date=YYYY-MM-DD — vue semaine par employé
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager, type JwtPayload } from '../auth/middleware.js';

export const shiftsRouter = Router();

// GET /api/shifts?from=&to=
shiftsRouter.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { from, to, employeeId } = req.query;
  const dateFrom = String(from || new Date().toISOString().slice(0,10));
  const dateTo   = String(to   || new Date(Date.now() + 7*86400000).toISOString().slice(0,10));

  try {
    const shifts = await sql`
      SELECT s.*, e.first_name, e.last_name, e.department, e.position
      FROM shifts s
      JOIN employees e ON s.employee_id = e.id
      WHERE s.company_id = ${user.companyId}
        AND s.shift_date BETWEEN ${dateFrom} AND ${dateTo}
        ${employeeId ? sql`AND s.employee_id = ${Number(employeeId)}` : sql``}
      ORDER BY s.shift_date, s.start_time, e.last_name
    `;
    res.json({ ok: true, shifts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/shifts/week?date=YYYY-MM-DD
shiftsRouter.get('/week', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const refDate = req.query.date ? new Date(String(req.query.date)) : new Date();
  // Lundi de la semaine
  const day = refDate.getDay() || 7;
  refDate.setDate(refDate.getDate() - day + 1);
  const monday = refDate.toISOString().slice(0,10);
  const sunday = new Date(refDate.getTime() + 6*86400000).toISOString().slice(0,10);

  try {
    const [employees, shifts] = await Promise.all([
      sql`SELECT id, first_name, last_name, department FROM employees
          WHERE company_id = ${user.companyId} AND is_active = true ORDER BY last_name`,
      sql`SELECT s.*, e.first_name, e.last_name FROM shifts s
          JOIN employees e ON s.employee_id = e.id
          WHERE s.company_id = ${user.companyId}
            AND s.shift_date BETWEEN ${monday} AND ${sunday}
          ORDER BY s.shift_date, s.start_time`,
    ]);
    res.json({ ok: true, week: { monday, sunday }, employees, shifts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/shifts
shiftsRouter.post('/', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { employee_id, shift_date, start_time, end_time, break_minutes, role_label, notes } = req.body;
  if (!employee_id || !shift_date || !start_time || !end_time)
    return res.status(400).json({ error: 'employee_id, shift_date, start_time, end_time requis' });

  try {
    const [shift] = await sql`
      INSERT INTO shifts (company_id, employee_id, shift_date, start_time, end_time,
                          break_minutes, role_label, notes, created_by)
      VALUES (${user.companyId}, ${employee_id}, ${shift_date}, ${start_time}, ${end_time},
              ${break_minutes||30}, ${role_label||null}, ${notes||null}, ${user.userId})
      RETURNING *
    `;
    res.json({ ok: true, shift });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/shifts/bulk
shiftsRouter.post('/bulk', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { shifts }: { shifts: any[] } = req.body;
  if (!Array.isArray(shifts) || shifts.length === 0)
    return res.status(400).json({ error: 'shifts[] requis' });

  try {
    const inserted = [];
    for (const s of shifts) {
      const [row] = await sql`
        INSERT INTO shifts (company_id, employee_id, shift_date, start_time, end_time,
                            break_minutes, role_label, notes, created_by)
        VALUES (${user.companyId}, ${s.employee_id}, ${s.shift_date}, ${s.start_time}, ${s.end_time},
                ${s.break_minutes||30}, ${s.role_label||null}, ${s.notes||null}, ${user.userId})
        RETURNING id
      `;
      inserted.push(row.id);
    }
    res.json({ ok: true, inserted: inserted.length, ids: inserted });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/shifts/:id
shiftsRouter.put('/:id', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { start_time, end_time, break_minutes, role_label, notes, status } = req.body;

  try {
    const [shift] = await sql`
      UPDATE shifts SET
        start_time    = COALESCE(${start_time||null}, start_time),
        end_time      = COALESCE(${end_time||null}, end_time),
        break_minutes = COALESCE(${break_minutes??null}, break_minutes),
        role_label    = COALESCE(${role_label||null}, role_label),
        notes         = COALESCE(${notes||null}, notes),
        status        = COALESCE(${status||null}, status),
        updated_at    = NOW()
      WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId}
      RETURNING *
    `;
    if (!shift) return res.status(404).json({ error: 'Shift introuvable' });
    res.json({ ok: true, shift });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shifts/:id
shiftsRouter.delete('/:id', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    await sql`DELETE FROM shifts WHERE id = ${Number(req.params.id)} AND company_id = ${user.companyId}`;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
