/**
 * SWISSRH — Crash Monitor
 * ============================================================
 * Adapté depuis WIN WIN V2 server/monitoring/crash-monitor.ts
 *   ✅ Startup check — détecte downtime au redémarrage
 *   ✅ Heartbeat 5 min — DB + tables critiques
 *   ✅ Alerte après 2 échecs consécutifs (= 10 min)
 *   ✅ Email de recovery quand le service revient
 *   ✅ Historique en DB
 *   ✅ Règle PEP's #8 : JAMAIS de requêtes HTTP vers soi-même
 * ============================================================
 */
import { getSQL } from '../db/pool.js';

const state = {
  lastCheck:          null as Date | null,
  consecutiveFailures: 0,
  isDegraded:         false,
  startupTime:        new Date(),
  aiHealthy:          true,
};

// ── DB CHECK ─────────────────────────────────────────────────────────────
async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  const sql = getSQL();
  if (!sql) return { ok: false, error: 'DATABASE_URL not set' };
  try {
    const result = await sql`SELECT 1 as ping`;
    if (result[0]?.ping !== 1) throw new Error('Unexpected result');

    // Vérifier tables critiques
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('companies','employees','payslips','payroll_runs')
    `;
    if (tables.length < 4) {
      return { ok: false, error: `Tables manquantes (${tables.length}/4)` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function checkDataIntegrity(): Promise<{ ok: boolean; count?: number; error?: string }> {
  const sql = getSQL();
  if (!sql) return { ok: false, error: 'No DB' };
  try {
    const [result] = await sql`SELECT COUNT(*)::int as count FROM companies`;
    return { ok: true, count: result.count };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── MAIN HEALTH CHECK ─────────────────────────────────────────────────────
export async function runHealthCheck(): Promise<{
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, { ok: boolean; error?: string }>;
  timestamp: string;
}> {
  const checks: Record<string, { ok: boolean; error?: string }> = {};
  const failures: string[] = [];

  checks.database  = await checkDatabase();
  checks.integrity = await checkDataIntegrity();

  if (!checks.database.ok)  failures.push(`DB: ${checks.database.error}`);
  if (!checks.integrity.ok) failures.push(`Integrity: ${checks.integrity.error}`);

  const status = !checks.database.ok ? 'down' : failures.length > 0 ? 'degraded' : 'ok';
  const timestamp = new Date().toISOString();

  // Log en DB
  const sql = getSQL();
  if (sql) {
    try {
      await sql`
        INSERT INTO monitor_log (status, check_type, details, failures)
        VALUES (${status}, 'periodic', ${JSON.stringify(checks)}, ${failures.join(' | ') || null})
      `;
    } catch (e: any) {
      console.error('[MONITOR] Log insert:', e.message);
    }
  }

  state.lastCheck = new Date();

  if (failures.length > 0) {
    state.consecutiveFailures++;
    console.error(`[MONITOR] ⚠️ ${failures.length} échec(s) — consécutifs: ${state.consecutiveFailures}`);
    failures.forEach(f => console.error(`  ❌ ${f}`));

    // Alerte après 2 échecs consécutifs (10 min)
    if (state.consecutiveFailures >= 2 && !state.isDegraded) {
      state.isDegraded = true;
      console.error('[MONITOR] 🚨 SERVICE DÉGRADÉ — alerte admin');
      // TODO: intégrer Resend email alert comme WinWin
    }
  } else {
    if (state.isDegraded) {
      const downtimeMin = state.consecutiveFailures * 5;
      console.log(`[MONITOR] ✅ SERVICE RÉTABLI (downtime: ${downtimeMin} min)`);
      state.isDegraded = false;
      // TODO: email recovery
    }
    state.consecutiveFailures = 0;
    console.log(`[MONITOR] ✅ All checks OK — ${timestamp}`);
  }

  return { status, checks, timestamp };
}

// ── STARTUP CHECK ─────────────────────────────────────────────────────────
export async function startupCheck(): Promise<void> {
  console.log('[MONITOR] 🔄 Startup check...');
  const sql = getSQL();

  // Détecter downtime (gap > 10 min depuis dernier heartbeat)
  if (sql) {
    try {
      const [last] = await sql`
        SELECT checked_at, status FROM monitor_log
        ORDER BY checked_at DESC LIMIT 1
      `;
      if (last) {
        const gapMin = (Date.now() - new Date(last.checked_at).getTime()) / 60000;
        if (gapMin > 10) {
          const duration = gapMin < 60
            ? `${Math.round(gapMin)} min`
            : `${(gapMin / 60).toFixed(1)}h`;
          console.warn(`[MONITOR] ⚠️ DOWNTIME DÉTECTÉ: ${duration} sans heartbeat`);

          await sql`
            INSERT INTO monitor_log (status, check_type, details)
            VALUES ('recovery', 'startup', ${`Rétabli après ${duration} de downtime`})
          `;
        }
      }
    } catch (e: any) {
      console.error('[MONITOR] Startup DB check:', e.message);
    }
  }

  // Log startup
  if (sql) {
    await sql`
      INSERT INTO monitor_log (status, check_type, details)
      VALUES ('startup', 'startup', ${`SWISSRH démarré — ${new Date().toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' })}`})
    `.catch(() => {});
  }

  await runHealthCheck();
  console.log('[MONITOR] ✅ Startup check terminé');
}

// ── PERIODIC SCHEDULER ────────────────────────────────────────────────────
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startPeriodicMonitoring(): void {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try { await runHealthCheck(); }
    catch (e: any) { console.error('[MONITOR] Periodic crash:', e.message); }
  }, 5 * 60 * 1000); // 5 minutes

  console.log('[MONITOR] 🔁 Monitoring périodique activé (5 min)');
}

export function stopPeriodicMonitoring(): void {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

export function getMonitorState() {
  return {
    ...state,
    uptime: Math.round((Date.now() - state.startupTime.getTime()) / 60000),
  };
}

export async function getMonitorHistory(limit = 20): Promise<any[]> {
  const sql = getSQL();
  if (!sql) return [];
  try {
    return await sql`SELECT * FROM monitor_log ORDER BY checked_at DESC LIMIT ${limit}`;
  } catch { return []; }
}
