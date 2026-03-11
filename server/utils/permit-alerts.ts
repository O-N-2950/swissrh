/**
 * SWISSRH — Alertes permis de travail expirants
 * ============================================================
 * Vérifie quotidiennement (à 8h00) les permis expirant dans
 * 30 jours ou 7 jours et envoie un email aux admins.
 * ============================================================
 */
import { getSQL } from '../db/pool.js';
import { sendPermitExpiryAlert } from './email.js';

let alertIntervalId: ReturnType<typeof setInterval> | null = null;

// ─── Vérification immédiate ───────────────────────────────
export async function checkPermitExpiries(): Promise<void> {
  const sql = getSQL();

  try {
    // Récupérer tous les employés avec permis expirant dans 30j
    const expiring = await sql`
      SELECT
        e.id, e.first_name, e.last_name, e.permit_type, e.permit_expiry,
        (e.permit_expiry - CURRENT_DATE)::int as days_remaining,
        e.company_id,
        c.name as company_name,
        u.email as admin_email,
        u.first_name as admin_first_name
      FROM employees e
      JOIN companies c ON c.id = e.company_id
      JOIN users u ON u.company_id = e.company_id
        AND u.role IN ('admin', 'rh_manager')
        AND u.is_active = true
      WHERE e.is_active = true
        AND e.permit_type NOT IN ('CH', 'C')
        AND e.permit_expiry IS NOT NULL
        AND e.permit_expiry > CURRENT_DATE
        AND e.permit_expiry <= CURRENT_DATE + INTERVAL '30 days'
        AND (
          (e.permit_expiry - CURRENT_DATE)::int <= 7    -- J-7 : alerte urgente
          OR (e.permit_expiry - CURRENT_DATE)::int = 30  -- J-30 : alerte préventive
        )
      ORDER BY e.company_id, e.permit_expiry ASC
    `;

    if (expiring.length === 0) return;

    // Grouper par admin email (une entreprise peut avoir plusieurs admins)
    const byAdmin = new Map<string, {
      adminName: string;
      companyName: string;
      employees: Array<{
        firstName: string;
        lastName: string;
        permitType: string;
        permitExpiry: string;
        daysRemaining: number;
      }>;
    }>();

    for (const row of expiring) {
      const key = `${row.admin_email}::${row.company_id}`;
      if (!byAdmin.has(key)) {
        byAdmin.set(key, {
          adminName:   row.admin_first_name,
          companyName: row.company_name,
          employees:   [],
        });
      }
      byAdmin.get(key)!.employees.push({
        firstName:     row.first_name,
        lastName:      row.last_name,
        permitType:    row.permit_type,
        permitExpiry:  row.permit_expiry,
        daysRemaining: row.days_remaining,
      });
    }

    // Envoyer un email par admin/entreprise
    for (const [key, data] of byAdmin) {
      const adminEmail = key.split('::')[0];
      try {
        await sendPermitExpiryAlert({
          adminEmail,
          adminName:   data.adminName,
          employees:   data.employees,
          companyName: data.companyName,
        });
        console.log(`✅ [PERMIT-ALERT] Email envoyé à ${adminEmail} — ${data.employees.length} permis`);
      } catch (e: any) {
        console.error(`❌ [PERMIT-ALERT] Erreur email ${adminEmail}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('❌ [PERMIT-ALERT] Erreur vérification:', e.message);
  }
}

// ─── Démarrage planificateur quotidien à 8h00 ────────────
export function startPermitAlerts(): void {
  if (alertIntervalId) return; // déjà démarré

  const scheduleNext = () => {
    const now   = new Date();
    const next8 = new Date(now);
    next8.setHours(8, 0, 0, 0);

    // Si 8h00 est déjà passé aujourd'hui → demain
    if (next8 <= now) next8.setDate(next8.getDate() + 1);

    const msUntil = next8.getTime() - now.getTime();
    console.log(`⏰ [PERMIT-ALERT] Prochaine vérification permis : ${next8.toLocaleString('fr-CH')}`);

    setTimeout(async () => {
      await checkPermitExpiries();
      // Puis toutes les 24h
      alertIntervalId = setInterval(checkPermitExpiries, 24 * 60 * 60 * 1000);
    }, msUntil);
  };

  scheduleNext();
}
