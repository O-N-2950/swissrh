/**
 * SWISSRH — Employee Portal API
 * ====================================================
 * Endpoints mobile-first pour les employés :
 *   GET  /api/portal/me          — profil + solde vacances
 *   GET  /api/portal/payslips    — liste bulletins
 *   GET  /api/portal/absences    — mes absences
 *   POST /api/portal/leave       — demande de congé
 * ====================================================
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, type JwtPayload } from '../auth/middleware.js';
import { decrypt, maskAvs } from '../utils/encryption.js';
import { audit, getIp } from '../utils/audit-log.js';
import { sendLeaveRequestToRH } from '../utils/email.js';

export const portalRouter = Router();

// ─────────────────────────────────────────────────────
// GET /api/portal/me — Profil + solde vacances
// ─────────────────────────────────────────────────────
portalRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();

    // Trouver l'employé lié à cet utilisateur
    const [emp] = await sql`
      SELECT e.id, e.first_name, e.last_name, e.email, e.phone,
             e.birthdate, e.hire_date, e.contract_type, e.permit_type,
             e.permit_expiry, e.activity_rate, e.weekly_hours,
             e.salary_type, e.salary_amount, e.department, e.position,
             e.vacation_weeks, e.avs_number, e.address, e.npa, e.city,
             e.is_active, c.name as company_name, c.canton
      FROM employees e
      JOIN companies c ON e.company_id = c.id
      WHERE e.company_id = ${user.companyId}
        AND (
          e.id = ${user.employeeId || 0}
          OR LOWER(e.email) = ${user.email.toLowerCase()}
        )
      LIMIT 1
    `;

    if (!emp) return res.status(404).json({ error: 'Profil employé introuvable' });

    const year = new Date().getFullYear();
    const [balance] = await sql`
      SELECT balance_days, used_days, pending_days
      FROM vacation_balances
      WHERE employee_id = ${emp.id} AND year = ${year}
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'PORTAL_VIEW_PROFILE',
      resourceType: 'employee', resourceId: emp.id,
      ipAddress: getIp(req),
    });

    res.json({
      ok: true,
      employee: {
        ...emp,
        avs_number: maskAvs(decrypt(emp.avs_number)),
      },
      balance: balance || { balance_days: 0, used_days: 0, pending_days: 0 },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/portal/payslips — Mes bulletins
// ─────────────────────────────────────────────────────
portalRouter.get('/payslips', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();

    // Trouver l'employé
    const [emp] = await sql`
      SELECT id FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const payslips = await sql`
      SELECT id, period_year, period_month, gross_salary, net_salary,
             total_deductions, total_cost, activity_rate, created_at
      FROM payslips
      WHERE employee_id = ${emp.id} AND company_id = ${user.companyId}
      ORDER BY period_year DESC, period_month DESC
      LIMIT 36
    `;

    res.json({ ok: true, payslips, employeeId: emp.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/portal/absences — Mes absences
// ─────────────────────────────────────────────────────
portalRouter.get('/absences', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();

    const [emp] = await sql`
      SELECT id FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const absences = await sql`
      SELECT a.id, a.absence_type, a.start_date, a.end_date,
             a.working_days, a.status, a.reason, a.notes, a.created_at,
             u.first_name as approver_first, u.last_name as approver_last
      FROM absence_requests a
      LEFT JOIN users u ON a.approved_by = u.id
      WHERE a.employee_id = ${emp.id} AND a.company_id = ${user.companyId}
      ORDER BY a.start_date DESC
      LIMIT 50
    `;

    res.json({ ok: true, absences, employeeId: emp.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/portal/leave — Soumettre demande de congé
// ─────────────────────────────────────────────────────
portalRouter.post('/leave', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();

    const [emp] = await sql`
      SELECT id, weekly_hours, activity_rate FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const { startDate, endDate, absenceType = 'vacation', reason = '' } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate et endDate requis' });
    }

    // Calcul jours ouvrables simples (lun-ven, sans fériés)
    const start = new Date(startDate);
    const end   = new Date(endDate);
    let workingDays = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }

    const [absence] = await sql`
      INSERT INTO absence_requests (
        company_id, employee_id, absence_type, start_date, end_date,
        working_days, working_hours, status, reason, is_paid, requested_by
      ) VALUES (
        ${user.companyId}, ${emp.id}, ${absenceType}, ${startDate}, ${endDate},
        ${workingDays}, ${workingDays * (emp.weekly_hours / 5)},
        'pending', ${reason}, true, ${user.userId}
      )
      RETURNING id, absence_type, start_date, end_date, working_days, status
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'PORTAL_LEAVE_REQUEST',
      resourceType: 'absence', resourceId: absence.id,
      details: `${absenceType} ${startDate}→${endDate} (${workingDays}j)`,
      ipAddress: getIp(req),
    });

    // Email notification → RH (fire-and-forget)
    try {
      const [rhUser] = await sql`
        SELECT u.email, u.first_name, u.last_name, c.name as company_name
        FROM users u
        JOIN companies c ON c.id = ${user.companyId}
        WHERE u.company_id = ${user.companyId}
          AND u.role IN ('admin', 'rh_manager')
          AND u.is_active = true
        ORDER BY CASE u.role WHEN 'admin' THEN 1 ELSE 2 END
        LIMIT 1
      `;
      const [empData] = await sql`
        SELECT first_name, last_name, email FROM employees
        WHERE id = ${emp.id} LIMIT 1
      `;
      if (rhUser?.email && empData) {
        sendLeaveRequestToRH({
          rhEmail:            rhUser.email,
          rhName:             rhUser.first_name,
          employeeFirstName:  empData.first_name,
          employeeLastName:   empData.last_name,
          employeeEmail:      empData.email || user.email,
          absenceType,
          startDate,
          endDate,
          workingDays,
          reason:             reason || undefined,
          absenceId:          absence.id,
          companyName:        rhUser.company_name,
        }).catch(() => {});
      }
    } catch { /* email non-bloquant */ }

    res.json({ ok: true, absence });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/portal/balances/:year — Solde vacances
