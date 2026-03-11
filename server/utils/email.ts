/**
 * SWISSRH — Email Service (Resend)
 * ============================================================
 * Templates branded SwissRH pour :
 *   1. sendLeaveRequestToRH      — congé soumis → RH
 *   2. sendLeaveDecisionToEmployee — approuvé/refusé → employé
 *   3. sendPermitExpiryAlert     — permis expirant → admin
 *   4. sendPayrollLaunched       — paie lancée → admin
 *   5. sendPayslipReady          — bulletin disponible → employé
 * ============================================================
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM = 'SwissRH <noreply@swissrh.ch>';
const APP_URL = process.env.SWISSRH_APP_URL || 'https://swissrh.ch';

// ─── Couleurs brand ───────────────────────────────────────
const C = {
  primary:   '#1a56db',  // bleu SwissRH
  dark:      '#111928',
  gray:      '#6b7280',
  light:     '#f3f4f6',
  success:   '#057a55',
  danger:    '#c81e1e',
  warning:   '#b45309',
  white:     '#ffffff',
};

// ─── Utilitaire HTTP Resend ───────────────────────────────
async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('⚠️  [EMAIL] RESEND_API_KEY absent — email non envoyé:', opts.subject);
    return { ok: false, error: 'RESEND_API_KEY manquant' };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      console.error('❌ [EMAIL] Resend error:', data);
      return { ok: false, error: data?.message || 'Resend API error' };
    }
    console.log(`✅ [EMAIL] Envoyé (${data.id}): ${opts.subject} → ${opts.to}`);
    return { ok: true, id: data.id };
  } catch (e: any) {
    console.error('❌ [EMAIL] Fetch error:', e.message);
    return { ok: false, error: e.message };
  }
}

// ─── Layout HTML commun ───────────────────────────────────
function layout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SwissRH</title>
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
</head>
<body style="margin:0;padding:0;background:${C.light};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.light};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${C.white};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:${C.primary};padding:28px 40px;text-align:center;">
            <span style="font-size:24px;font-weight:700;color:${C.white};letter-spacing:-.5px;">Swiss<span style="opacity:.85;">RH</span></span>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px;">Gestion RH suisse — Conforme Swissdec 2025</p>
          </td>
        </tr>

        <!-- Content -->
        <tr><td style="padding:36px 40px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:${C.light};padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:${C.gray};text-align:center;">
              © ${new Date().getFullYear()} SwissRH — Neukomm Group<br/>
              <a href="${APP_URL}" style="color:${C.primary};text-decoration:none;">swissrh.ch</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/settings" style="color:${C.gray};text-decoration:none;">Paramètres notifications</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Composants HTML réutilisables ────────────────────────
function badge(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color}1a;color:${color};border:1px solid ${color}33;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:600;">${text}</span>`;
}

function infoBox(rows: { label: string; value: string }[], borderColor = C.primary): string {
  const cells = rows.map(r => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:${C.gray};font-weight:500;white-space:nowrap;width:40%;">${r.label}</td>
      <td style="padding:10px 16px;font-size:13px;color:${C.dark};font-weight:600;">${r.value}</td>
    </tr>`).join('<tr><td colspan="2" style="height:0;border-top:1px solid #f3f4f6;"></td></tr>');

  return `<table width="100%" cellpadding="0" cellspacing="0"
    style="background:${C.light};border-radius:8px;border-left:4px solid ${borderColor};overflow:hidden;margin:20px 0;">
    ${cells}
  </table>`;
}

function ctaButton(text: string, href: string, color = C.primary): string {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href}" style="display:inline-block;background:${color};color:${C.white};text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:-.2px;">${text} →</a>
  </div>`;
}

function heading(icon: string, title: string): string {
  return `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:${C.dark};">${icon} ${title}</h1>`;
}

// ─── Formatage dates ──────────────────────────────────────
function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' });
}

function absenceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    vacation: 'Vacances',
    sick:     'Maladie',
    accident: 'Accident',
    maternity:'Maternité',
    paternity:'Paternité',
    military: 'Service militaire',
    other:    'Autre',
  };
  return map[type] || type;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONGÉ SOUMIS → RH
// ─────────────────────────────────────────────────────────────────────────────
export async function sendLeaveRequestToRH(opts: {
  rhEmail: string;
  rhName?: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail: string;
  absenceType: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason?: string;
  absenceId: number | string;
  companyName: string;
}) {
  const typeLabel = absenceTypeLabel(opts.absenceType);
  const approveUrl = `${APP_URL}/absences/${opts.absenceId}/approve`;

  const content = `
    ${heading('📩', 'Nouvelle demande de congé')}
    <p style="margin:8px 0 20px;color:${C.gray};font-size:14px;">
      ${opts.rhName ? `Bonjour ${opts.rhName},` : 'Bonjour,'}<br/>
      <strong>${opts.employeeFirstName} ${opts.employeeLastName}</strong> vient de soumettre une demande de congé qui nécessite votre approbation.
    </p>

    ${infoBox([
      { label: 'Employé',       value: `${opts.employeeFirstName} ${opts.employeeLastName}` },
      { label: 'Email',         value: opts.employeeEmail },
      { label: 'Type de congé', value: typeLabel },
      { label: 'Début',         value: fmtDate(opts.startDate) },
      { label: 'Fin',           value: fmtDate(opts.endDate) },
      { label: 'Jours ouvrables', value: `${opts.workingDays} jour${opts.workingDays > 1 ? 's' : ''}` },
      ...(opts.reason ? [{ label: 'Motif', value: opts.reason }] : []),
    ])}

    ${ctaButton('Traiter la demande', approveUrl)}
    <p style="text-align:center;font-size:12px;color:${C.gray};margin-top:8px;">
      Ou connectez-vous sur <a href="${APP_URL}/absences" style="color:${C.primary};">SwissRH → Absences</a>
    </p>
  `;

  return sendEmail({
    to: opts.rhEmail,
    subject: `🗓 Demande de congé — ${opts.employeeFirstName} ${opts.employeeLastName} (${opts.workingDays}j)`,
    html: layout(content, `${opts.employeeFirstName} demande ${opts.workingDays} jours de ${typeLabel.toLowerCase()}`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DÉCISION CONGÉ → EMPLOYÉ (approuvé ou refusé)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendLeaveDecisionToEmployee(opts: {
  employeeEmail: string;
  employeeFirstName: string;
  absenceType: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  decision: 'approved' | 'rejected';
  rejectionReason?: string;
  approverName?: string;
}) {
  const approved = opts.decision === 'approved';
  const typeLabel = absenceTypeLabel(opts.absenceType);
  const statusBadge = approved
    ? badge('✅ Approuvé', C.success)
    : badge('❌ Refusé', C.danger);

  const decisionColor = approved ? C.success : C.danger;
  const decisionTitle = approved
    ? 'Votre demande de congé a été approuvée'
    : 'Votre demande de congé a été refusée';
  const decisionEmoji = approved ? '✅' : '❌';

  const content = `
    ${heading(decisionEmoji, decisionTitle)}
    <p style="margin:8px 0 20px;color:${C.gray};font-size:14px;">
      Bonjour ${opts.employeeFirstName},<br/>
      Votre demande de ${typeLabel.toLowerCase()} a été traitée. ${statusBadge}
    </p>

    ${infoBox([
      { label: 'Type de congé',   value: typeLabel },
      { label: 'Début',           value: fmtDate(opts.startDate) },
      { label: 'Fin',             value: fmtDate(opts.endDate) },
      { label: 'Jours ouvrables', value: `${opts.workingDays} jour${opts.workingDays > 1 ? 's' : ''}` },
      { label: 'Décision',        value: approved ? '✅ Approuvée' : '❌ Refusée' },
      ...(opts.approverName ? [{ label: 'Traité par', value: opts.approverName }] : []),
      ...((!approved && opts.rejectionReason) ? [{ label: 'Motif du refus', value: opts.rejectionReason }] : []),
    ], decisionColor)}

    ${approved
      ? `<p style="background:#f0fdf4;border-radius:8px;padding:14px 16px;font-size:14px;color:${C.success};">
          ✨ Bon repos ! Pensez à coordonner avec votre équipe si nécessaire.
        </p>`
      : `<p style="background:#fff5f5;border-radius:8px;padding:14px 16px;font-size:14px;color:${C.danger};">
          Pour toute question, contactez votre responsable RH.
        </p>`
    }

    ${ctaButton('Voir mes absences', `${APP_URL}/portal/absences`, decisionColor)}
  `;

  return sendEmail({
    to: opts.employeeEmail,
    subject: `${decisionEmoji} Congé ${approved ? 'approuvé' : 'refusé'} — ${fmtDate(opts.startDate)} → ${fmtDate(opts.endDate)}`,
    html: layout(content, `Votre demande de congé a été ${approved ? 'approuvée' : 'refusée'}`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERMIS EXPIRANT → ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPermitExpiryAlert(opts: {
  adminEmail: string;
  adminName?: string;
  employees: Array<{
    firstName: string;
    lastName: string;
    permitType: string;
    permitExpiry: string;
    daysRemaining: number;
  }>;
  companyName: string;
}) {
  const urgent   = opts.employees.filter(e => e.daysRemaining <= 7);
  const warning  = opts.employees.filter(e => e.daysRemaining > 7 && e.daysRemaining <= 30);

  const empRows = opts.employees.map(e => {
    const urgentFlag = e.daysRemaining <= 7;
    const color = urgentFlag ? C.danger : C.warning;
    return `<tr>
      <td style="padding:10px 12px;font-size:13px;color:${C.dark};font-weight:600;">
        ${e.firstName} ${e.lastName}
      </td>
      <td style="padding:10px 12px;font-size:13px;color:${C.gray};">${e.permitType}</td>
      <td style="padding:10px 12px;font-size:13px;color:${C.gray};">${fmtDate(e.permitExpiry)}</td>
      <td style="padding:10px 12px;text-align:center;">
        <span style="display:inline-block;background:${color}1a;color:${color};border:1px solid ${color}33;border-radius:5px;padding:2px 8px;font-size:12px;font-weight:700;">
          J-${e.daysRemaining}
        </span>
      </td>
    </tr>`;
  }).join('<tr><td colspan="4" style="height:0;border-top:1px solid #f3f4f6;"></td></tr>');

  const content = `
    ${heading('⚠️', 'Permis de travail expirant')}
    <p style="margin:8px 0 20px;color:${C.gray};font-size:14px;">
      ${opts.adminName ? `Bonjour ${opts.adminName},` : 'Bonjour,'}<br/>
      ${opts.employees.length} employé${opts.employees.length > 1 ? 's' : ''} de <strong>${opts.companyName}</strong>
      ${opts.employees.length > 1 ? 'ont' : 'a'} un permis de travail arrivant à expiration.
      ${urgent.length > 0 ? `<br/><span style="color:${C.danger};font-weight:600;">⚡ ${urgent.length} permis expirent dans moins de 7 jours !</span>` : ''}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:${C.light};border-radius:8px;overflow:hidden;margin:20px 0;">
      <tr style="background:#e5e7eb;">
        <th style="padding:10px 12px;font-size:12px;color:${C.gray};text-align:left;font-weight:600;">Employé</th>
        <th style="padding:10px 12px;font-size:12px;color:${C.gray};text-align:left;font-weight:600;">Type</th>
        <th style="padding:10px 12px;font-size:12px;color:${C.gray};text-align:left;font-weight:600;">Expiration</th>
        <th style="padding:10px 12px;font-size:12px;color:${C.gray};text-align:center;font-weight:600;">Délai</th>
      </tr>
      ${empRows}
    </table>

    <p style="background:#fffbeb;border-left:4px solid ${C.warning};border-radius:0 8px 8px 0;padding:14px 16px;font-size:13px;color:${C.warning};margin:20px 0 0;">
      ⚠️ Pensez à initier les démarches de renouvellement auprès des autorités cantonales.
    </p>

    ${ctaButton('Gérer les employés', `${APP_URL}/employees`, C.warning)}
  `;

  return sendEmail({
    to: opts.adminEmail,
    subject: `⚠️ ${opts.employees.length} permis expirant${opts.employees.length > 1 ? 's' : ''} — Action requise${urgent.length > 0 ? ' 🚨' : ''}`,
    html: layout(content, `${urgent.length > 0 ? 'URGENT — ' : ''}${opts.employees.length} permis de travail à renouveler`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAIE LANCÉE → ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPayrollLaunched(opts: {
  adminEmail: string;
  adminName?: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalCost: number;
}) {
  const monthLabel = new Date(opts.periodYear, opts.periodMonth - 1).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });

  const fmt = (n: number) => n.toLocaleString('fr-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 });

  const content = `
    ${heading('💶', `Paie lancée — ${monthLabel}`)}
    <p style="margin:8px 0 20px;color:${C.gray};font-size:14px;">
      ${opts.adminName ? `Bonjour ${opts.adminName},` : 'Bonjour,'}<br/>
      La paie de <strong>${monthLabel}</strong> pour <strong>${opts.companyName}</strong> a été lancée avec succès.
    </p>

    ${infoBox([
      { label: 'Période',         value: monthLabel },
      { label: 'Employés traités',value: `${opts.employeeCount} bulletin${opts.employeeCount > 1 ? 's' : ''} générés` },
      { label: 'Total brut',      value: fmt(opts.totalGross) },
      { label: 'Total net versé', value: fmt(opts.totalNet) },
      { label: 'Charge totale',   value: fmt(opts.totalCost) },
    ], C.success)}

    <p style="background:#f0fdf4;border-left:4px solid ${C.success};border-radius:0 8px 8px 0;padding:14px 16px;font-size:13px;color:${C.success};margin:20px 0 0;">
      ✅ Les bulletins de salaire sont disponibles pour chaque employé dans leur portail.
    </p>

    ${ctaButton('Voir les bulletins', `${APP_URL}/payroll`, C.success)}
  `;

  return sendEmail({
    to: opts.adminEmail,
    subject: `✅ Paie ${monthLabel} lancée — ${opts.employeeCount} bulletins — ${fmt(opts.totalNet)} net`,
    html: layout(content, `Paie ${monthLabel} : ${opts.employeeCount} employés, ${fmt(opts.totalNet)} net`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BULLETIN DISPONIBLE → EMPLOYÉ
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPayslipReady(opts: {
  employeeEmail: string;
  employeeFirstName: string;
  periodYear: number;
  periodMonth: number;
  grossSalary: number;
  netSalary: number;
  payslipId: number | string;
}) {
  const monthLabel = new Date(opts.periodYear, opts.periodMonth - 1).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
  const fmt = (n: number) => n.toLocaleString('fr-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 });

  const content = `
    ${heading('📄', `Votre bulletin de salaire — ${monthLabel}`)}
    <p style="margin:8px 0 20px;color:${C.gray};font-size:14px;">
      Bonjour ${opts.employeeFirstName},<br/>
      Votre bulletin de salaire pour <strong>${monthLabel}</strong> est disponible dans votre espace personnel.
    </p>

    ${infoBox([
      { label: 'Période',       value: monthLabel },
      { label: 'Salaire brut',  value: fmt(opts.grossSalary) },
      { label: 'Salaire net',   value: `<strong style="color:${C.success};font-size:15px;">${fmt(opts.netSalary)}</strong>` },
    ], C.primary)}

    ${ctaButton('Télécharger mon bulletin', `${APP_URL}/portal/payslips`, C.primary)}
    <p style="text-align:center;font-size:12px;color:${C.gray};margin-top:8px;">
      Format PDF · Conforme Swissdec 2025
    </p>
  `;

  return sendEmail({
    to: opts.employeeEmail,
    subject: `📄 Bulletin ${monthLabel} disponible — ${fmt(opts.netSalary)} net`,
    html: layout(content, `Votre salaire net de ${monthLabel} : ${fmt(opts.netSalary)}`),
  });
}
