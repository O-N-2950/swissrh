import { Router } from 'express';
import { getSQL } from '../db/pool.js';

export const reportsRouter = Router();

// GET /api/reports/dashboard — KPIs for admin dashboard
reportsRouter.get('/dashboard', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const [empCount] = await sql`
      SELECT COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE permit_type IN ('B','G','L') AND permit_expiry <= CURRENT_DATE + 60)::int as permits_expiring
      FROM employees
      WHERE company_id = ${companyId} AND is_active = true
    `;

    const [payroll] = await sql`
      SELECT
        COALESCE(SUM(gross_salary)::numeric, 0) as total_gross,
        COALESCE(SUM(net_salary)::numeric, 0) as total_net,
        COALESCE(SUM(total_employer)::numeric, 0) as total_employer_cost,
        COUNT(*)::int as payslips_count
      FROM payslips
      WHERE company_id = ${companyId}
        AND period_year = ${Number(year)}
        AND period_month = ${Number(month)}
    `;

    const [lastMonth] = await sql`
      SELECT COALESCE(SUM(gross_salary)::numeric, 0) as total_gross
      FROM payslips
      WHERE company_id = ${companyId}
        AND period_year = ${Number(month) === 1 ? Number(year) - 1 : Number(year)}
        AND period_month = ${Number(month) === 1 ? 12 : Number(month) - 1}
    `;

    const currentGross = parseFloat(payroll.total_gross);
    const lastGross    = parseFloat(lastMonth.total_gross);
    const trend        = lastGross > 0 ? ((currentGross - lastGross) / lastGross * 100).toFixed(1) : '0.0';

    res.json({
      ok: true,
      period: { year: Number(year), month: Number(month) },
      employees: { total: empCount.total, permitsExpiring: empCount.permits_expiring },
      payroll: {
        totalGross:        currentGross,
        totalNet:          parseFloat(payroll.total_net),
        totalEmployerCost: parseFloat(payroll.total_employer_cost),
        payslipsCount:     payroll.payslips_count,
        trendVsLastMonth:  `${Number(trend) >= 0 ? '+' : ''}${trend}%`,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/reports/avs — Base AVS annuelle
reportsRouter.get('/avs', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const { year = new Date().getFullYear() } = req.query;
    const sql = getSQL();

    const rows = await sql`
      SELECT e.first_name, e.last_name, e.avs_number,
        SUM(p.gross_salary)::numeric as annual_gross,
        SUM(p.avs_employee)::numeric as avs_employee_total,
        SUM(p.avs_employer)::numeric as avs_employer_total
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${companyId} AND p.period_year = ${Number(year)}
      GROUP BY e.id, e.first_name, e.last_name, e.avs_number
      ORDER BY e.last_name
    `;

    res.json({ ok: true, year: Number(year), declarations: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
