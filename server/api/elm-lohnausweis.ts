/**
 * SWISSRH — ELM XML (Swissdec ELM 4.0) + Lohnausweis PDF
 * ============================================================
 * GET /api/exports/elm.xml?year=YYYY
 *   → XML ELM 4.0 conforme Swissdec — déclaration AVS/AC/LAA
 * GET /api/salary/lohnausweis/:employeeId/:year/pdf
 *   → Lohnausweis PDF A4 officiel — 15 cases Swissdec
 * ============================================================
 */

import { Router }     from 'express';
import PDFDocument    from 'pdfkit';
import { getSQL }     from '../db/pool.js';
import { requireAuth, requireManager, type JwtPayload } from '../auth/middleware.js';
import { decrypt }    from '../utils/encryption.js';
import { audit, getIp } from '../utils/audit-log.js';

export const elmRouter = Router();

// ═══════════════════════════════════════════════════════════════
// 1. GET /api/exports/elm.xml?year=YYYY — ELM XML Swissdec 4.0
// ═══════════════════════════════════════════════════════════════
elmRouter.get('/elm.xml', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const year = Number(req.query.year) || new Date().getFullYear();

  try {
    // ── Données entreprise ─────────────────────────────────────
    const [co] = await sql`
      SELECT name, legal_form, uid, address, npa, city, canton,
             avs_number, lpp_number, laa_number
      FROM companies WHERE id = ${user.companyId}
    `;
    if (!co) return res.status(404).json({ error: 'Entreprise introuvable' });

    // ── Données employés + cumuls annuels ─────────────────────
    const employees = await sql`
      SELECT
        e.id, e.first_name, e.last_name, e.avs_number, e.birthdate,
        e.hire_date, e.end_date, e.contract_type, e.permit_type,
        e.activity_rate, e.weekly_hours, e.address, e.npa, e.city,
        e.salary_type,
        SUM(p.gross_salary)::numeric        AS annual_gross,
        SUM(p.net_salary)::numeric          AS annual_net,
        SUM(p.avs_employee)::numeric        AS avs_ee,
        SUM(p.avs_employer)::numeric        AS avs_er,
        SUM(p.ai_employee)::numeric         AS ai_ee,
        SUM(p.ai_employer)::numeric         AS ai_er,
        SUM(p.apg_employee)::numeric        AS apg_ee,
        SUM(p.apg_employer)::numeric        AS apg_er,
        SUM(p.ac_employee)::numeric         AS ac_ee,
        SUM(p.ac_employer)::numeric         AS ac_er,
        SUM(p.lpp_employee)::numeric        AS lpp_ee,
        SUM(p.lpp_employer)::numeric        AS lpp_er,
        SUM(p.laa_np_employee)::numeric     AS laa_np,
        SUM(p.laa_p_employer)::numeric      AS laa_p,
        SUM(p.ijm_employee)::numeric        AS ijm_ee,
        SUM(p.ijm_employer)::numeric        AS ijm_er,
        SUM(p.family_allowance)::numeric    AS fam_alloc,
        COUNT(p.id)::int                    AS month_count
      FROM employees e
      JOIN payslips p ON p.employee_id = e.id
      WHERE e.company_id = ${user.companyId} AND p.period_year = ${year}
      GROUP BY e.id, e.first_name, e.last_name, e.avs_number, e.birthdate,
               e.hire_date, e.end_date, e.contract_type, e.permit_type,
               e.activity_rate, e.weekly_hours, e.address, e.npa, e.city, e.salary_type
      ORDER BY e.last_name, e.first_name
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'EXPORT_ELM_XML',
      resourceType: 'elm_declaration',
      details: `ELM XML ${year} — ${employees.length} employés`,
      ipAddress: getIp(req),
    });

    // ── Helpers ────────────────────────────────────────────────
    const esc  = (s: string) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const fmt2 = (n: any)   => Number(n || 0).toFixed(2);
    const fmtD = (d: any)   => d ? new Date(d).toISOString().slice(0,10) : '';
    const now  = new Date().toISOString();
    const uid  = (co.uid || '').replace(/[^0-9]/g,'').padStart(9,'0');

    // ── Totaux entreprise ──────────────────────────────────────
    const totGross  = employees.reduce((s,e) => s + Number(e.annual_gross||0), 0);
    const totAvsEe  = employees.reduce((s,e) => s + Number(e.avs_ee||0), 0);
    const totAvsEr  = employees.reduce((s,e) => s + Number(e.avs_er||0), 0);
    const totAiEe   = employees.reduce((s,e) => s + Number(e.ai_ee||0), 0);
    const totAiEr   = employees.reduce((s,e) => s + Number(e.ai_er||0), 0);
    const totApgEe  = employees.reduce((s,e) => s + Number(e.apg_ee||0), 0);
    const totApgEr  = employees.reduce((s,e) => s + Number(e.apg_er||0), 0);
    const totAcEe   = employees.reduce((s,e) => s + Number(e.ac_ee||0), 0);
    const totAcEr   = employees.reduce((s,e) => s + Number(e.ac_er||0), 0);
    const totLppEe  = employees.reduce((s,e) => s + Number(e.lpp_ee||0), 0);
    const totLppEr  = employees.reduce((s,e) => s + Number(e.lpp_er||0), 0);
    const totLaaNp  = employees.reduce((s,e) => s + Number(e.laa_np||0), 0);
    const totLaaP   = employees.reduce((s,e) => s + Number(e.laa_p||0), 0);

    // ── Génération XML ELM 4.0 ─────────────────────────────────
    const empXML = employees.map(e => {
      const avsDecrypted = decrypt(e.avs_number) || '';
      const avsFormatted = avsDecrypted.replace(/[^0-9]/g,'');
      return `
    <Person>
      <PersonName>
        <FamilyName>${esc(e.last_name)}</FamilyName>
        <FirstName>${esc(e.first_name)}</FirstName>
      </PersonName>
      <BirthDate>${fmtD(e.birthdate)}</BirthDate>
      <OASI-AVS-AHV-Number>${avsFormatted}</OASI-AVS-AHV-Number>
      <Address>
        <Street>${esc(e.address||'')}</Street>
        <ZIP>${esc(e.npa||'')}</ZIP>
        <City>${esc(e.city||'')}</City>
        <Country>CH</Country>
      </Address>
      <Employment>
        <EntryDate>${fmtD(e.hire_date)}</EntryDate>
        ${e.end_date ? `<ExitDate>${fmtD(e.end_date)}</ExitDate>` : ''}
        <ActivityRate>${Number(e.activity_rate||100).toFixed(0)}</ActivityRate>
        <WeeklyHours>${Number(e.weekly_hours||42).toFixed(1)}</WeeklyHours>
        <ContractType>${esc(e.contract_type||'CDI')}</ContractType>
        <PermitType>${esc(e.permit_type||'CH')}</PermitType>
      </Employment>
      <Salary>
        <YearlyGross>${fmt2(e.annual_gross)}</YearlyGross>
        <MonthsWorked>${e.month_count}</MonthsWorked>
      </Salary>
      <AVS-AHV>
        <Employee>${fmt2(e.avs_ee)}</Employee>
        <Employer>${fmt2(e.avs_er)}</Employer>
      </AVS-AHV>
      <AI-IV>
        <Employee>${fmt2(e.ai_ee)}</Employee>
        <Employer>${fmt2(e.ai_er)}</Employer>
      </AI-IV>
      <APG-EO>
        <Employee>${fmt2(e.apg_ee)}</Employee>
        <Employer>${fmt2(e.apg_er)}</Employer>
      </APG-EO>
      <AC-ALV>
        <Employee>${fmt2(e.ac_ee)}</Employee>
        <Employer>${fmt2(e.ac_er)}</Employer>
      </AC-ALV>
      <LPP-BVG>
        <Employee>${fmt2(e.lpp_ee)}</Employee>
        <Employer>${fmt2(e.lpp_er)}</Employer>
      </LPP-BVG>
      <LAA-SUVA>
        <NP-NBU>${fmt2(e.laa_np)}</NP-NBU>
        <P-BU>${fmt2(e.laa_p)}</P-BU>
      </LAA-SUVA>
      <FamilyAllowance>${fmt2(e.fam_alloc)}</FamilyAllowance>
    </Person>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- SwissRH — ELM XML Swissdec 4.0 -->
<!-- Généré le ${now} par ${esc(user.email)} -->
<!-- CONFIDENTIEL — Usage interne uniquement -->
<ELM xmlns="http://www.swissdec.ch/schema/elm/SD_ELM_310"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.swissdec.ch/schema/elm/SD_ELM_310 SD_ELM_310.xsd">

  <Header>
    <Version>4.0</Version>
    <GeneratorName>SwissRH</GeneratorName>
    <GeneratorVersion>1.0</GeneratorVersion>
    <TransmissionDate>${now}</TransmissionDate>
    <TestIndicator>false</TestIndicator>
  </Header>

  <Employer>
    <CompanyName>${esc(co.name)} ${esc(co.legal_form||'')}</CompanyName>
    <UID-BFS>CHE-${uid.slice(0,3)}.${uid.slice(3,6)}.${uid.slice(6,9)}</UID-BFS>
    <Address>
      <Street>${esc(co.address||'')}</Street>
      <ZIP>${esc(co.npa||'')}</ZIP>
      <City>${esc(co.city||'')}</City>
      <Canton>${esc(co.canton||'')}</Canton>
      <Country>CH</Country>
    </Address>
    <AVS-CaisseNumber>${esc(co.avs_number||'')}</AVS-CaisseNumber>
    ${co.lpp_number ? `<LPP-InstitutionNumber>${esc(co.lpp_number)}</LPP-InstitutionNumber>` : ''}
    ${co.laa_number ? `<LAA-PolicyNumber>${esc(co.laa_number)}</LAA-PolicyNumber>` : ''}
  </Employer>

  <Year>${year}</Year>

  <Totals>
    <GrossSalary>${fmt2(totGross)}</GrossSalary>
    <Persons>${employees.length}</Persons>
    <AVS-AHV>
      <Employee>${fmt2(totAvsEe)}</Employee>
      <Employer>${fmt2(totAvsEr)}</Employer>
      <Total>${fmt2(totAvsEe + totAvsEr)}</Total>
    </AVS-AHV>
    <AI-IV>
      <Employee>${fmt2(totAiEe)}</Employee>
      <Employer>${fmt2(totAiEr)}</Employer>
    </AI-IV>
    <APG-EO>
      <Employee>${fmt2(totApgEe)}</Employee>
      <Employer>${fmt2(totApgEr)}</Employer>
    </APG-EO>
    <AC-ALV>
      <Employee>${fmt2(totAcEe)}</Employee>
      <Employer>${fmt2(totAcEr)}</Employer>
    </AC-ALV>
    <LPP-BVG>
      <Employee>${fmt2(totLppEe)}</Employee>
      <Employer>${fmt2(totLppEr)}</Employer>
    </LPP-BVG>
    <LAA-SUVA>
      <NP-NBU>${fmt2(totLaaNp)}</NP-NBU>
      <P-BU>${fmt2(totLaaP)}</P-BU>
    </LAA-SUVA>
  </Totals>

  <Persons>${empXML}
  </Persons>

</ELM>`;

    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Content-Disposition', `attachment; filename="swissrh-elm-${year}-${co.name.replace(/\s+/g,'_')}.xml"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(xml);

  } catch (e: any) {
    console.error('[ELM]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2. GET /api/salary/lohnausweis/:employeeId/:year/pdf
//    Lohnausweis PDF officiel — 15 cases Swissdec
// ═══════════════════════════════════════════════════════════════
elmRouter.get('/lohnausweis/:employeeId/:year/pdf', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const empId = Number(req.params.employeeId);
  const year  = Number(req.params.year);

  try {
    // ── Données employé ────────────────────────────────────────
    const [emp] = await sql`
      SELECT e.*, c.name as company_name, c.legal_form, c.address as co_address,
             c.npa as co_npa, c.city as co_city, c.canton, c.uid, c.avs_number as co_avs
      FROM employees e
      JOIN companies c ON c.id = e.company_id
      WHERE e.id = ${empId} AND e.company_id = ${user.companyId}
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    // ── Cumuls annuels ─────────────────────────────────────────
    const [totals] = await sql`
      SELECT
        SUM(gross_salary)::numeric        AS gross,
        SUM(net_salary)::numeric          AS net,
        SUM(avs_employee)::numeric        AS avs_ee,
        SUM(ai_employee)::numeric         AS ai_ee,
        SUM(apg_employee)::numeric        AS apg_ee,
        SUM(ac_employee)::numeric         AS ac_ee,
        SUM(lpp_employee)::numeric        AS lpp_ee,
        SUM(lpp_employer)::numeric        AS lpp_er,
        SUM(laa_np_employee)::numeric     AS laa_np,
        SUM(ijm_employee)::numeric        AS ijm_ee,
        SUM(ijm_employer)::numeric        AS ijm_er,
        SUM(family_allowance)::numeric    AS fam,
        SUM(vacation_indemnity)::numeric  AS vac_ind,
        SUM(bonus)::numeric               AS bonus,
        SUM(other_deductions)::numeric    AS other_ded,
        SUM(total_deductions)::numeric    AS total_ded,
        COUNT(*)::int                     AS months,
        MIN(period_month)::int            AS first_month,
        MAX(period_month)::int            AS last_month
      FROM payslips
      WHERE employee_id = ${empId} AND company_id = ${user.companyId} AND period_year = ${year}
    `;

    if (!totals || totals.months === 0) {
      return res.status(404).json({ error: `Aucun bulletin trouvé pour ${year}` });
    }

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'EXPORT_LOHNAUSWEIS',
      resourceType: 'lohnausweis',
      resourceId: empId,
      details: `Lohnausweis ${year} — ${emp.first_name} ${emp.last_name}`,
      ipAddress: getIp(req),
    });

    // ══════════════════════════════════════════════════════════
    // PDFKit — Lohnausweis officiel A4
    // ══════════════════════════════════════════════════════════
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="lohnausweis-${emp.last_name}-${year}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    doc.pipe(res);

    const fmt = (n: any) => Number(n||0).toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const avsDecrypted = decrypt(emp.avs_number) || '';

    // ── Couleurs ─────────────────────────────────────────────
    const DARK   = '#1a2332';
    const BLUE   = '#1a56db';
    const LGRAY  = '#f3f5f8';
    const GRAY   = '#6b7280';
    const BORDER = '#d1d5db';
    const RED    = '#dc2626';
    const M  = 35;
    const W  = 525; // 595 - 2*35

    // ══ HEADER ═══════════════════════════════════════════════
    doc.rect(0, 0, 595, 56).fill(DARK);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff')
       .text('Certificat de salaire', M, 14);
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.6)')
       .text('Lohnausweis / Attestation de salaire · Swissdec 2025', M, 36);

    // Badge année
    doc.roundedRect(595 - M - 70, 12, 70, 32, 6).fill(BLUE);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff')
       .text(String(year), 595 - M - 65, 20, { width: 60, align: 'center' });

    let y = 66;

    // ══ EMPLOYEUR / EMPLOYÉ ═══════════════════════════════════
    const halfW = (W - 10) / 2;

    // Box employeur
    doc.rect(M, y, halfW, 68).fill(LGRAY).stroke(BORDER);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('EMPLOYEUR', M + 8, y + 8);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
       .text(`${emp.company_name} ${emp.legal_form||''}`.trim(), M + 8, y + 20, { width: halfW - 16 });
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text(`${emp.co_address||''}`, M + 8, y + 36, { width: halfW - 16 })
       .text(`${emp.co_npa||''} ${emp.co_city||''} · Canton ${emp.canton||''}`, M + 8, y + 47)
       .text(`N° AVS caisse: ${emp.co_avs||'—'}`, M + 8, y + 58);

    // Box employé
    const ex2 = M + halfW + 10;
    doc.rect(ex2, y, halfW, 68).fill(LGRAY).stroke(BORDER);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY).text('EMPLOYÉ(E)', ex2 + 8, y + 8);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
       .text(`${emp.first_name} ${emp.last_name}`, ex2 + 8, y + 20);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text(`${emp.address||''}`, ex2 + 8, y + 33, { width: halfW - 16 })
       .text(`${emp.npa||''} ${emp.city||''}`, ex2 + 8, y + 44)
       .text(`N° AVS: ${avsDecrypted}`, ex2 + 8, y + 55);

    y += 78;

    // ══ Période d'activité ════════════════════════════════════
    doc.rect(M, y, W, 22).fill(BLUE);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff').text('PÉRIODE', M + 8, y + 7);
    const mNames = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    const periodeStr = totals.first_month === 1 && totals.last_month === 12
      ? `Année complète ${year}`
      : `${mNames[totals.first_month-1]} → ${mNames[totals.last_month-1]} ${year} (${totals.months} mois)`;
    doc.fontSize(9).font('Helvetica').fillColor('#fff').text(periodeStr, M + 70, y + 7);

    const actLabel = `${emp.activity_rate}% · ${emp.weekly_hours}h/sem · ${emp.contract_type}`;
    doc.fontSize(8).fillColor('rgba(255,255,255,.75)').text(actLabel, M + 300, y + 7, { width: 220, align: 'right' });
    y += 28;

    // ══ Cases Lohnausweis 1–15 ════════════════════════════════
    // Helper: case avec numéro officiel
    const caseRow = (num: string, label: string, amount: string|null, yPos: number,
      opts: { bold?: boolean; bg?: string; indent?: number; sub?: string } = {}) => {
      const bg = opts.bg || (parseInt(num) % 2 === 0 ? '#fafbfc' : '#ffffff');
      doc.rect(M, yPos, W, 18).fill(bg);
      doc.moveTo(M, yPos + 18).lineTo(M + W, yPos + 18).stroke(BORDER);

      // Numéro de case (cercle bleu)
      if (num) {
        doc.circle(M + 11, yPos + 9, 8).fill(BLUE);
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff')
           .text(num, M + 4, yPos + 5, { width: 16, align: 'center' });
      }

      // Label
      const indent = opts.indent || 0;
      doc.fontSize(opts.bold ? 8.5 : 8)
         .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(DARK)
         .text(label, M + 26 + indent, yPos + 5, { width: W - 130 });

      if (opts.sub) {
        doc.fontSize(7).font('Helvetica').fillColor(GRAY)
           .text(opts.sub, M + 26 + indent, yPos + 14, { width: W - 130 });
      }

      // Montant
      if (amount !== null) {
        doc.fontSize(opts.bold ? 9 : 8)
           .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fillColor(opts.bold ? DARK : GRAY)
           .text(`CHF ${amount}`, M + W - 95, yPos + 5, { width: 90, align: 'right' });
      }
      return yPos + 18;
    };

    const divider = (title: string, yPos: number) => {
      doc.rect(M, yPos, W, 14).fill('#e5e7eb');
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
         .text(title.toUpperCase(), M + 8, yPos + 4);
      return yPos + 14;
    };

    // ── Revenus ───────────────────────────────────────────────
    y = divider('Revenus soumis aux assurances sociales', y);
    y = caseRow('1',  'Salaire mensuel brut', fmt(totals.gross), y);
    y = caseRow('',  'dont indemnités vacances', fmt(totals.vac_ind), y, { indent: 12, sub: 'Inclus dans case 1' });
    y = caseRow('',  'dont bonus / gratifications', fmt(totals.bonus), y, { indent: 12, sub: 'Inclus dans case 1' });
    y = caseRow('2',  'Allocations familiales', fmt(totals.fam), y);

    // ── Déductions ────────────────────────────────────────────
    y = divider('Cotisations assurances sociales (part salarié)', y);
    y = caseRow('9',  'AVS / AI / APG', fmt(Number(totals.avs_ee||0) + Number(totals.ai_ee||0) + Number(totals.apg_ee||0)), y);
    y = caseRow('10', 'AC (Assurance chômage)', fmt(totals.ac_ee), y);
    y = caseRow('11', 'NBUV / LAA non-prof. (part salarié)', fmt(totals.laa_np), y);
    y = caseRow('12', 'KTG / IJM — indemnité perte gain', fmt(Number(totals.ijm_ee||0) + Number(totals.ijm_er||0)), y,
      { sub: 'Part employé + employeur' });
    y = caseRow('13', 'LPP / 2e pilier (part salarié)', fmt(totals.lpp_ee), y);
    y = caseRow('',  'LPP / 2e pilier (part employeur)', fmt(totals.lpp_er), y,
      { indent: 12, sub: 'Information — pas déduit du salaire net' });

    // ── Net ───────────────────────────────────────────────────
    y = divider('Résultat net', y);
    doc.rect(M, y, W, 22).fill(DARK);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff').text('NET IMPOSABLE (case 11)', M + 8, y + 7);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff')
       .text(`CHF ${fmt(totals.net)}`, M + W - 110, y + 5, { width: 105, align: 'right' });
    y += 28;

    // ── Cases diverses ────────────────────────────────────────
    y = divider('Informations complémentaires', y);
    y = caseRow('3',  'Prestations en nature', 'voir annexe', y, { amount: null } as any);
    y = caseRow('4',  'Participations de collaborateur', '—', y);
    y = caseRow('5',  'Indemnités de départ (CO 339b)', '—', y);
    y = caseRow('6',  'Indemnité de service militaire (APG)', '—', y);
    y = caseRow('7',  'Autre prestation appréciable en argent', '—', y);
    y = caseRow('8',  'Remboursement de frais', '—', y);
    y = caseRow('14', 'Autres déductions', fmt(totals.other_ded), y);
    y = caseRow('15', 'Remarques', '—', y);
    y += 12;

    // ══ SIGNATURE ════════════════════════════════════════════
    if (y < 680) {
      doc.moveTo(M, y).lineTo(M + W, y).stroke(BORDER);
      y += 12;
      doc.fontSize(8).font('Helvetica').fillColor(GRAY)
         .text(`Lieu et date de l'établissement: ${emp.co_city||''}, ${new Date().toLocaleDateString('fr-CH')}`, M, y);
      y += 20;

      // Lignes signature
      const sigW = 160;
      doc.moveTo(M, y + 20).lineTo(M + sigW, y + 20).stroke(DARK);
      doc.moveTo(M + 220, y + 20).lineTo(M + 220 + sigW, y + 20).stroke(DARK);
      doc.fontSize(7).font('Helvetica').fillColor(GRAY)
         .text('Signature employeur', M, y + 22)
         .text('Signature employé(e)', M + 220, y + 22);
      y += 40;
    }

    // ══ FOOTER ═══════════════════════════════════════════════
    doc.rect(0, 800, 595, 42).fill(DARK);
    doc.fontSize(7).font('Helvetica').fillColor('rgba(255,255,255,.4)')
       .text(`SwissRH · Lohnausweis ${year} · ${emp.first_name} ${emp.last_name} · Généré ${new Date().toLocaleDateString('fr-CH')} · CONFIDENTIEL`,
         M, 813, { width: W, align: 'center' });
    doc.fontSize(6.5).fillColor('rgba(255,255,255,.25)')
       .text('Ce certificat de salaire est établi selon les directives de la Conférence des directrices et directeurs cantonaux des finances (CDF). Swissdec 2025.',
         M, 825, { width: W, align: 'center' });

    doc.end();

  } catch (e: any) {
    console.error('[LOHNAUSWEIS]', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. GET /api/salary/lohnausweis/batch/:year — Tous les employés
//    Retourne la liste des employés pour batch download frontend
// ═══════════════════════════════════════════════════════════════
elmRouter.get('/lohnausweis/batch/:year', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const year = Number(req.params.year);

  try {
    const employees = await sql`
      SELECT DISTINCT e.id, e.first_name, e.last_name,
             COUNT(p.id)::int as month_count
      FROM employees e
      JOIN payslips p ON p.employee_id = e.id
      WHERE e.company_id = ${user.companyId} AND p.period_year = ${year}
      GROUP BY e.id, e.first_name, e.last_name
      ORDER BY e.last_name, e.first_name
    `;
    res.json({ ok: true, year, employees });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
