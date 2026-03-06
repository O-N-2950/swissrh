import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { calculateSalary, parseTimeInput } from '../utils/swiss-salary.js';

export const salaryRouter = Router();

// POST /api/salary/calculate — Real-time calculation (no DB write)
salaryRouter.post('/calculate', (req, res) => {
  try {
    const result = calculateSalary(req.body);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/salary/payslip — Create + save a payslip
salaryRouter.post('/payslip', async (req, res) => {
  try {
    const { userId, companyId } = (req as any).user;
    const sql = getSQL();
    const {
      employeeId, periodYear, periodMonth, runId = null,
      ...salaryInput
    } = req.body;

    if (!employeeId || !periodYear || !periodMonth) {
      return res.status(400).json({ error: 'employeeId, periodYear, periodMonth requis' });
    }

    // Verify employee belongs to company
    const [emp] = await sql`
      SELECT * FROM employees WHERE id = ${employeeId} AND company_id = ${companyId} AND is_active = true
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const result = calculateSalary(salaryInput);

    const [payslip] = await sql`
      INSERT INTO payslips (
        run_id, employee_id, company_id, period_year, period_month,
        gross_salary, activity_rate,
        hours_normal, hours_extra_25, hours_night, hours_sunday, hours_holiday,
        vacation_indemnity, bonus,
        avs_employee, ai_employee, apg_employee, ac_employee,
        lpp_employee, lpp_rate, laa_np_employee, ijm_employee,
        family_allowance, other_deductions, total_deductions,
        net_salary,
        avs_employer, ai_employer, apg_employer, ac_employer,
        lpp_employer, laa_p_employer, ijm_employer, fam_alloc_employer,
        total_employer, total_cost
      ) VALUES (
        ${runId}, ${employeeId}, ${companyId}, ${periodYear}, ${periodMonth},
        ${result.grossTotal}, ${salaryInput.activityRate || 100},
        ${salaryInput.hoursNormal || 0}, ${salaryInput.hoursExtra25 || 0},
        ${salaryInput.hoursNight || 0}, ${salaryInput.hoursSunday || 0}, ${salaryInput.hoursHoliday || 0},
        ${result.grossVacation}, ${result.grossBonus},
        ${result.avs}, ${result.ai}, ${result.apg}, ${result.ac},
        ${result.lpp}, ${result.lppRate}, ${result.laaNp}, ${result.ijm},
        ${result.familyAllowance}, 0, ${result.totalDeductions},
        ${result.netSalary},
        ${result.avsEr}, ${result.aiEr}, ${result.apgEr}, ${result.acEr},
        ${result.lppEr}, ${result.laaPEr}, ${result.ijmEr}, ${result.famAllocEr},
        ${result.totalEmployer}, ${result.totalCost}
      )
      RETURNING *
    `;

    res.json({ ok: true, payslip, calculation: result });
  } catch (e: any) {
    console.error('[SALARY] Payslip create:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/salary/payslips — List payslips for company
salaryRouter.get('/payslips', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const { year, month, employeeId } = req.query;
    const sql = getSQL();

    let payslips;
    if (employeeId) {
      payslips = await sql`
        SELECT p.*, e.first_name, e.last_name, e.salary_type
        FROM payslips p JOIN employees e ON p.employee_id = e.id
        WHERE p.company_id = ${companyId}
          AND (${year ? sql`p.period_year = ${Number(year)}` : sql`1=1`})
          AND (${month ? sql`p.period_month = ${Number(month)}` : sql`1=1`})
          AND p.employee_id = ${Number(employeeId)}
        ORDER BY p.period_year DESC, p.period_month DESC
      `;
    } else {
      payslips = await sql`
        SELECT p.*, e.first_name, e.last_name, e.salary_type
        FROM payslips p JOIN employees e ON p.employee_id = e.id
        WHERE p.company_id = ${companyId}
          AND (${year ? sql`p.period_year = ${Number(year)}` : sql`1=1`})
          AND (${month ? sql`p.period_month = ${Number(month)}` : sql`1=1`})
        ORDER BY p.period_year DESC, p.period_month DESC
        LIMIT 200
      `;
    }

    res.json({ ok: true, payslips });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/salary/time/parse — Parse centièmes or H:MM
salaryRouter.post('/time/parse', (req, res) => {
  const { value } = req.body;
  const result = parseTimeInput(value);
  if (result === null) return res.status(400).json({ error: 'Format invalide. Utilisez 8.50 ou 8:30' });
  const hours = Math.floor(result);
  const minutes = Math.round((result - hours) * 60);
  res.json({ ok: true, centesimals: result, hours, minutes, str: `${hours}h${String(minutes).padStart(2, '0')}` });
});
