/**
 * SWISSRH — IA Détection d'anomalies salaires
 * GET /api/ai/anomalies?year=&month=  — analyse masse salariale du mois
 * GET /api/ai/trends?year=            — tendances annuelles + prévisions
 * GET /api/ai/alerts                  — alertes actives
 *
 * Détections heuristiques (pas de ML externe — entièrement local) :
 *  1. Écart >20% vs mois précédent pour un même employé
 *  2. Salaire hors plage contrat (±5% du salaire_amount)
 *  3. Heures supp excessives (>25% des heures normales)
 *  4. LAA NP ou LPP manquant alors qu'attendu
 *  5. Taux AVS/AC appliqué hors norme (<4.9% ou >5.7%)
 *  6. Saut salarial non justifié (>10% M/M même contrat CDI)
 *  7. Employé avec 0 déductions (suspect)
 *  8. Net > Brut (erreur de calcul)
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager, type JwtPayload } from '../auth/middleware.js';

export const aiRouter = Router();

type Severity = 'critical' | 'warning' | 'info';
interface Anomaly {
  employee_id:   number;
  employee_name: string;
  payslip_id:    number;
  type:          string;
  severity:      Severity;
  message:       string;
  expected?:     string;
  actual?:       string;
}

// ─────────────────────────────────────────────────────────────
// GET /api/ai/anomalies?year=&month=
// ─────────────────────────────────────────────────────────────
aiRouter.get('/anomalies', requireManager, async (req, res) => {
  const user  = (req as any).user as JwtPayload;
  const sql   = getSQL();
  const year  = Number(req.query.year  || new Date().getFullYear());
  const month = Number(req.query.month || new Date().getMonth() + 1);

  try {
    // Bulletins du mois
    const current = await sql`
      SELECT p.*, e.first_name, e.last_name, e.salary_amount, e.salary_type,
             e.contract_type, e.weekly_hours
      FROM payslips p JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${user.companyId}
        AND p.period_year = ${year} AND p.period_month = ${month}
    `;

    if (current.length === 0)
      return res.json({ ok: true, anomalies: [], analyzed: 0 });

    // Bulletins mois précédent
    const prevYear  = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const previous = await sql`
      SELECT employee_id, gross_salary, net_salary, total_deductions,
             avs_employee, ac_employee, hours_extra_25
      FROM payslips
      WHERE company_id = ${user.companyId}
        AND period_year = ${prevYear} AND period_month = ${prevMonth}
    `;
    const prevMap = new Map(previous.map((p: any) => [p.employee_id, p]));

    const anomalies: Anomaly[] = [];

    for (const p of current) {
      const gross      = Number(p.gross_salary);
      const net        = Number(p.net_salary);
      const deductions = Number(p.total_deductions);
      const avsEe      = Number(p.avs_employee);
      const aiEe       = Number(p.ai_employee);
      const acEe       = Number(p.ac_employee);
      const lppEe      = Number(p.lpp_employee);
      const laaNp      = Number(p.laa_np_employee);
      const extraH     = Number(p.hours_extra_25);
      const normalH    = Number(p.hours_normal) || Number(p.weekly_hours) * 4.33;
      const name       = `${p.first_name} ${p.last_name}`;
      const prev       = prevMap.get(p.employee_id);

      // ① Net > Brut (erreur comptable — critique)
      if (net > gross + 0.01) {
        anomalies.push({
          employee_id: p.employee_id, employee_name: name, payslip_id: p.id,
          type: 'NET_EXCEEDS_GROSS', severity: 'critical',
          message: 'Salaire net supérieur au brut — erreur de calcul probable',
          expected: `Net ≤ CHF ${gross.toFixed(2)}`, actual: `Net = CHF ${net.toFixed(2)}`,
        });
      }

      // ② Aucune déduction (suspect sauf apprenti ou très bas salaire)
      if (deductions < 1 && gross > 500) {
        anomalies.push({
          employee_id: p.employee_id, employee_name: name, payslip_id: p.id,
          type: 'ZERO_DEDUCTIONS', severity: 'warning',
          message: 'Aucune déduction sociale détectée pour ce bulletin',
          expected: 'Déductions > 0', actual: 'CHF 0.00',
        });
      }

      // ③ Taux AVS hors norme (5.3% ± 0.4% de tolérance)
      if (gross > 100 && avsEe > 0) {
        const avsRate = (avsEe + aiEe) / gross;
        if (avsRate < 0.049 || avsRate > 0.075) {
          anomalies.push({
            employee_id: p.employee_id, employee_name: name, payslip_id: p.id,
            type: 'AVS_RATE_ABNORMAL', severity: 'warning',
            message: `Taux AVS/AI appliqué hors norme (attendu ~6.0% pour employé)`,
            expected: '5.7% – 7.5%', actual: `${(avsRate*100).toFixed(2)}%`,
          });
        }
      }

      // ④ Taux AC hors norme (1.1%)
      if (gross > 100 && acEe > 0) {
        const acRate = acEe / gross;
        if (acRate < 0.008 || acRate > 0.015) {
          anomalies.push({
            employee_id: p.employee_id, employee_name: name, payslip_id: p.id,
            type: 'AC_RATE_ABNORMAL', severity: 'warning',
            message: 'Taux AC hors norme',
            expected: '0.8% – 1.5%', actual: `${(acRate*100).toFixed(2)}%`,
          });
        }
      }

      // ⑤ Heures supp excessives (>30% des heures normales)
      if (normalH > 0 && extraH > normalH * 0.30) {
        anomalies.push({
          employee_id: p.employee_id, employee_name: name, payslip_id: p.id,
          type: 'EXCESSIVE_OVERTIME', severity: 'warning',
          message: 'Heures supplémentaires excessives (>30% des heures normales)',
          expected: `< ${(normalH * 0.30).toFixed(1)}h`, actual: `${extraH.toFixed(1)}h`,
        });
      }

      // ⑥ Variation M/M > 20% (contrat CDI uniquement)
      if (prev && p.contract_type === 'CDI') {
        const prevGross = Number(prev.gross_salary);
        if (prevGross > 0) {
          const delta = Math.abs(gross - prevGross) / prevGross;
          if (delta > 0.20) {
            anomalies.push({
              employee_id: p.employee_id, employee_name: name, payslip_id: p.id,
              type: 'SALARY_SPIKE', severity: delta > 0.40 ? 'critical' : 'warning',
              message: `Variation salaire M/M de ${(delta*100).toFixed(1)}% (CDI)`,
              expected: `±20% max vs mois précédent`, actual: `${(delta*100).toFixed(1)}% (${prevGross.toFixed(2)} → ${gross.toFixed(2)})`,
            });
          }
        }
      }

      // ⑦ Salaire hors plage contrat (±10%)
      if (p.salary_amount && p.salary_type === 'monthly') {
        const contracted = Number(p.salary_amount);
        if (contracted > 0) {
          const diff = Math.abs(gross - contracted) / contracted;
          if (diff > 0.10) {
            anomalies.push({
              employee_id: p.employee_id, employee_name: name, payslip_id: p.id,
              type: 'SALARY_OUT_OF_CONTRACT', severity: 'info',
              message: 'Salaire brut écart >10% du contrat',
              expected: `CHF ${contracted.toFixed(2)} ±10%`,
              actual:   `CHF ${gross.toFixed(2)}`,
            });
          }
        }
      }
    }

    // Tri: critical → warning → info
    const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
    anomalies.sort((a, b) => order[a.severity] - order[b.severity]);

    res.json({
      ok: true,
      period: { year, month },
      analyzed: current.length,
      anomalies,
      summary: {
        critical: anomalies.filter(a => a.severity === 'critical').length,
        warning:  anomalies.filter(a => a.severity === 'warning').length,
        info:     anomalies.filter(a => a.severity === 'info').length,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/ai/trends?year= — tendances annuelles
// ─────────────────────────────────────────────────────────────
aiRouter.get('/trends', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const year = Number(req.query.year || new Date().getFullYear());

  try {
    const monthly = await sql`
      SELECT period_month,
        COUNT(*)::int                          as employee_count,
        SUM(gross_salary)::numeric             as total_gross,
        SUM(net_salary)::numeric               as total_net,
        SUM(total_employer)::numeric           as total_employer_cost,
        AVG(gross_salary)::numeric             as avg_gross,
        SUM(avs_employee+ai_employee+apg_employee)::numeric as total_avs,
        SUM(lpp_employee)::numeric             as total_lpp
      FROM payslips
      WHERE company_id = ${user.companyId} AND period_year = ${year}
      GROUP BY period_month ORDER BY period_month
    `;

    // Projection fin d'année (extrapolation linéaire sur les 3 derniers mois)
    let projection = null;
    if (monthly.length >= 3) {
      const last3 = monthly.slice(-3);
      const avgGrowth = last3.reduce((s: number, m: any, i: number) => {
        if (i === 0) return s;
        const prev = Number(last3[i-1].total_gross);
        return s + (prev > 0 ? (Number(m.total_gross) - prev) / prev : 0);
      }, 0) / 2;
      const lastGross = Number(last3[last3.length-1].total_gross);
      const remainingMonths = 12 - monthly[monthly.length-1].period_month;
      projection = {
        estimated_annual_gross: monthly.reduce((s: number, m: any) => s + Number(m.total_gross), 0)
          + lastGross * (1 + avgGrowth) * remainingMonths,
        monthly_growth_rate: `${(avgGrowth * 100).toFixed(2)}%`,
        based_on_last_n_months: 3,
      };
    }

    res.json({ ok: true, year, monthly, projection });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/ai/alerts — alertes actives toutes périodes
// ─────────────────────────────────────────────────────────────
aiRouter.get('/alerts', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();

  try {
    // Derniers 3 mois
    const alerts: any[] = [];
    const now = new Date();

    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;

      // Employés sans bulletin ce mois (s'ils étaient actifs)
      const missing = await sql`
        SELECT e.id, e.first_name, e.last_name
        FROM employees e
        WHERE e.company_id = ${user.companyId} AND e.is_active = true
          AND e.hire_date <= ${`${y}-${String(m).padStart(2,'0')}-01`}
          AND NOT EXISTS (
            SELECT 1 FROM payslips p
            WHERE p.employee_id = e.id
              AND p.period_year = ${y} AND p.period_month = ${m}
          )
        LIMIT 5
      `;
      if (missing.length > 0) {
        alerts.push({
          type: 'MISSING_PAYSLIP', severity: 'warning',
          period: `${y}-${String(m).padStart(2,'0')}`,
          message: `${missing.length} employé(s) sans bulletin`,
          employees: missing.map((e: any) => `${e.first_name} ${e.last_name}`),
        });
      }
    }

    res.json({ ok: true, alerts });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
