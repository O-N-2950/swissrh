/**
 * SWISSRH — Swissdec 5.0
 * ============================================================
 * GET  /api/swissdec/elm5?year=&month=   — génère ELM 5.0 XML
 * GET  /api/swissdec/validate?year=      — valide structure ELM
 * POST /api/swissdec/submit?year=&month= — soumet + enregistre
 * GET  /api/swissdec/history             — historique soumissions
 *
 * ELM 5.0 vs ELM 4.0 :
 *  - Schéma namespace sd5 (nouveau)
 *  - Champ IS (impôt à la source) par employé
 *  - Statut civil + nationalité + frontaliers
 *  - 13e mois et allocations cantonales séparées
 *  - Période mensuelle OU annuelle
 *  - Version 5.0 dans le header
 * ============================================================
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager, type JwtPayload } from '../auth/middleware.js';
import { decrypt } from '../utils/encryption.js';
import { audit, getIp } from '../utils/audit-log.js';

export const swissdec5Router = Router();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const esc  = (s: string) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt2 = (n: any)    => Number(n||0).toFixed(2);
const fmtD = (d: any)    => d ? new Date(d).toISOString().slice(0,10) : '';

function buildElm5Header(companyId: number, year: number, month: number|null, now: string) {
  return `
  <sd:Header>
    <sd:Version>5.0</sd:Version>
    <sd:GeneratorName>SwissRH</sd:GeneratorName>
    <sd:GeneratorVersion>2.0</sd:GeneratorVersion>
    <sd:TransmissionDate>${now}</sd:TransmissionDate>
    <sd:DeclarationType>${month ? 'Monthly' : 'Annual'}</sd:DeclarationType>
    ${month ? `<sd:DeclarationMonth>${String(month).padStart(2,'0')}.${year}</sd:DeclarationMonth>` : `<sd:DeclarationYear>${year}</sd:DeclarationYear>`}
    <sd:TestIndicator>false</sd:TestIndicator>
  </sd:Header>`;
}

// ─────────────────────────────────────────────────────────────
// GET /api/swissdec/elm5?year=&month=
// ─────────────────────────────────────────────────────────────
swissdec5Router.get('/elm5', requireManager, async (req, res) => {
  const user  = (req as any).user as JwtPayload;
  const sql   = getSQL();
  const year  = Number(req.query.year  || new Date().getFullYear());
  const month = req.query.month ? Number(req.query.month) : null;

  try {
    const [co] = await sql`
      SELECT name, legal_form, uid, address, npa, city, canton,
             avs_number, lpp_number, laa_number, ijm_rate
      FROM companies WHERE id = ${user.companyId}
    `;
    if (!co) return res.status(404).json({ error: 'Entreprise introuvable' });

    // Données employés selon période
    const employees = await sql`
      SELECT
        e.id, e.first_name, e.last_name, e.avs_number, e.birthdate,
        e.hire_date, e.end_date, e.contract_type, e.permit_type,
        e.activity_rate, e.weekly_hours, e.address, e.npa, e.city,
        e.nationality, e.civil_status, e.children_count,
        e.is_cross_border, e.work_canton, e.residence_canton,
        e.tax_at_source, e.tax_at_source_code,
        SUM(p.gross_salary)::numeric       AS gross,
        SUM(p.net_salary)::numeric         AS net,
        SUM(p.avs_employee)::numeric       AS avs_ee,
        SUM(p.avs_employer)::numeric       AS avs_er,
        SUM(p.ai_employee)::numeric        AS ai_ee,
        SUM(p.ai_employer)::numeric        AS ai_er,
        SUM(p.apg_employee)::numeric       AS apg_ee,
        SUM(p.apg_employer)::numeric       AS apg_er,
        SUM(p.ac_employee)::numeric        AS ac_ee,
        SUM(p.ac_employer)::numeric        AS ac_er,
        SUM(p.lpp_employee)::numeric       AS lpp_ee,
        SUM(p.lpp_employer)::numeric       AS lpp_er,
        SUM(p.laa_np_employee)::numeric    AS laa_np,
        SUM(p.laa_p_employer)::numeric     AS laa_p,
        SUM(p.ijm_employee)::numeric       AS ijm_ee,
        SUM(p.ijm_employer)::numeric       AS ijm_er,
        SUM(p.family_allowance)::numeric   AS fam_alloc,
        COALESCE(SUM(p.source_tax_amount)::numeric, 0) AS is_amount,
        COALESCE(SUM(p.thirteenth_month)::numeric, 0)  AS thirteenth,
        COUNT(p.id)::int                   AS month_count
      FROM employees e
      JOIN payslips p ON p.employee_id = e.id
      WHERE e.company_id = ${user.companyId}
        AND p.period_year = ${year}
        ${month ? sql`AND p.period_month = ${month}` : sql``}
      GROUP BY e.id, e.first_name, e.last_name, e.avs_number, e.birthdate,
               e.hire_date, e.end_date, e.contract_type, e.permit_type,
               e.activity_rate, e.weekly_hours, e.address, e.npa, e.city,
               e.nationality, e.civil_status, e.children_count,
               e.is_cross_border, e.work_canton, e.residence_canton,
               e.tax_at_source, e.tax_at_source_code
      ORDER BY e.last_name, e.first_name
    `;

    audit({
      userId: user.userId, userEmail: user.email, userRole: user.role,
      companyId: user.companyId, action: 'EXPORT_ELM_XML',
      resourceType: 'swissdec5', details: `ELM 5.0 ${year}${month?'/'+month:''}`,
      ipAddress: getIp(req),
    });

    const now = new Date().toISOString();
    const uid = (co.uid||'').replace(/[^0-9]/g,'').padStart(9,'0');

    // Totaux
    const T = (f: string) => employees.reduce((s,e) => s + Number((e as any)[f]||0), 0);

    const empXML = employees.map((e: any) => {
      const avs = decrypt(e.avs_number)||'';
      return `
    <sd:Person>
      <sd:PersonIdentification>
        <sd:FamilyName>${esc(e.last_name)}</sd:FamilyName>
        <sd:FirstName>${esc(e.first_name)}</sd:FirstName>
        <sd:BirthDate>${fmtD(e.birthdate)}</sd:BirthDate>
        <sd:OASI-AVS-AHV>${avs.replace(/[^0-9]/g,'')}</sd:OASI-AVS-AHV>
        <sd:Nationality>${esc(e.nationality||'CH')}</sd:Nationality>
        <sd:CivilStatus>${esc(e.civil_status||'single')}</sd:CivilStatus>
        <sd:NumberOfChildren>${e.children_count||0}</sd:NumberOfChildren>
      </sd:PersonIdentification>
      <sd:Address>
        <sd:Street>${esc(e.address||'')}</sd:Street>
        <sd:ZIP>${esc(e.npa||'')}</sd:ZIP>
        <sd:City>${esc(e.city||'')}</sd:City>
        <sd:Country>CH</sd:Country>
      </sd:Address>
      <sd:Employment>
        <sd:EntryDate>${fmtD(e.hire_date)}</sd:EntryDate>
        ${e.end_date ? `<sd:ExitDate>${fmtD(e.end_date)}</sd:ExitDate>` : ''}
        <sd:ActivityRate>${Number(e.activity_rate||100).toFixed(0)}</sd:ActivityRate>
        <sd:WeeklyHours>${Number(e.weekly_hours||42).toFixed(1)}</sd:WeeklyHours>
        <sd:ContractType>${esc(e.contract_type||'CDI')}</sd:ContractType>
        <sd:ResidencePermit>${esc(e.permit_type||'CH')}</sd:ResidencePermit>
        ${e.is_cross_border ? '<sd:CrossBorderCommuter>true</sd:CrossBorderCommuter>' : ''}
        ${e.work_canton      ? `<sd:WorkCanton>${esc(e.work_canton)}</sd:WorkCanton>` : ''}
        ${e.residence_canton ? `<sd:ResidenceCanton>${esc(e.residence_canton)}</sd:ResidenceCanton>` : ''}
      </sd:Employment>
      <sd:Salary>
        <sd:GrossSalary>${fmt2(e.gross)}</sd:GrossSalary>
        ${e.thirteenth > 0 ? `<sd:ThirteenthMonth>${fmt2(e.thirteenth)}</sd:ThirteenthMonth>` : ''}
        <sd:FamilyAllowance>${fmt2(e.fam_alloc)}</sd:FamilyAllowance>
        <sd:NetSalary>${fmt2(e.net)}</sd:NetSalary>
        <sd:MonthsWorked>${e.month_count}</sd:MonthsWorked>
      </sd:Salary>
      <sd:SocialInsurances>
        <sd:AVS-AHV>
          <sd:Employee>${fmt2(e.avs_ee)}</sd:Employee>
          <sd:Employer>${fmt2(e.avs_er)}</sd:Employer>
        </sd:AVS-AHV>
        <sd:AI-IV>
          <sd:Employee>${fmt2(e.ai_ee)}</sd:Employee>
          <sd:Employer>${fmt2(e.ai_er)}</sd:Employer>
        </sd:AI-IV>
        <sd:APG-EO>
          <sd:Employee>${fmt2(e.apg_ee)}</sd:Employee>
          <sd:Employer>${fmt2(e.apg_er)}</sd:Employer>
        </sd:APG-EO>
        <sd:AC-ALV>
          <sd:Employee>${fmt2(e.ac_ee)}</sd:Employee>
          <sd:Employer>${fmt2(e.ac_er)}</sd:Employer>
        </sd:AC-ALV>
        <sd:LPP-BVG>
          <sd:Employee>${fmt2(e.lpp_ee)}</sd:Employee>
          <sd:Employer>${fmt2(e.lpp_er)}</sd:Employer>
        </sd:LPP-BVG>
        <sd:LAA-SUVA>
          <sd:NP-NBU>${fmt2(e.laa_np)}</sd:NP-NBU>
          <sd:P-BU>${fmt2(e.laa_p)}</sd:P-BU>
        </sd:LAA-SUVA>
        <sd:IJM>
          <sd:Employee>${fmt2(e.ijm_ee)}</sd:Employee>
          <sd:Employer>${fmt2(e.ijm_er)}</sd:Employer>
        </sd:IJM>
      </sd:SocialInsurances>
      ${e.tax_at_source ? `
      <sd:SourceTax>
        <sd:TaxableAmount>${fmt2(e.gross)}</sd:TaxableAmount>
        <sd:TaxCode>${esc(e.tax_at_source_code||'A0')}</sd:TaxCode>
        <sd:TaxAmount>${fmt2(e.is_amount)}</sd:TaxAmount>
      </sd:SourceTax>` : ''}
    </sd:Person>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- SwissRH — ELM 5.0 Swissdec — ${now} -->
<!-- Entreprise: ${esc(co.name)} | Période: ${year}${month?'/'+month:''} -->
<!-- CONFIDENTIEL -->
<sd:ELM
  xmlns:sd="http://www.swissdec.ch/schema/elm/SD_ELM_500"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.swissdec.ch/schema/elm/SD_ELM_500 SD_ELM_500.xsd">

${buildElm5Header(user.companyId, year, month, now)}

  <sd:Employer>
    <sd:CompanyName>${esc(co.name)} ${esc(co.legal_form||'')}</sd:CompanyName>
    <sd:UID-BFS>CHE-${uid.slice(0,3)}.${uid.slice(3,6)}.${uid.slice(6,9)}</sd:UID-BFS>
    <sd:Address>
      <sd:Street>${esc(co.address||'')}</sd:Street>
      <sd:ZIP>${esc(co.npa||'')}</sd:ZIP>
      <sd:City>${esc(co.city||'')}</sd:City>
      <sd:Canton>${esc(co.canton||'')}</sd:Canton>
      <sd:Country>CH</sd:Country>
    </sd:Address>
    <sd:Institutions>
      <sd:AVS>${esc(co.avs_number||'')}</sd:AVS>
      ${co.lpp_number ? `<sd:LPP>${esc(co.lpp_number)}</sd:LPP>` : ''}
      ${co.laa_number ? `<sd:LAA>${esc(co.laa_number)}</sd:LAA>` : ''}
    </sd:Institutions>
  </sd:Employer>

  <sd:Totals>
    <sd:Persons>${employees.length}</sd:Persons>
    <sd:GrossSalary>${fmt2(T('gross'))}</sd:GrossSalary>
    <sd:NetSalary>${fmt2(T('net'))}</sd:NetSalary>
    <sd:AVS-AHV>
      <sd:Employee>${fmt2(T('avs_ee'))}</sd:Employee>
      <sd:Employer>${fmt2(T('avs_er'))}</sd:Employer>
    </sd:AVS-AHV>
    <sd:AC-ALV>
      <sd:Employee>${fmt2(T('ac_ee'))}</sd:Employee>
      <sd:Employer>${fmt2(T('ac_er'))}</sd:Employer>
    </sd:AC-ALV>
    <sd:LPP-BVG>
      <sd:Employee>${fmt2(T('lpp_ee'))}</sd:Employee>
      <sd:Employer>${fmt2(T('lpp_er'))}</sd:Employer>
    </sd:LPP-BVG>
    <sd:SourceTaxTotal>${fmt2(T('is_amount'))}</sd:SourceTaxTotal>
  </sd:Totals>

  <sd:Persons>${empXML}
  </sd:Persons>

</sd:ELM>`;

    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="swissrh-elm5-${year}${month?'-'+String(month).padStart(2,'0'):''}.xml"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(xml);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/swissdec/validate?year= — validation heuristique ELM
// ─────────────────────────────────────────────────────────────
swissdec5Router.get('/validate', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const year = Number(req.query.year || new Date().getFullYear());

  try {
    const issues: { severity: string; field: string; message: string }[] = [];

    // Vérifier AVS manquants
    const noAvs = await sql`
      SELECT id, first_name, last_name FROM employees
      WHERE company_id = ${user.companyId} AND is_active = true
        AND (avs_number IS NULL OR avs_number = '')
    `;
    for (const e of noAvs) {
      issues.push({ severity:'error', field:`employee#${e.id}`, message:`${e.first_name} ${e.last_name} — N° AVS manquant` });
    }

    // Vérifier UID entreprise
    const [co] = await sql`SELECT uid, avs_number FROM companies WHERE id = ${user.companyId}`;
    if (!co?.uid) issues.push({ severity:'error',   field:'company.uid',        message:'UID entreprise (CHE-xxx) manquant' });
    if (!co?.avs_number) issues.push({ severity:'warning', field:'company.avs_number', message:'N° caisse AVS entreprise manquant' });

    // Vérifier bulletins
    const [payCount] = await sql`
      SELECT COUNT(*)::int as cnt FROM payslips
      WHERE company_id = ${user.companyId} AND period_year = ${year}
    `;
    if (payCount?.cnt === 0) {
      issues.push({ severity:'warning', field:`payslips.${year}`, message:`Aucun bulletin trouvé pour ${year}` });
    }

    // Employés actifs sans bulletin cette année
    const noPay = await sql`
      SELECT e.first_name, e.last_name FROM employees e
      WHERE e.company_id = ${user.companyId} AND e.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM payslips p WHERE p.employee_id = e.id AND p.period_year = ${year}
        )
    `;
    for (const e of noPay) {
      issues.push({ severity:'info', field:'payslips', message:`${e.first_name} ${e.last_name} — aucun bulletin ${year}` });
    }

    const isValid = !issues.some(i => i.severity === 'error');
    res.json({
      ok: true, year, isValid,
      errors:   issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      infos:    issues.filter(i => i.severity === 'info').length,
      issues,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/swissdec/submit?year=&month=
// Enregistre la soumission en DB (sans envoi réseau Swissdec)
// ─────────────────────────────────────────────────────────────
swissdec5Router.post('/submit', requireManager, async (req, res) => {
  const user  = (req as any).user as JwtPayload;
  const sql   = getSQL();
  const year  = Number(req.query.year  || new Date().getFullYear());
  const month = req.query.month ? Number(req.query.month) : null;

  try {
    // On génère juste le XML et l'enregistre en DB
    const [sub] = await sql`
      INSERT INTO swissdec_submissions
        (company_id, year, month, declaration_type, status, submitted_by)
      VALUES (
        ${user.companyId}, ${year}, ${month||null},
        ${month ? 'monthly' : 'annual'}, 'pending', ${user.userId}
      )
      RETURNING *
    `;
    res.json({
      ok: true, submission: sub,
      message: `Déclaration ELM 5.0 ${year}${month?'/'+month:''} enregistrée — soumission manuelle via portail Swissdec`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/swissdec/history
// ─────────────────────────────────────────────────────────────
swissdec5Router.get('/history', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  try {
    const history = await sql`
      SELECT s.*, u.email as submitted_by_email
      FROM swissdec_submissions s
      LEFT JOIN users u ON u.id = s.submitted_by
      WHERE s.company_id = ${user.companyId}
      ORDER BY s.submitted_at DESC LIMIT 50
    `;
    res.json({ ok: true, history });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
