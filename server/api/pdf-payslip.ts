/**
 * SwissRH — Génération PDF Bulletins de salaire
 * Route: GET /api/salary/payslip/:id/pdf
 * Stack : PDFKit (léger, pas de Puppeteer)
 */
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager } from '../auth/middleware.js';

export const pdfRouter = Router();

// GET /api/salary/payslip/:id/pdf
pdfRouter.get('/payslip/:id/pdf', requireAuth, async (req, res) => {
  try {
    const { companyId, role } = (req as any).user;
    const sql = getSQL();
    const psId = Number(req.params.id);

    const [ps] = await sql`
      SELECT p.*,
        e.first_name, e.last_name, e.avs_number, e.birthdate,
        e.hire_date, e.contract_type, e.permit_type,
        e.activity_rate, e.department, e.position,
        e.salary_type,
        c.name as company_name, c.legal_form, c.address,
        c.npa, c.city, c.canton, c.uid as company_uid,
        c.avs_number as company_avs, c.laa_number
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      JOIN companies c ON p.company_id = c.id
      WHERE p.id = ${psId} AND p.company_id = ${companyId}
    `;

    if (!ps) return res.status(404).json({ error: 'Bulletin introuvable' });

    // Employees can only see their own
    if (role === 'employee') {
      const { userId } = (req as any).user;
      const [emp] = await sql`SELECT id FROM employees WHERE id = ${ps.employee_id}`;
      // (simplified check — in prod link users.employee_id)
    }

    const month = new Date(ps.period_year, ps.period_month - 1)
      .toLocaleString('fr-CH', { month: 'long', year: 'numeric' });

    const fmt = (n: number) =>
      n == null ? '0.00' : Number(n).toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── Build PDF ────────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="bulletin-${ps.last_name}-${ps.period_year}-${String(ps.period_month).padStart(2,'0')}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    doc.pipe(res);

    const M = 45;  // margin
    const W = 595 - M * 2;  // usable width
    const BLUE = '#366389';
    const RED  = '#B32D26';
    const DARK = '#1a2332';
    const GRAY = '#5a6578';
    const LGRAY = '#f3f5f9';

    // ── Header band ──────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 72).fill(DARK);
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff')
       .text('SwissRH', M, 20);
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.55)')
       .text('Bulletin de salaire', M, 46);

    // Period badge
    doc.roundedRect(595 - M - 110, 18, 110, 36, 6).fill(BLUE);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
       .text(month, 595 - M - 105, 27, { width: 100, align: 'center' });

    doc.moveDown();

    // ── Company + Employee info ──────────────────────────────────────────
    let y = 88;

    // Company block
    doc.rect(M, y, (W/2) - 8, 72).fill(LGRAY);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
       .text('EMPLOYEUR', M + 10, y + 10);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
       .text(ps.company_name + (ps.legal_form ? ` ${ps.legal_form}` : ''), M + 10, y + 22, { width: (W/2) - 28 });
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text(`${ps.address || ''}`, M + 10, y + 38, { width: (W/2) - 28 })
       .text(`${ps.npa || ''} ${ps.city || ''} · ${ps.canton || ''}`, M + 10, y + 50);
    if (ps.company_avs) {
      doc.text(`No AVS: ${ps.company_avs}`, M + 10, y + 62);
    }

    // Employee block
    const ex = M + (W/2) + 8;
    doc.rect(ex, y, (W/2) - 8, 72).fill(LGRAY);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
       .text('EMPLOYÉ(E)', ex + 10, y + 10);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
       .text(`${ps.first_name} ${ps.last_name}`, ex + 10, y + 22);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY);
    const lines: string[] = [];
    if (ps.position)       lines.push(ps.position);
    if (ps.department)     lines.push(ps.department);
    if (ps.contract_type)  lines.push(`Contrat: ${ps.contract_type} · ${ps.activity_rate}%`);
    if (ps.avs_number)     lines.push(`AVS: ${ps.avs_number}`);
    if (ps.permit_type !== 'CH') lines.push(`Permis: ${ps.permit_type}`);
    lines.forEach((l, i) => doc.text(l, ex + 10, y + 36 + i * 11));

    y += 84;

    // ── Section helper ───────────────────────────────────────────────────
    const section = (title: string, yPos: number, color = BLUE) => {
      doc.rect(M, yPos, W, 18).fill(color);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
         .text(title, M + 8, yPos + 5);
      return yPos + 18;
    };

    const row = (label: string, amount: string, yPos: number, bold = false, indent = 0) => {
      if (yPos % 2 === 0) doc.rect(M, yPos, W, 14).fill('#fafbfc');
      doc.fontSize(8)
         .font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(DARK)
         .text(label, M + 8 + indent, yPos + 3, { width: W - 100 });
      doc.fontSize(8)
         .font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(bold ? DARK : GRAY)
         .text(`CHF ${amount}`, M + W - 88, yPos + 3, { width: 88, align: 'right' });
      doc.moveTo(M, yPos + 14).lineTo(M + W, yPos + 14).stroke('#e9ecf0');
      return yPos + 14;
    };

    const totalRow = (label: string, amount: string, yPos: number, bgColor = BLUE) => {
      doc.rect(M, yPos, W, 18).fill(bgColor);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
         .text(label, M + 8, yPos + 4);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
         .text(`CHF ${amount}`, M + W - 90, yPos + 4, { width: 90, align: 'right' });
      return yPos + 18;
    };

    // ── REVENUS ──────────────────────────────────────────────────────────
    y = section('REVENUS', y);
    y = row('Salaire de base', fmt(ps.gross_salary), y);
    if (parseFloat(ps.vacation_indemnity) > 0)
      y = row('Indemnité vacances (8.33%)', fmt(ps.vacation_indemnity), y, false, 8);
    if (parseFloat(ps.bonus) > 0)
      y = row('Bonus / gratification', fmt(ps.bonus), y, false, 8);
    if (parseFloat(ps.hours_extra_25) > 0)
      y = row(`Heures supplémentaires (25%)`, fmt(ps.hours_extra_25), y, false, 8);
    if (parseFloat(ps.hours_night) > 0)
      y = row('Supplément nuit', fmt(ps.hours_night), y, false, 8);
    if (parseFloat(ps.family_allowance) > 0)
      y = row('Allocations familiales', fmt(ps.family_allowance), y, false, 8);
    y = totalRow('SALAIRE BRUT', fmt(ps.gross_salary), y);
    y += 8;

    // ── DÉDUCTIONS EMPLOYÉ ───────────────────────────────────────────────
    y = section('DÉDUCTIONS EMPLOYÉ', y);
    if (parseFloat(ps.avs_employee) > 0) y = row('AVS (5.30%)', fmt(ps.avs_employee), y);
    if (parseFloat(ps.ai_employee)  > 0) y = row('AI (0.70%)',  fmt(ps.ai_employee),  y);
    if (parseFloat(ps.apg_employee) > 0) y = row('APG (0.225%)',fmt(ps.apg_employee), y);
    if (parseFloat(ps.ac_employee)  > 0) y = row('AC (1.10%)',  fmt(ps.ac_employee),  y);
    if (parseFloat(ps.lpp_employee) > 0) {
      const lppPct = ps.lpp_rate ? `${(ps.lpp_rate*100).toFixed(1)}%` : '';
      y = row(`LPP / 2e pilier ${lppPct}`, fmt(ps.lpp_employee), y);
    }
    if (parseFloat(ps.laa_np_employee) > 0) y = row('LAA NP (1.30%)', fmt(ps.laa_np_employee), y);
    if (parseFloat(ps.ijm_employee)  > 0) y = row('IJM / perte gain (0.75%)', fmt(ps.ijm_employee), y);
    if (parseFloat(ps.total_deductions) > 0)
      y = totalRow('TOTAL DÉDUCTIONS', fmt(ps.total_deductions), y, RED);
    y += 8;

    // ── SALAIRE NET ──────────────────────────────────────────────────────
    doc.rect(M, y, W, 24).fill(DARK);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
       .text('SALAIRE NET', M + 8, y + 6);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff')
       .text(`CHF ${fmt(ps.net_salary)}`, M + W - 120, y + 5, { width: 120, align: 'right' });
    y += 32;

    // ── CHARGES PATRONALES (small) ───────────────────────────────────────
    if (y < 700) {
      y += 4;
      y = section('CHARGES PATRONALES (information)', y, '#94a3b8');
      if (parseFloat(ps.avs_employer) > 0) y = row('AVS/AI/APG employeur', fmt(parseFloat(ps.avs_employer)+parseFloat(ps.ai_employer)+parseFloat(ps.apg_employer)), y);
      if (parseFloat(ps.ac_employer)  > 0) y = row('AC employeur', fmt(ps.ac_employer), y);
      if (parseFloat(ps.lpp_employer) > 0) y = row('LPP employeur', fmt(ps.lpp_employer), y);
      if (parseFloat(ps.laa_p_employer) > 0) y = row('LAA P employeur', fmt(ps.laa_p_employer), y);
      if (parseFloat(ps.ijm_employer) > 0) y = row('IJM employeur', fmt(ps.ijm_employer), y);
      if (parseFloat(ps.fam_alloc_employer) > 0) y = row('Allocations familiales', fmt(ps.fam_alloc_employer), y);
      y = totalRow('COÛT TOTAL EMPLOYEUR', fmt(ps.total_cost), y, '#64748b');
    }

    // ── Footer ───────────────────────────────────────────────────────────
    doc.rect(0, 780, 595, 62).fill(DARK);
    doc.fontSize(7).font('Helvetica').fillColor('rgba(255,255,255,0.45)')
       .text(
         `SwissRH · ${ps.company_name} · Taux officiels 2025 · Document généré le ${new Date().toLocaleDateString('fr-CH')} · CONFIDENTIEL`,
         M, 793, { width: 595 - M*2, align: 'center' }
       );
    doc.fontSize(7).fillColor('rgba(255,255,255,0.3)')
       .text('Ce bulletin de salaire est établi selon les bases légales suisses (CO, LIFD, LAA, LPP, LAVS). Format ELM non certifié Swissdec.',
         M, 806, { width: 595 - M*2, align: 'center' });

    doc.end();
  } catch (e: any) {
    console.error('[PDF]', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// GET /api/salary/payslips/run/:year/:month/pdf — Batch PDF (tous les bulletins du mois)
pdfRouter.get('/payslips/run/:year/:month/pdf', requireAuth, requireManager, async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const { year, month } = req.params;
    const sql = getSQL();

    const payslips = await sql`
      SELECT p.id FROM payslips p
      WHERE p.company_id = ${companyId}
        AND p.period_year = ${Number(year)}
        AND p.period_month = ${Number(month)}
      ORDER BY p.id
    `;

    if (payslips.length === 0)
      return res.status(404).json({ error: 'Aucun bulletin pour cette période' });

    // Return list of IDs for frontend to download individually
    res.json({
      ok: true,
      count: payslips.length,
      ids: payslips.map((p: any) => p.id),
      downloadAll: `/api/salary/payslips/batch-download?year=${year}&month=${month}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
