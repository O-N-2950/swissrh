import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { parseTimeInput, centToHMM } from '../utils/swiss-salary-v2.js';

export const timeEntriesRouter = Router();

// GET /api/time — Feuille de temps
timeEntriesRouter.get('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { employeeId, year, month, week } = req.query;

    const rows = await sql`
      SELECT t.*, e.first_name, e.last_name, e.weekly_hours,
        u.first_name as approver_first, u.last_name as approver_last
      FROM time_entries t
      JOIN employees e ON t.employee_id = e.id
      LEFT JOIN users u ON t.approved_by = u.id
      WHERE t.company_id = ${companyId}
        AND (${employeeId ? sql`t.employee_id = ${Number(employeeId)}` : sql`1=1`})
        AND (${year  ? sql`EXTRACT(YEAR  FROM t.work_date) = ${Number(year)}`  : sql`1=1`})
        AND (${month ? sql`EXTRACT(MONTH FROM t.work_date) = ${Number(month)}` : sql`1=1`})
        AND (${week  ? sql`EXTRACT(WEEK  FROM t.work_date) = ${Number(week)}`  : sql`1=1`})
      ORDER BY t.work_date DESC, t.employee_id
    `;

    // Enrichir avec conversions centièmes
    const enriched = rows.map((r: any) => ({
      ...r,
      arrival_hm:    r.arrival_time   ? centToHMM(r.arrival_time).str   : null,
      departure_hm:  r.departure_time ? centToHMM(r.departure_time).str : null,
      worked_hm:     r.worked_hours   ? centToHMM(r.worked_hours).str   : null,
      overtime_hm:   r.overtime_hours ? centToHMM(r.overtime_hours).str : null,
    }));

    res.json({ ok: true, entries: enriched });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/time — Saisir une ligne de temps
timeEntriesRouter.post('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const {
      employeeId, workDate, arrivalRaw, departureRaw, breakDuration = 0,
      entryType = 'work', notes, nightHours = 0, sundayHours = 0, holidayHours = 0,
    } = req.body;

    if (!employeeId || !workDate) {
      return res.status(400).json({ error: 'employeeId et workDate requis' });
    }

    // Vérifier ownership
    const [emp] = await sql`SELECT weekly_hours FROM employees WHERE id = ${employeeId} AND company_id = ${companyId}`;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    // Parser les heures (centièmes ou H:MM)
    const arrival   = arrivalRaw   ? parseTimeInput(arrivalRaw)   : null;
    const departure = departureRaw ? parseTimeInput(departureRaw) : null;

    // Calculer heures travaillées
    let workedHours = null, overtimeHours = 0;
    if (arrival !== null && departure !== null) {
      const raw = departure - arrival - (breakDuration / 60);
      workedHours = Math.max(0, raw);
      const dailyTarget = emp.weekly_hours / 5;
      overtimeHours = Math.max(0, workedHours - dailyTarget);
    }

    // Vérification LTr pauses légales
    const pauseWarning = workedHours ? checkLegalBreak(workedHours, parseFloat(breakDuration)) : null;

    const [entry] = await sql`
      INSERT INTO time_entries (
        employee_id, company_id, work_date,
        arrival_time, departure_time, break_duration,
        worked_hours, overtime_hours, night_hours, sunday_hours, holiday_hours,
        entry_type, notes
      ) VALUES (
        ${employeeId}, ${companyId}, ${workDate},
        ${arrival}, ${departure}, ${parseFloat(breakDuration) / 60},
        ${workedHours}, ${overtimeHours}, ${nightHours}, ${sundayHours}, ${holidayHours},
        ${entryType}, ${notes || null}
      )
      ON CONFLICT (employee_id, work_date) DO UPDATE SET
        arrival_time = EXCLUDED.arrival_time,
        departure_time = EXCLUDED.departure_time,
        break_duration = EXCLUDED.break_duration,
        worked_hours = EXCLUDED.worked_hours,
        overtime_hours = EXCLUDED.overtime_hours,
        night_hours = EXCLUDED.night_hours,
        sunday_hours = EXCLUDED.sunday_hours,
        holiday_hours = EXCLUDED.holiday_hours,
        entry_type = EXCLUDED.entry_type,
        notes = EXCLUDED.notes
      RETURNING *
    `;

    res.json({
      ok: true,
      entry: {
        ...entry,
        worked_hm:   workedHours  ? centToHMM(workedHours).str  : null,
        overtime_hm: overtimeHours ? centToHMM(overtimeHours).str : null,
      },
      pauseWarning,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/time/batch — Saisie semaine complète
timeEntriesRouter.post('/batch', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { employeeId, entries } = req.body; // entries: Array<{workDate, arrivalRaw, departureRaw, ...}>

    if (!employeeId || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'employeeId et entries[] requis' });
    }

    const [emp] = await sql`SELECT weekly_hours FROM employees WHERE id = ${employeeId} AND company_id = ${companyId}`;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const results = [];
    let weekTotal = 0;

    for (const e of entries) {
      const arrival   = e.arrivalRaw   ? parseTimeInput(e.arrivalRaw)   : null;
      const departure = e.departureRaw ? parseTimeInput(e.departureRaw) : null;
      const breakH    = (e.breakMinutes || 0) / 60;

      let workedHours = null, overtimeHours = 0;
      if (arrival !== null && departure !== null) {
        workedHours   = Math.max(0, departure - arrival - breakH);
        weekTotal    += workedHours;
        const daily   = emp.weekly_hours / 5;
        overtimeHours = Math.max(0, workedHours - daily);
      }

      const [row] = await sql`
        INSERT INTO time_entries (
          employee_id, company_id, work_date,
          arrival_time, departure_time, break_duration,
          worked_hours, overtime_hours, entry_type, notes
        ) VALUES (
          ${employeeId}, ${companyId}, ${e.workDate},
          ${arrival}, ${departure}, ${breakH},
          ${workedHours}, ${overtimeHours}, ${e.entryType || 'work'}, ${e.notes || null}
        )
        ON CONFLICT (employee_id, work_date) DO UPDATE SET
          arrival_time = EXCLUDED.arrival_time,
          departure_time = EXCLUDED.departure_time,
          break_duration = EXCLUDED.break_duration,
          worked_hours = EXCLUDED.worked_hours,
          overtime_hours = EXCLUDED.overtime_hours
        RETURNING *
      `;
      results.push(row);
    }

    const weeklyTarget = emp.weekly_hours;
    const weekOvertime = Math.max(0, weekTotal - weeklyTarget);

    res.json({
      ok: true,
      entries: results,
      summary: {
        totalHours:    centToHMM(weekTotal),
        targetHours:   centToHMM(weeklyTarget),
        overtime:      centToHMM(weekOvertime),
        balance:       centToHMM(weekTotal - weeklyTarget),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/time/:id/approve — Approuver une ligne
timeEntriesRouter.put('/:id/approve', async (req, res) => {
  try {
    const { companyId, userId } = (req as any).user;
    const sql = getSQL();
    const [entry] = await sql`
      UPDATE time_entries
      SET approved_by = ${userId}, approved_at = NOW()
      WHERE id = ${req.params.id} AND company_id = ${companyId}
      RETURNING *
    `;
    res.json({ ok: true, entry });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/time/:id
timeEntriesRouter.delete('/:id', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    await sql`DELETE FROM time_entries WHERE id = ${req.params.id} AND company_id = ${companyId}`;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/time/summary/:employeeId — Résumé mensuel heures
timeEntriesRouter.get('/summary/:employeeId', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    const [summary] = await sql`
      SELECT
        COUNT(*)::int as days_worked,
        COALESCE(SUM(worked_hours), 0)::numeric  as total_hours,
        COALESCE(SUM(overtime_hours), 0)::numeric as total_overtime,
        COALESCE(SUM(night_hours), 0)::numeric   as total_night,
        COALESCE(SUM(sunday_hours), 0)::numeric  as total_sunday,
        COALESCE(SUM(holiday_hours), 0)::numeric as total_holiday
      FROM time_entries
      WHERE employee_id = ${req.params.employeeId}
        AND company_id = ${companyId}
        AND entry_type = 'work'
        AND EXTRACT(YEAR  FROM work_date) = ${year}
        AND EXTRACT(MONTH FROM work_date) = ${month}
    `;

    const [emp] = await sql`SELECT weekly_hours FROM employees WHERE id = ${req.params.employeeId}`;
    const workingDays = getWorkingDaysInMonth(year, month - 1);
    const target = emp ? (emp.weekly_hours / 5) * workingDays : 0;

    res.json({
      ok: true,
      year, month,
      summary: {
        daysWorked:    summary.days_worked,
        totalHours:    { decimal: parseFloat(summary.total_hours),    ...centToHMM(parseFloat(summary.total_hours))    },
        totalOvertime: { decimal: parseFloat(summary.total_overtime), ...centToHMM(parseFloat(summary.total_overtime)) },
        totalNight:    { decimal: parseFloat(summary.total_night),    ...centToHMM(parseFloat(summary.total_night))    },
        totalSunday:   { decimal: parseFloat(summary.total_sunday),   ...centToHMM(parseFloat(summary.total_sunday))   },
        totalHoliday:  { decimal: parseFloat(summary.total_holiday),  ...centToHMM(parseFloat(summary.total_holiday))  },
        targetHours:   { decimal: target,                             ...centToHMM(target)                             },
        balance:       { decimal: parseFloat(summary.total_hours) - target, ...centToHMM(parseFloat(summary.total_hours) - target) },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────

function checkLegalBreak(workedHours: number, breakMinutes: number): string | null {
  // LTr Art. 15 — pauses légales obligatoires
  if (workedHours > 9 && breakMinutes < 60) return 'Pause insuffisante: ≥60 min requises pour >9h de travail (LTr Art. 15)';
  if (workedHours > 7 && breakMinutes < 30) return 'Pause insuffisante: ≥30 min requises pour >7h de travail (LTr Art. 15)';
  if (workedHours > 5.5 && breakMinutes < 15) return 'Pause insuffisante: ≥15 min requises pour >5.5h de travail (LTr Art. 15)';
  return null;
}

function getWorkingDaysInMonth(year: number, month: number): number {
  // Calcul simplifié sans fériés (à affiner avec public_holidays)
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  let count = 0;
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}
