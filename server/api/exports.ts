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

/**
 * GET /api/exports/accounting.csv?year=YYYY&month=MM
 * Export écritures comptables format Banana Comptabilité
 * Schéma : Date | Pièce | Compte D | Compte C | Description | Montant CHF
 *
 * Plan comptable Banana standard PME suisse :
 *   5000 Salaires bruts
 *   5100 Cotisations AVS/AI/APG (part employé)
 *   5110 Cotisations AC (part employé)
 *   5120 LPP part employé
 *   5130 LAA NP part employé
 *   5140 IJM part employé
 *   5200 Charges AVS/AI/APG employeur
 *   5210 Charges AC employeur
 *   5220 Charges LPP employeur
 *   5230 Charges LAA P employeur
 *   5240 Charges IJM employeur
 *   5250 Allocations familiales
 *   2000 Salaires à payer (transitoire)
 *   2100 Charges sociales à payer (transitoire)
 */
exportRouter.get('/accounting.csv', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const year  = Number(req.query.year  || new Date().getFullYear());
  const month = Number(req.query.month || new Date().getMonth() + 1);

  try {
    const [co] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const payslips = await sql`
      SELECT p.*, e.first_name, e.last_name
      FROM payslips p JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${user.companyId}
        AND p.period_year = ${year} AND p.period_month = ${month}
      ORDER BY e.last_name, e.first_name
    `;

    if (payslips.length === 0)
      return res.status(404).json({ error: 'Aucun bulletin pour cette période' });

    const period = `${year}-${String(month).padStart(2,'0')}`;
    const lastDay = new Date(year, month, 0).toISOString().slice(0,10);

    // Totaux agrégés
    const sum = (field: string) => payslips.reduce((s: number, p: any) => s + Number(p[field]||0), 0);
    const grossTotal  = sum('gross_salary');
    const netTotal    = sum('net_salary');
    const avsEe       = sum('avs_employee') + sum('ai_employee') + sum('apg_employee');
    const acEe        = sum('ac_employee');
    const lppEe       = sum('lpp_employee');
    const laaNpEe     = sum('laa_np_employee');
    const ijmEe       = sum('ijm_employee');
    const totalDed    = sum('total_deductions');
    const avsEr       = sum('avs_employer') + sum('ai_employer') + sum('apg_employer');
    const acEr        = sum('ac_employer');
    const lppEr       = sum('lpp_employer');
    const laaP        = sum('laa_p_employer');
    const ijmEr       = sum('ijm_employer');
    const famAlloc    = sum('fam_alloc_employer');
    const totalEr     = sum('total_employer');
    const fmt2        = (n: number) => n.toFixed(2);

    // Format Banana : Date;Pièce;CompteD;CompteC;Description;Montant
    const rows: string[][] = [];
    const piece = `SAL-${period}`;

    // 1. Salaires bruts → débit 5000, crédit 2000
    rows.push([lastDay, piece, '5000', '2000', `Salaires bruts ${period} (${payslips.length} emp.)`, fmt2(grossTotal)]);

    // 2. Déductions employé → débit 2000, crédit 2100
    if (avsEe > 0)   rows.push([lastDay, piece, '2000', '2100', `AVS/AI/APG part employé ${period}`,  fmt2(avsEe)]);
    if (acEe  > 0)   rows.push([lastDay, piece, '2000', '2100', `AC part employé ${period}`,           fmt2(acEe)]);
    if (lppEe > 0)   rows.push([lastDay, piece, '2000', '2100', `LPP part employé ${period}`,          fmt2(lppEe)]);
    if (laaNpEe > 0) rows.push([lastDay, piece, '2000', '2100', `LAA NP part employé ${period}`,       fmt2(laaNpEe)]);
    if (ijmEe > 0)   rows.push([lastDay, piece, '2000', '2100', `IJM part employé ${period}`,          fmt2(ijmEe)]);

    // 3. Net à verser → débit 2000, crédit 1020 (CCP/Banque)
    rows.push([lastDay, piece, '2000', '1020', `Salaires nets à verser ${period}`, fmt2(netTotal)]);

    // 4. Charges patronales → débit 5200-5250, crédit 2100
    if (avsEr  > 0)  rows.push([lastDay, piece, '5200', '2100', `AVS/AI/APG part employeur ${period}`,  fmt2(avsEr)]);
    if (acEr   > 0)  rows.push([lastDay, piece, '5210', '2100', `AC part employeur ${period}`,           fmt2(acEr)]);
    if (lppEr  > 0)  rows.push([lastDay, piece, '5220', '2100', `LPP part employeur ${period}`,          fmt2(lppEr)]);
    if (laaP   > 0)  rows.push([lastDay, piece, '5230', '2100', `LAA P part employeur ${period}`,        fmt2(laaP)]);
    if (ijmEr  > 0)  rows.push([lastDay, piece, '5240', '2100', `IJM part employeur ${period}`,          fmt2(ijmEr)]);
    if (famAlloc > 0)rows.push([lastDay, piece, '5250', '2100', `Allocations familiales ${period}`,      fmt2(famAlloc)]);

    // Ligne récap charges totales
    rows.push([lastDay, piece, '5000', '5000',
      `=== TOTAL CHARGES PATRONALES ${period} ===`, fmt2(totalEr)]);

    // Détail par employé (pour ventilation)
    rows.push(['', '', '', '', `--- Détail par employé ${period} ---`, '']);
    for (const p of payslips) {
      const name = `${p.last_name} ${p.first_name}`;
      rows.push([lastDay, piece, '5000', '2000', `Salaire ${name}`, Number(p.gross_salary).toFixed(2)]);
    }

    const headers = ['Date', 'Pièce', 'Cpte Débit', 'Cpte Crédit', 'Description', 'Montant CHF'];
    const csv = csvWithWatermark(rows, headers, {
      companyName: co?.name || 'SwissRH',
      generatedBy: user.email,
      generatedAt: new Date().toISOString(),
      exportType:  `Écritures comptables Banana ${period}`,
    });

    audit({ userId: user.userId, userEmail: user.email, userRole: user.role,
      companyId: user.companyId, action: 'EXPORT_ACCOUNTING_BANANA',
      resourceType: 'accounting', details: `Banana ${period}`, ipAddress: getIp(req) });

    secureExportHeaders(res, `swissrh-banana-${period}.csv`, 'csv');
    res.send('\uFEFF' + csv);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/**
 * GET /api/exports/accounting-abacus.csv?year=YYYY&month=MM
 * Export écritures format Abacus (AbaConnect CSV)
 * Colonnes: Periode;Konto;GKto;Belegnummer;BuchText;Betrag;MwSt
 */
exportRouter.get('/accounting-abacus.csv', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const year  = Number(req.query.year  || new Date().getFullYear());
  const month = Number(req.query.month || new Date().getMonth() + 1);

  try {
    const [co] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const payslips = await sql`
      SELECT p.*, e.first_name, e.last_name
      FROM payslips p JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${user.companyId}
        AND p.period_year = ${year} AND p.period_month = ${month}
      ORDER BY e.last_name
    `;

    if (payslips.length === 0)
      return res.status(404).json({ error: 'Aucun bulletin pour cette période' });

    const period  = `${year}-${String(month).padStart(2,'0')}`;
    const abaPer  = `${String(month).padStart(2,'0')}.${year}`; // Abacus: MM.YYYY
    const lastDay = new Date(year, month, 0).toISOString().slice(0,10).replace(/-/g,'.');
    const belegnr = `SAL${period.replace('-','')}`;
    const fmt2    = (n: number) => n.toFixed(2).replace('.',',');
    const sum     = (f: string) => payslips.reduce((s: number, p: any) => s + Number(p[f]||0), 0);

    const rows: string[][] = [];
    // Abacus columns: Periode | Konto | GKto | Belegnummer | BuchText | Betrag | MwSt%
    const abr = (kto: string, gkto: string, txt: string, amt: number) =>
      [abaPer, kto, gkto, belegnr, txt, fmt2(amt), '0'];

    const gross  = sum('gross_salary');
    const net    = sum('net_salary');
    const avsEe  = sum('avs_employee') + sum('ai_employee') + sum('apg_employee');
    const acEe   = sum('ac_employee');
    const lppEe  = sum('lpp_employee');
    const laaEe  = sum('laa_np_employee');
    const ijmEe  = sum('ijm_employee');
    const avsEr  = sum('avs_employer') + sum('ai_employer') + sum('apg_employer');
    const acEr   = sum('ac_employer');
    const lppEr  = sum('lpp_employer');
    const laaEr  = sum('laa_p_employer');
    const ijmEr  = sum('ijm_employer');
    const fam    = sum('fam_alloc_employer');

    rows.push(abr('5000','1020', `Salaires bruts ${period}`,   gross));
    if (avsEe > 0) rows.push(abr('5100','2030', `AVS/AI/APG EE ${period}`,   avsEe));
    if (acEe  > 0) rows.push(abr('5110','2030', `AC EE ${period}`,            acEe));
    if (lppEe > 0) rows.push(abr('5120','2030', `LPP EE ${period}`,           lppEe));
    if (laaEe > 0) rows.push(abr('5130','2030', `LAA NP EE ${period}`,        laaEe));
    if (ijmEe > 0) rows.push(abr('5140','2030', `IJM EE ${period}`,           ijmEe));
    rows.push(abr('1020','2000', `Net versé employés ${period}`,               net));
    if (avsEr > 0) rows.push(abr('5200','2030', `AVS/AI/APG ER ${period}`,    avsEr));
    if (acEr  > 0) rows.push(abr('5210','2030', `AC ER ${period}`,            acEr));
    if (lppEr > 0) rows.push(abr('5220','2030', `LPP ER ${period}`,           lppEr));
    if (laaEr > 0) rows.push(abr('5230','2030', `LAA P ER ${period}`,         laaEr));
    if (ijmEr > 0) rows.push(abr('5240','2030', `IJM ER ${period}`,           ijmEr));
    if (fam   > 0) rows.push(abr('5250','2030', `All. familiales ER ${period}`,fam));

    const headers = ['Periode','Konto','GKto','Belegnummer','BuchText','Betrag','MwSt%'];
    const csv = [
      `# Abacus AbaConnect Import — ${co?.name}`,
      `# Periode: ${abaPer} | Bulletins: ${payslips.length}`,
      `# ${new Date().toISOString()}`,
      '',
      headers.join(';'),
      ...rows.map(r => r.map(v => `"${v}"`).join(';')),
    ].join('\n');

    audit({ userId: user.userId, userEmail: user.email, userRole: user.role,
      companyId: user.companyId, action: 'EXPORT_ACCOUNTING_ABACUS',
      resourceType: 'accounting', details: `Abacus ${period}`, ipAddress: getIp(req) });

    secureExportHeaders(res, `swissrh-abacus-${period}.csv`, 'csv');
    res.send('\uFEFF' + csv);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
