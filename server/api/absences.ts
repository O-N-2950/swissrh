/**
 * SWISSRH — API Absences & Vacances
 * =====================================================================
 * Gestion complète :
 *   - Demandes de vacances avec workflow approbation
 *   - Absences (maladie, accident, maternité, paternité, militaire...)
 *   - Solde vacances (calcul + mise à jour)
 *   - Alertes certificat médical requis
 *   - Pro-rata et décompte de sortie
 * =====================================================================
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import {
  calculateVacationEntitlement,
  getSalaryMaintenanceWeeks,
  calculateApg,
  workingDaysInMonth,
  getHolidaysForCanton,
} from '../utils/swiss-salary-v2.js';

import { sendLeaveDecisionToEmployee } from '../utils/email.js';

export const absencesRouter = Router();

// ─────────────────────────────────────────────────────────────────────────
// ABSENCE REQUESTS — CRUD + Workflow
// ─────────────────────────────────────────────────────────────────────────

// GET /api/absences — Liste absences entreprise
absencesRouter.get('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { employeeId, type, status, year, month } = req.query;

    const rows = await sql`
      SELECT a.*,
        e.first_name, e.last_name, e.department,
        u.first_name as approver_first, u.last_name as approver_last
      FROM absence_requests a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON a.approved_by = u.id
      WHERE a.company_id = ${companyId}
        AND (${employeeId ? sql`a.employee_id = ${Number(employeeId)}` : sql`1=1`})
        AND (${type   ? sql`a.absence_type = ${String(type)}` : sql`1=1`})
        AND (${status ? sql`a.status = ${String(status)}` : sql`1=1`})
        AND (${year   ? sql`EXTRACT(YEAR FROM a.start_date) = ${Number(year)}` : sql`1=1`})
        AND (${month  ? sql`EXTRACT(MONTH FROM a.start_date) = ${Number(month)}` : sql`1=1`})
      ORDER BY a.start_date DESC
      LIMIT 500
    `;
    res.json({ ok: true, absences: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/absences/:id
absencesRouter.get('/:id', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const [row] = await sql`
      SELECT a.*, e.first_name, e.last_name, e.weekly_hours, e.activity_rate,
             e.salary_amount, e.salary_type, e.hire_date, c.canton
      FROM absence_requests a
      JOIN employees e ON a.employee_id = e.id
      JOIN companies c ON a.company_id = c.id
      WHERE a.id = ${req.params.id} AND a.company_id = ${companyId}
    `;
    if (!row) return res.status(404).json({ error: 'Absence introuvable' });
    res.json({ ok: true, absence: row });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/absences — Créer une demande
absencesRouter.post('/', async (req, res) => {
  try {
    const { companyId, userId } = (req as any).user;
    const sql = getSQL();
    const {
      employeeId, absenceType, startDate, endDate,
      startHalf = false, endHalf = false,
      reason, notes, isPaid = true,
    } = req.body;

    if (!employeeId || !absenceType || !startDate || !endDate) {
      return res.status(400).json({ error: 'employeeId, absenceType, startDate, endDate requis' });
    }

    // Récupérer infos employé + canton
    const [emp] = await sql`
      SELECT e.*, c.canton FROM employees e
      JOIN companies c ON e.company_id = c.id
      WHERE e.id = ${employeeId} AND e.company_id = ${companyId}
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    // Calculer jours ouvrables (hors week-ends + fériés)
    const workingDays = await countWorkingDays(sql, companyId, emp.canton, startDate, endDate, startHalf, endHalf);
    const workingHours = workingDays * (emp.weekly_hours / 5);

    // Règles métier par type d'absence
    const rules = getAbsenceRules(absenceType, workingDays);

    // Vérifier solde vacances si type = vacation
    if (absenceType === 'vacation') {
      const year = new Date(startDate).getFullYear();
      const [balance] = await sql`
        SELECT balance_days FROM vacation_balances
        WHERE employee_id = ${employeeId} AND year = ${year}
      `;
      if (!balance) {
        // Calculer et créer le solde
        await initVacationBalance(sql, employeeId, companyId, year, emp);
      } else if (balance.balance_days < workingDays) {
        return res.status(400).json({
          error: `Solde insuffisant: ${balance.balance_days} jour(s) disponible(s), ${workingDays} demandé(s)`,
          balanceDays: balance.balance_days,
          requestedDays: workingDays,
        });
      }
    }

    // Statut initial
    const autoApprove = ['family', 'public_holiday'].includes(absenceType);
    const status = autoApprove ? 'approved' : 'pending';

    const [absence] = await sql`
      INSERT INTO absence_requests (
        employee_id, company_id, absence_type,
        start_date, end_date, start_half, end_half,
        working_days, working_hours,
        status, is_paid, pay_rate, indemnity_source,
        certificate_required, reason, notes, requested_by,
        approved_by, approved_at, employer_obligation_days, waiting_days
      ) VALUES (
        ${employeeId}, ${companyId}, ${absenceType},
        ${startDate}, ${endDate}, ${startHalf}, ${endHalf},
        ${workingDays}, ${workingHours},
        ${status}, ${isPaid}, ${rules.payRate}, ${rules.indemnitySource},
        ${rules.certificateRequired}, ${reason || null}, ${notes || null}, ${userId},
        ${autoApprove ? userId : null}, ${autoApprove ? sql`NOW()` : null},
        ${rules.employerObligationDays}, ${rules.waitingDays}
      )
      RETURNING *
    `;

    // Si auto-approuvé, mettre à jour le solde vacances
    if (autoApprove && absenceType === 'vacation') {
      await updateVacationBalance(sql, employeeId, new Date(startDate).getFullYear(), workingDays, 'take');
    }

    res.json({ ok: true, absence, workingDays, rules });
  } catch (e: any) {
    console.error('[ABSENCES] Create:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/absences/:id/approve — Approuver
absencesRouter.put('/:id/approve', async (req, res) => {
  try {
    const { companyId, userId } = (req as any).user;
    const sql = getSQL();
    const { notes } = req.body;

    const [absence] = await sql`
      UPDATE absence_requests
      SET status = 'approved', approved_by = ${userId}, approved_at = NOW(),
          notes = COALESCE(${notes || null}, notes), updated_at = NOW()
      WHERE id = ${req.params.id} AND company_id = ${companyId} AND status = 'pending'
      RETURNING *
    `;

    if (!absence) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });

    // Mettre à jour solde vacances si approuvé
    if (absence.absence_type === 'vacation') {
      await updateVacationBalance(sql, absence.employee_id,
        new Date(absence.start_date).getFullYear(), absence.working_days, 'take');
    }

    // Email décision → employé (fire-and-forget)
    try {
      const [emp] = await sql`
        SELECT e.email, e.first_name,
               u.first_name as approver_first, u.last_name as approver_last
        FROM employees e
        LEFT JOIN users u ON u.id = ${userId}
        WHERE e.id = ${absence.employee_id}
        LIMIT 1
      `;
      if (emp?.email) {
        sendLeaveDecisionToEmployee({
          employeeEmail:     emp.email,
          employeeFirstName: emp.first_name,
          absenceType:       absence.absence_type,
          startDate:         absence.start_date,
          endDate:           absence.end_date,
          workingDays:       absence.working_days,
          decision:          'approved',
          approverName:      emp.approver_first
            ? `${emp.approver_first} ${emp.approver_last}`
            : undefined,
        }).catch(() => {});
      }
    } catch { /* email non-bloquant */ }

    res.json({ ok: true, absence });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/absences/:id/reject — Rejeter