// ─────────────────────────────────────────────────────
portalRouter.get('/balance/:year', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();
    const year = parseInt(req.params.year);

    const [emp] = await sql`
      SELECT id, vacation_weeks, hire_date FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const [balance] = await sql`
      SELECT balance_days, used_days, pending_days, entitled_days
      FROM vacation_balances
      WHERE employee_id = ${emp.id} AND year = ${year}
    `;

    res.json({ ok: true, balance: balance || null, vacationWeeks: emp.vacation_weeks });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// ─────────────────────────────────────────────────────
// GET /api/portal/shifts — Mes shifts (semaine en cours)
// ─────────────────────────────────────────────────────
portalRouter.get('/shifts', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();
    const [emp] = await sql`
      SELECT id FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const from = req.query.from as string || new Date().toISOString().slice(0,10);
    const d = new Date(from);
    d.setDate(d.getDate() - (d.getDay()||7) + 1);
    const monday = d.toISOString().slice(0,10);
    const sunday = new Date(d.getTime() + 6*86400000).toISOString().slice(0,10);

    const shifts = await sql`
      SELECT id, shift_date, start_time, end_time, break_minutes, role_label, status, notes
      FROM shifts
      WHERE employee_id = ${emp.id} AND company_id = ${user.companyId}
        AND shift_date BETWEEN ${monday} AND ${sunday}
      ORDER BY shift_date, start_time
    `;
    res.json({ ok: true, shifts, week: { monday, sunday } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────
// GET /api/portal/onboarding — Mes tâches d'onboarding
// ─────────────────────────────────────────────────────
portalRouter.get('/onboarding', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();
    const [emp] = await sql`
      SELECT id FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.json({ ok: true, tasks: [], progress: 0 });

    const tasks = await sql`
      SELECT id, title, description, due_date, category, status, completed_at
      FROM onboarding_tasks
      WHERE employee_id = ${emp.id} AND company_id = ${user.companyId}
      ORDER BY due_date NULLS LAST, category
    `;
    const done  = tasks.filter((t: any) => t.status === 'done').length;
    const total = tasks.length;
    res.json({ ok: true, tasks, progress: total > 0 ? Math.round(done/total*100) : 100, done, total });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────
// GET /api/portal/expenses — Mes notes de frais
// ─────────────────────────────────────────────────────
portalRouter.get('/expenses', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();
    const [emp] = await sql`
      SELECT id FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.json({ ok: true, reports: [] });

    const reports = await sql`
      SELECT r.*, COUNT(i.id)::int as items_count
      FROM expense_reports r
      LEFT JOIN expense_items i ON i.report_id = r.id
      WHERE r.employee_id = ${emp.id} AND r.company_id = ${user.companyId}
      GROUP BY r.id
      ORDER BY r.created_at DESC LIMIT 24
    `;
    const totalPending = reports
      .filter((r: any) => ['submitted','approved'].includes(r.status))
      .reduce((s: number, r: any) => s + Number(r.total_amount||0), 0);
    res.json({ ok: true, reports, totalPending, employeeId: emp.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────
// GET /api/portal/documents — Mes documents RH
// Liste bulletins + lohnausweis téléchargeables
// ─────────────────────────────────────────────────────
portalRouter.get('/documents', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const sql  = getSQL();
    const [emp] = await sql`
      SELECT id, first_name, last_name FROM employees
      WHERE company_id = ${user.companyId}
        AND (id = ${user.employeeId || 0} OR LOWER(email) = ${user.email.toLowerCase()})
      LIMIT 1
    `;
    if (!emp) return res.json({ ok: true, documents: [] });

    // Bulletins de salaire disponibles
    const payslips = await sql`
      SELECT id, period_year, period_month, gross_salary, net_salary, created_at
      FROM payslips
      WHERE employee_id = ${emp.id} AND company_id = ${user.companyId}
      ORDER BY period_year DESC, period_month DESC LIMIT 36
    `;

    // Lohnausweis par année
    const lohnausweis = await sql`
      SELECT DISTINCT period_year,
        COUNT(*)::int as months_count,
        SUM(gross_salary)::numeric as annual_gross
      FROM payslips
      WHERE employee_id = ${emp.id} AND company_id = ${user.companyId}
      GROUP BY period_year
      ORDER BY period_year DESC
    `;

    res.json({
      ok: true,
      employeeId: emp.id,
      payslips: payslips.map((p: any) => ({
        ...p,
        type: 'payslip',
        label: `Bulletin ${p.period_year}-${String(p.period_month).padStart(2,'0')}`,
        url:   `/api/salary/payslip/${p.id}/pdf`,
      })),
      lohnausweis: lohnausweis.map((l: any) => ({
        ...l,
        type: 'lohnausweis',
        label: `Certificat de salaire ${l.period_year}`,
        url:   `/api/salary/lohnausweis/${emp.id}/${l.period_year}/pdf`,
      })),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
