/**
 * SWISSRH — Exports sécurisés
 * ============================================================
 * - Exports protégés par requireAuth/requireManager
 * - Audit log systématique (qui, quand, quoi)
 * - Filigrane CONFIDENTIEL sur tous les exports
 * - Headers de sécurité (no-cache, content-disposition)
 * ============================================================
 */

import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager, type JwtPayload } from '../auth/middleware.js';
import { decrypt, maskAvs } from '../utils/encryption.js';
import { audit, getIp } from '../utils/audit-log.js';

export const exportRouter = Router();

/** Headers de sécurité pour tous les exports */
function secureExportHeaders(res: any, filename: string, type: 'csv' | 'pdf') {
  res.setHeader('Content-Type', type === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

/** Génère un CSV avec filigrane en commentaire */
function csvWithWatermark(rows: string[][], headers: string[], meta: {
  companyName: string;
  generatedBy: string;
  generatedAt: string;
  exportType:  string;
}): string {
  const lines: string[] = [
    `# *** CONFIDENTIEL — ${meta.exportType} ***`,
    `# Entreprise: ${meta.companyName}`,
    `# Généré par: ${meta.generatedBy}`,
    `# Date: ${meta.generatedAt}`,
    `# USAGE INTERNE UNIQUEMENT — Ne pas diffuser`,
    `# ` + '='.repeat(60),
    '',
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  return lines.join('\n');
}

/**
 * GET /api/exports/employees.csv
 * Export liste employés — admin/rh_manager uniquement
 */
exportRouter.get('/employees.csv', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();

  try {
    const [company] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const employees = await sql`
      SELECT e.id, e.first_name, e.last_name, e.email, e.phone,
             e.birthdate, e.hire_date, e.contract_type, e.activity_rate,
             e.weekly_hours, e.salary_type, e.salary_amount,
             e.department, e.position, e.vacation_weeks,
             e.avs_number, e.permit_type, e.permit_expiry,
             e.address, e.npa, e.city
      FROM employees e
      WHERE e.company_id = ${user.companyId} AND e.is_active = true
      ORDER BY e.last_name, e.first_name
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'EXPORT_CSV',
      resourceType: 'employees',
      details: `Export ${employees.length} employés`,
      ipAddress: getIp(req),
    });

    const headers = [
      'ID', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Date naissance',
      'Date entrée', 'Contrat', 'Taux %', 'Heures/sem',
      'Type salaire', 'Salaire brut', 'Département', 'Poste',
      'Semaines vacances', 'AVS (masqué)', 'Permis', 'Expiry permis',
      'Adresse', 'NPA', 'Ville',
    ];

    const rows = employees.map((e: any) => [
      e.id, e.last_name, e.first_name, e.email || '', e.phone || '',
      e.birthdate ? e.birthdate.toISOString().slice(0, 10) : '',
      e.hire_date ? e.hire_date.toISOString().slice(0, 10) : '',
      e.contract_type, e.activity_rate, e.weekly_hours,
      e.salary_type, e.salary_amount || '',
      e.department || '', e.position || '',
      e.vacation_weeks,
      maskAvs(decrypt(e.avs_number)), // TOUJOURS masqué dans exports CSV
      e.permit_type || '', e.permit_expiry ? e.permit_expiry.toISOString().slice(0, 10) : '',
      e.address || '', e.npa || '', e.city || '',
    ]);

    const csv = csvWithWatermark(rows, headers, {
      companyName: company?.name || 'SwissRH',
      generatedBy: user.email,
      generatedAt: new Date().toISOString(),
      exportType:  'Liste des employés',
    });

    const filename = `swissrh-employes-${new Date().toISOString().slice(0, 10)}.csv`;
    secureExportHeaders(res, filename, 'csv');
    res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/exports/payslips.csv?year=2025&month=3
 * Export bulletins — admin/rh_manager uniquement
 */
exportRouter.get('/payslips.csv', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  try {
    const [company] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const payslips = await sql`
      SELECT p.*, e.first_name, e.last_name, e.avs_number
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${user.companyId}
        AND p.period_year  = ${Number(year)}
        AND p.period_month = ${Number(month)}
      ORDER BY e.last_name, e.first_name
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'EXPORT_CSV',
      resourceType: 'payslips',
      details: `Export paie ${year}/${month} — ${payslips.length} bulletins`,
      ipAddress: getIp(req),
    });

    const headers = [
      'Nom', 'Prénom', 'AVS (masqué)',
      'Période', 'Brut', 'Net',
      'AVS employé', 'AC employé', 'LPP employé',
      'Charges patronales', 'Coût total employeur',
    ];

    const rows = payslips.map((p: any) => [
      p.last_name, p.first_name,
      maskAvs(decrypt(p.avs_number)),
      `${p.period_year}-${String(p.period_month).padStart(2, '0')}`,
      p.gross_salary, p.net_salary,
      p.avs_employee, p.ac_employee, p.lpp_employee,
      p.total_employer, p.total_cost,
    ]);

    const csv = csvWithWatermark(rows, headers, {
      companyName: company?.name || 'SwissRH',
      generatedBy: user.email,
      generatedAt: new Date().toISOString(),
      exportType:  `Bulletins de salaire ${year}/${month}`,
    });

    const filename = `swissrh-paie-${year}-${String(month).padStart(2,'0')}.csv`;
    secureExportHeaders(res, filename, 'csv');
    res.send('\uFEFF' + csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/exports/avs.csv?year=2025
 * Déclaration AVS annuelle — admin uniquement
 */
exportRouter.get('/avs.csv', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const { year = new Date().getFullYear() } = req.query;

  try {
    const [company] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const rows_data = await sql`
      SELECT e.last_name, e.first_name, e.avs_number, e.birthdate,
        SUM(p.gross_salary)::numeric      as annual_gross,
        SUM(p.avs_employee)::numeric      as avs_employee,
        SUM(p.avs_employer)::numeric      as avs_employer,
        SUM(p.ai_employee)::numeric       as ai_employee,
        SUM(p.apg_employee)::numeric      as apg_employee
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${user.companyId}
        AND p.period_year = ${Number(year)}
      GROUP BY e.id, e.last_name, e.first_name, e.avs_number, e.birthdate
      ORDER BY e.last_name
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'EXPORT_AVS_XML',
      resourceType: 'avs_declaration',
      details: `Export AVS ${year} — ${rows_data.length} employés`,
      ipAddress: getIp(req),
    });

    const headers = [
      'Nom', 'Prénom', 'No AVS', 'Date naissance',
      'Salaire annuel brut',
      'AVS employé', 'AVS employeur',
      'AI employé', 'APG employé',
    ];

    const rows = rows_data.map((r: any) => [
      r.last_name, r.first_name,
      decrypt(r.avs_number) || '', // AVS en clair pour déclaration officielle
      r.birthdate ? r.birthdate.toISOString().slice(0, 10) : '',
      r.annual_gross, r.avs_employee, r.avs_employer,
      r.ai_employee, r.apg_employee,
    ]);

    const csv = csvWithWatermark(rows, headers, {
      companyName: company?.name || 'SwissRH',
      generatedBy: user.email,
      generatedAt: new Date().toISOString(),
      exportType:  `Déclaration AVS ${year} — CONFIDENTIEL`,
    });

    const filename = `swissrh-avs-declaration-${year}.csv`;
    secureExportHeaders(res, filename, 'csv');
    res.send('\uFEFF' + csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