absencesRouter.put('/:id/reject', async (req, res) => {
  try {
    const { companyId, userId } = (req as any).user;
    const sql = getSQL();
    const { reason } = req.body;

    const [absence] = await sql`
      UPDATE absence_requests
      SET status = 'rejected', approved_by = ${userId}, approved_at = NOW(),
          rejection_reason = ${reason || 'Demande refusée'}, updated_at = NOW()
      WHERE id = ${req.params.id} AND company_id = ${companyId} AND status = 'pending'
      RETURNING *
    `;
    if (!absence) return res.status(404).json({ error: 'Demande introuvable' });

    // Email refus → employé (fire-and-forget)
    try {
      const [emp] = await sql`
        SELECT email, first_name FROM employees
        WHERE id = ${absence.employee_id} LIMIT 1
      `;
      if (emp?.email) {
        sendLeaveDecisionToEmployee({
          employeeEmail:     emp.email,
          employeeFirstName: emp.first_name,
          absenceType:       absence.absence_type,
          startDate:         absence.start_date,
          endDate:           absence.end_date,
          workingDays:       absence.working_days,
          decision:          'rejected',
          rejectionReason:   reason || 'Demande refusée',
        }).catch(() => {});
      }
    } catch { /* email non-bloquant */ }

    res.json({ ok: true, absence });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/absences/:id/cancel — Annuler
absencesRouter.put('/:id/cancel', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();

    const [absence] = await sql`
      UPDATE absence_requests
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${req.params.id} AND company_id = ${companyId}
        AND status IN ('pending', 'approved')
      RETURNING *
    `;
    if (!absence) return res.status(404).json({ error: 'Demande introuvable' });

    // Restituer jours vacances si c'était approuvé
    if (absence.absence_type === 'vacation' && absence.status === 'approved') {
      await updateVacationBalance(sql, absence.employee_id,
        new Date(absence.start_date).getFullYear(), absence.working_days, 'restore');
    }

    res.json({ ok: true, absence });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/absences/:id/certificate — Upload certificat médical
absencesRouter.put('/:id/certificate', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { certificateUrl, certificateDate } = req.body;

    const [absence] = await sql`
      UPDATE absence_requests
      SET certificate_received = true, certificate_url = ${certificateUrl},
          certificate_date = ${certificateDate || null}, updated_at = NOW()
      WHERE id = ${req.params.id} AND company_id = ${companyId}
      RETURNING *
    `;
    res.json({ ok: true, absence });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// VACATION BALANCES
// ─────────────────────────────────────────────────────────────────────────

// GET /api/absences/vacation/balance/:employeeId
absencesRouter.get('/vacation/balance/:employeeId', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    let [balance] = await sql`
      SELECT vb.*, e.first_name, e.last_name, e.vacation_weeks, e.activity_rate, e.hire_date
      FROM vacation_balances vb
      JOIN employees e ON vb.employee_id = e.id
      WHERE vb.employee_id = ${req.params.employeeId}
        AND vb.company_id = ${companyId}
        AND vb.year = ${year}
    `;

    // Si pas encore calculé, le calculer à la volée
    if (!balance) {
      const [emp] = await sql`SELECT * FROM employees WHERE id = ${req.params.employeeId} AND company_id = ${companyId}`;
      if (!emp) return res.status(404).json({ error: 'Employé introuvable' });
      balance = await initVacationBalance(sql, emp.id, companyId, year, emp);
    }

    res.json({ ok: true, balance });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/absences/vacation/balances — Tous les employés
absencesRouter.get('/vacation/balances', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const balances = await sql`
      SELECT vb.*, e.first_name, e.last_name, e.department,
        CASE WHEN vb.balance_days < 0 THEN true ELSE false END as in_deficit,
        CASE WHEN vb.balance_days > vb.max_carry_forward THEN true ELSE false END as over_carry_limit
      FROM vacation_balances vb
      JOIN employees e ON vb.employee_id = e.id
      WHERE vb.company_id = ${companyId} AND vb.year = ${year}
      ORDER BY e.last_name, e.first_name
    `;

    res.json({ ok: true, balances, year });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/absences/vacation/recalculate — Recalculer tous les soldes
absencesRouter.post('/vacation/recalculate', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const year = parseInt(req.body.year) || new Date().getFullYear();

    const employees = await sql`
      SELECT * FROM employees WHERE company_id = ${companyId} AND is_active = true
    `;

    const results = [];
    for (const emp of employees) {
      const bal = await initVacationBalance(sql, emp.id, companyId, year, emp, true);
      results.push({ employeeId: emp.id, name: `${emp.first_name} ${emp.last_name}`, balance: bal });
    }

    res.json({ ok: true, recalculated: results.length, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// ALERTES
// ─────────────────────────────────────────────────────────────────────────

// GET /api/absences/alerts — Alertes: certificats manquants, soldes négatifs, demandes en attente
absencesRouter.get('/alerts/all', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();

    const [pending, missingCerts, negativeBalances, expiringSoon] = await Promise.all([
      // Demandes en attente > 3 jours
      sql`SELECT a.*, e.first_name, e.last_name FROM absence_requests a
          JOIN employees e ON a.employee_id = e.id
          WHERE a.company_id = ${companyId} AND a.status = 'pending'
            AND a.created_at < NOW() - INTERVAL '3 days'
          ORDER BY a.created_at ASC`,

      // Certificats médicaux requis non reçus (absence > 3 jours)
      sql`SELECT a.*, e.first_name, e.last_name FROM absence_requests a
          JOIN employees e ON a.employee_id = e.id
          WHERE a.company_id = ${companyId}
            AND a.certificate_required = true
            AND a.certificate_received = false
            AND a.status = 'approved'
          ORDER BY a.start_date DESC`,

      // Soldes vacances négatifs
      sql`SELECT vb.*, e.first_name, e.last_name FROM vacation_balances vb
          JOIN employees e ON vb.employee_id = e.id
          WHERE vb.company_id = ${companyId}
            AND vb.year = EXTRACT(YEAR FROM NOW())
            AND vb.balance_days < 0
          ORDER BY vb.balance_days ASC`,

      // Soldes > max report (risque entreprise)
      sql`SELECT vb.*, e.first_name, e.last_name FROM vacation_balances vb
          JOIN employees e ON vb.employee_id = e.id
          WHERE vb.company_id = ${companyId}
            AND vb.year = EXTRACT(YEAR FROM NOW())
            AND vb.balance_days > vb.max_carry_forward
          ORDER BY vb.balance_days DESC`,
    ]);

    res.json({
      ok: true,
      alerts: {
        pendingRequests:    pending,
        missingCertificates: missingCerts,
        negativeBalances,
        overCarryLimit:     expiringSoon,
        total: pending.length + missingCerts.length + negativeBalances.length + expiringSoon.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/absences/calendar — Vue calendrier mensuel
absencesRouter.get('/calendar', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    const absences = await sql`
      SELECT a.absence_type, a.start_date, a.end_date, a.status, a.working_days,
             e.first_name, e.last_name, e.department
      FROM absence_requests a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.company_id = ${companyId}
        AND a.status IN ('approved', 'pending')
        AND a.start_date <= (${year}::text || '-' || LPAD(${month}::text,2,'0') || '-31')::date
        AND a.end_date   >= (${year}::text || '-' || LPAD(${month}::text,2,'0') || '-01')::date
      ORDER BY a.start_date
    `;

    res.json({ ok: true, year, month, absences });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// APG — Calcul indemnités
// ─────────────────────────────────────────────────────────────────────────

// POST /api/absences/apg/calculate
absencesRouter.post('/apg/calculate', (req, res) => {
  try {
    const { dailySalary, type, days } = req.body;
    if (!dailySalary || !type || !days) {
      return res.status(400).json({ error: 'dailySalary, type, days requis' });
    }
    const result = calculateApg(dailySalary, type, days);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/absences/maintenance/calculate — Calcul obligation maintien salaire CO 324a
absencesRouter.post('/maintenance/calculate', (req, res) => {
  try {
    const { monthsEmployed } = req.body;
    const weeks = getSalaryMaintenanceWeeks(monthsEmployed);
    res.json({
      ok: true,
      monthsEmployed,
      obligationWeeks: weeks,
      obligationDays: weeks * 5,
      basis: 'Echelle bernoise (CO Art. 324a)',
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// HELPERS PRIVÉS
// ─────────────────────────────────────────────────────────────────────────

async function countWorkingDays(
  sql: any, companyId: number, canton: string,
  startDate: string, endDate: string,
  startHalf: boolean, endHalf: boolean,
): Promise<number> {
  const holidays = await sql`
    SELECT holiday_date FROM public_holidays
    WHERE (canton = ${canton} OR canton = 'CH')
      AND year = ${new Date(startDate).getFullYear()}
      AND is_paid = true
  `;

  const start = new Date(startDate);
  const end   = new Date(endDate);
  let count = 0;

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    if (holidays.some((h: any) => h.holiday_date.slice(0, 10) === iso)) continue;
    count++;
  }

  if (startHalf) count -= 0.5;
  if (endHalf)   count -= 0.5;
  return Math.max(0, count);
}

async function initVacationBalance(
  sql: any, employeeId: number, companyId: number, year: number, emp: any, force = false,
) {
  const entitlement = calculateVacationEntitlement({
    vacationWeeks:     emp.vacation_weeks || 5,
    activityRate:      emp.activity_rate || 100,
    hireDateInYear:    emp.hire_date && new Date(emp.hire_date).getFullYear() === year
                       ? new Date(emp.hire_date) : null,
    endDateInYear:     emp.end_date && new Date(emp.end_date).getFullYear() === year
                       ? new Date(emp.end_date) : null,
    year,
    workingDaysPerWeek: 5,
  });

  // Récupérer les jours déjà pris cette année
  const [taken] = await sql`
    SELECT COALESCE(SUM(working_days), 0)::numeric as total
    FROM absence_requests
    WHERE employee_id = ${employeeId}
      AND absence_type = 'vacation'
      AND status IN ('approved', 'auto_approved')
      AND EXTRACT(YEAR FROM start_date) = ${year}
  `;

  // Report depuis l'année précédente
  const [prev] = await sql`
    SELECT COALESCE(balance_days, 0)::numeric as bal
    FROM vacation_balances WHERE employee_id = ${employeeId} AND year = ${year - 1}
  `;
  const carriedForward = Math.min(
    parseFloat(prev?.bal || '0'),
    5, // max 5 jours reportables
  );

  const takenDays   = parseFloat(taken.total || '0');
  const prorataDays = entitlement.prorataDays;
  const balanceDays = prorataDays + carriedForward - takenDays;

  const data = {
    employee_id:      employeeId,
    company_id:       companyId,
    year,
    entitlement_days: entitlement.fullYearDays,
    entitlement_hours: entitlement.fullYearDays * ((emp.weekly_hours || 42) / 5),
    prorata_factor:   entitlement.proRataFactor,
    prorata_days:     prorataDays,
    carried_forward:  carriedForward,
    taken_days:       takenDays,
    balance_days:     balanceDays,
    balance_hours:    balanceDays * ((emp.weekly_hours || 42) / 5),
    alert_expiry_date: `${year + 1}-03-31`,
    last_calculated_at: new Date(),
  };

  if (force) {
    const [row] = await sql`
      INSERT INTO vacation_balances ${sql(data)}
      ON CONFLICT (employee_id, year) DO UPDATE
      SET ${sql({ ...data, last_calculated_at: new Date() })}
      RETURNING *
    `;
    return row;
  } else {
    const [row] = await sql`
      INSERT INTO vacation_balances ${sql(data)}
      ON CONFLICT (employee_id, year) DO NOTHING
      RETURNING *
    `;
    return row || (await sql`SELECT * FROM vacation_balances WHERE employee_id = ${employeeId} AND year = ${year}`)[0];
  }
}

async function updateVacationBalance(
  sql: any, employeeId: number, year: number, days: number, action: 'take' | 'restore',
) {
  const delta = action === 'take' ? days : -days;
  await sql`
    UPDATE vacation_balances
    SET taken_days  = taken_days + ${action === 'take' ? days : -days},
        balance_days = balance_days - ${delta},
        balance_hours = balance_hours - ${delta * 8.4},
        last_calculated_at = NOW()
    WHERE employee_id = ${employeeId} AND year = ${year}
  `;
}

// Règles métier par type d'absence
function getAbsenceRules(type: string, days: number) {
  const rules: any = {
    payRate: 1.0,
    indemnitySource: 'employer',
    certificateRequired: false,
    waitingDays: 0,
    employerObligationDays: 0,
  };

  switch (type) {
    case 'sick':
      rules.certificateRequired = days > 3; // Certificat requis dès le 3e jour (usage CH)
      rules.indemnitySource = days > 30 ? 'ijm' : 'employer';
      break;
    case 'accident_np':
      rules.indemnitySource = 'laa';
      rules.certificateRequired = true;
      break;
    case 'accident_p':
      rules.indemnitySource = 'laa';
      rules.certificateRequired = true;
      break;
    case 'maternity':
      rules.payRate = 0.80;
      rules.indemnitySource = 'apg';
      rules.certificateRequired = true;
      break;
    case 'paternity':
      rules.payRate = 0.80;
      rules.indemnitySource = 'apg';
      rules.certificateRequired = true;
      break;
    case 'military':
      rules.payRate = 0.80;
      rules.indemnitySource = 'apg';
      rules.certificateRequired = true;
      break;
    case 'unpaid':
      rules.payRate = 0;
      rules.isPaid = false;
      rules.indemnitySource = 'none';
      break;
    case 'family':
      rules.payRate = 1.0;
      rules.indemnitySource = 'employer';
      // CO Art. 329.3: mariage=1j, naissance=3j, décès proche=3j
      break;
    case 'vacation':
      rules.indemnitySource = 'employer';
      break;
  }

  return rules;
}

