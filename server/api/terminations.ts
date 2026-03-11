/**
 * SWISSRH — API Licenciements & Suspension CO 336c
 * =====================================================================
 * Routes :
 *   POST /api/terminations/calculate        — Calcul pur (sans DB)
 *   POST /api/terminations                  — Enregistrer un licenciement
 *   GET  /api/terminations                  — Liste des licenciements entreprise
 *   GET  /api/terminations/:id              — Détail
 *   POST /api/terminations/:id/sick-leaves  — Ajouter un arrêt maladie
 *   PUT  /api/terminations/:id/sick-leaves/:slId — Mettre à jour un arrêt
 *   DELETE /api/terminations/:id/sick-leaves/:slId
 *   GET  /api/terminations/:id/recalculate  — Recalculer après modif
 *   GET  /api/terminations/alerts           — Tous les cas actifs avec alertes
 * =====================================================================
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import {
  calculateTermination,
  terminationSummaryText,
  type TerminationInput,
} from '../utils/termination-co336c.js';

export const terminationsRouter = Router();

// ─── Helper : charger un licenciement avec ses arrêts ────────────────────
async function loadTerminationWithLeaves(sql: any, id: number, companyId: number) {
  const [term] = await sql`
    SELECT t.*, e.first_name, e.last_name, e.hire_date,
           e.department, e.salary_amount
    FROM terminations t
    JOIN employees e ON t.employee_id = e.id
    WHERE t.id = ${id} AND t.company_id = ${companyId}
  `;
  if (!term) return null;

  const leaves = await sql`
    SELECT * FROM termination_sick_leaves
    WHERE termination_id = ${id}
    ORDER BY start_date ASC
  `;

  return { ...term, sickLeaves: leaves };
}

// ─── Recalculer et persister ──────────────────────────────────────────────
async function recalculate(sql: any, terminationId: number, companyId: number) {
  const data = await loadTerminationWithLeaves(sql, terminationId, companyId);
  if (!data) throw new Error('Licenciement introuvable');

  const input: TerminationInput = {
    hireDate:         new Date(data.hire_date),
    dismissalDate:    new Date(data.dismissal_date),
    endOfMonthNotice: data.end_of_month_notice,
    sickLeaves: data.sickLeaves.map((l: any) => ({
      startDate: new Date(l.start_date),
      endDate:   new Date(l.end_date),
    })),
  };

  const result = calculateTermination(input);

  await sql`
    UPDATE terminations SET
      months_employed        = ${result.monthsEmployed},
      notice_period_months   = ${result.noticePeriodMonths},
      initial_end_date       = ${result.initialEndDate.toISOString().slice(0, 10)},
      effective_end_date     = ${result.effectiveEndDate.toISOString().slice(0, 10)},
      extended_by_days       = ${result.extendedByDays},
      max_suspension_days    = ${result.maxSuspensionDays},
      total_suspended_days   = ${result.totalSuspendedDays},
      ijm_end_date           = ${result.ijmEndDate ? result.ijmEndDate.toISOString().slice(0, 10) : null},
      alerts                 = ${JSON.stringify(result.alerts)},
      legal_basis            = ${JSON.stringify(result.legalBasis)},
      suspensions_detail     = ${JSON.stringify(result.suspensions)},
      summary_text           = ${terminationSummaryText(result)},
      updated_at             = NOW()
    WHERE id = ${terminationId}
  `;

  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/terminations/calculate — Calcul sans persistance
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.post('/calculate', (req, res) => {
  try {
    const { hireDate, dismissalDate, endOfMonthNotice = true, sickLeaves = [] } = req.body;

    if (!hireDate || !dismissalDate) {
      return res.status(400).json({ error: 'hireDate et dismissalDate requis' });
    }

    const result = calculateTermination({
      hireDate:         new Date(hireDate),
      dismissalDate:    new Date(dismissalDate),
      endOfMonthNotice: Boolean(endOfMonthNotice),
      sickLeaves:       sickLeaves.map((l: any) => ({
        startDate: new Date(l.startDate),
        endDate:   new Date(l.endDate),
      })),
    });

    res.json({
      ok: true,
      result,
      summary: terminationSummaryText(result),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/terminations — Enregistrer un licenciement
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.post('/', async (req, res) => {
  try {
    const { companyId, userId } = (req as any).user;
    const sql = getSQL();
    const {
      employeeId,
      dismissalDate,
      endOfMonthNotice = true,
      reason,
      notes,
    } = req.body;

    if (!employeeId || !dismissalDate) {
      return res.status(400).json({ error: 'employeeId et dismissalDate requis' });
    }

    // Récupérer hireDate de l'employé
    const [emp] = await sql`
      SELECT id, hire_date, first_name, last_name
      FROM employees
      WHERE id = ${employeeId} AND company_id = ${companyId}
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const result = calculateTermination({
      hireDate:         new Date(emp.hire_date),
      dismissalDate:    new Date(dismissalDate),
      endOfMonthNotice: Boolean(endOfMonthNotice),
      sickLeaves:       [],
    });

    const [term] = await sql`
      INSERT INTO terminations (
        employee_id, company_id, created_by,
        dismissal_date, end_of_month_notice, reason, notes,
        months_employed, notice_period_months,
        initial_end_date, effective_end_date, extended_by_days,
        max_suspension_days, total_suspended_days,
        ijm_end_date, alerts, legal_basis, suspensions_detail, summary_text
      ) VALUES (
        ${employeeId}, ${companyId}, ${userId},
        ${dismissalDate}, ${endOfMonthNotice}, ${reason || null}, ${notes || null},
        ${result.monthsEmployed}, ${result.noticePeriodMonths},
        ${result.initialEndDate.toISOString().slice(0, 10)},
        ${result.effectiveEndDate.toISOString().slice(0, 10)},
        ${result.extendedByDays},
        ${result.maxSuspensionDays}, ${result.totalSuspendedDays},
        ${result.ijmEndDate ? result.ijmEndDate.toISOString().slice(0, 10) : null},
        ${JSON.stringify(result.alerts)},
        ${JSON.stringify(result.legalBasis)},
        ${JSON.stringify(result.suspensions)},
        ${terminationSummaryText(result)}
      )
      RETURNING *
    `;

    // Marquer l'employé comme en cours de sortie
    await sql`
      UPDATE employees SET
        end_date   = ${result.effectiveEndDate.toISOString().slice(0, 10)},
        updated_at = NOW()
      WHERE id = ${employeeId}
    `;

    res.json({ ok: true, termination: term, result });
  } catch (e: any) {
    console.error('[TERMINATIONS] Create:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/terminations — Liste
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.get('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();

    const rows = await sql`
      SELECT t.*,
        e.first_name, e.last_name, e.department,
        (SELECT COUNT(*) FROM termination_sick_leaves l WHERE l.termination_id = t.id) AS sick_leave_count
      FROM terminations t
      JOIN employees e ON t.employee_id = e.id
      WHERE t.company_id = ${companyId}
      ORDER BY t.dismissal_date DESC
      LIMIT 200
    `;
    res.json({ ok: true, terminations: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/terminations/alerts — Cas actifs avec alertes
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.get('/alerts', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();

    // Licenciements dont la date effective est dans le futur ou récente (60j)
    const rows = await sql`
      SELECT t.*, e.first_name, e.last_name, e.department
      FROM terminations t
      JOIN employees e ON t.employee_id = e.id
      WHERE t.company_id = ${companyId}
        AND t.effective_end_date >= NOW() - INTERVAL '60 days'
      ORDER BY t.effective_end_date ASC
    `;

    res.json({ ok: true, activeTerminations: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/terminations/:id
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.get('/:id', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const data = await loadTerminationWithLeaves(sql, Number(req.params.id), companyId);
    if (!data) return res.status(404).json({ error: 'Licenciement introuvable' });
    res.json({ ok: true, termination: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/terminations/:id/sick-leaves — Ajouter un arrêt maladie
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.post('/:id/sick-leaves', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const terminationId = Number(req.params.id);
    const { startDate, endDate, certificateUrl, notes } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate et endDate requis' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'endDate doit être >= startDate' });
    }

    // Vérifier que le licenciement appartient à l'entreprise
    const [term] = await sql`
      SELECT id FROM terminations WHERE id = ${terminationId} AND company_id = ${companyId}
    `;
    if (!term) return res.status(404).json({ error: 'Licenciement introuvable' });

    await sql`
      INSERT INTO termination_sick_leaves (termination_id, start_date, end_date, certificate_url, notes)
      VALUES (${terminationId}, ${startDate}, ${endDate}, ${certificateUrl || null}, ${notes || null})
    `;

    // Recalculer automatiquement
    const result = await recalculate(sql, terminationId, companyId);

    // Mettre à jour end_date employé
    await sql`
      UPDATE employees e SET
        end_date   = ${result.effectiveEndDate.toISOString().slice(0, 10)},
        updated_at = NOW()
      FROM terminations t
      WHERE t.id = ${terminationId} AND e.id = t.employee_id
    `;

    res.json({ ok: true, result, summary: terminationSummaryText(result) });
  } catch (e: any) {
    console.error('[TERMINATIONS] AddSickLeave:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// PUT /api/terminations/:id/sick-leaves/:slId
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.put('/:id/sick-leaves/:slId', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const terminationId = Number(req.params.id);
    const { startDate, endDate, certificateUrl, notes } = req.body;

    await sql`
      UPDATE termination_sick_leaves SET
        start_date      = COALESCE(${startDate || null}, start_date),
        end_date        = COALESCE(${endDate || null}, end_date),
        certificate_url = COALESCE(${certificateUrl || null}, certificate_url),
        notes           = COALESCE(${notes || null}, notes),
        updated_at      = NOW()
      WHERE id = ${req.params.slId} AND termination_id = ${terminationId}
    `;

    const result = await recalculate(sql, terminationId, companyId);
    res.json({ ok: true, result, summary: terminationSummaryText(result) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// DELETE /api/terminations/:id/sick-leaves/:slId
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.delete('/:id/sick-leaves/:slId', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const terminationId = Number(req.params.id);

    await sql`
      DELETE FROM termination_sick_leaves
      WHERE id = ${req.params.slId} AND termination_id = ${terminationId}
    `;

    const result = await recalculate(sql, terminationId, companyId);
    res.json({ ok: true, result, summary: terminationSummaryText(result) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/terminations/:id/recalculate — Forcer recalcul
// ─────────────────────────────────────────────────────────────────────────
terminationsRouter.get('/:id/recalculate', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const result = await recalculate(sql, Number(req.params.id), companyId);
    res.json({ ok: true, result, summary: terminationSummaryText(result) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
