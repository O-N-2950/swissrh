/**
 * SWISSRH — Shared PostgreSQL Pool
 * ============================================================
 * Copié et adapté depuis WIN WIN V2 server/db/shared-pool.ts
 *   ✅ prepare: false  → évite CONNECTION_ENDED sur reconnect
 *   ✅ Keepalive 20s   → évite idle timeout Railway
 *   ✅ Auto-reconnect  → si pool mort, recrée silencieusement
 *   ✅ Jamais d'exception non catchée depuis ce module
 *   ✅ max_lifetime: 3 min → évite les connexions zombies
 * ============================================================
 */
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

function createPool() {
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 10,         // seconds
    connect_timeout: 30,
    max_lifetime: 60 * 3,     // 3 min — évite les connexions zombies
    prepare: false,           // CRITIQUE — évite prepared statement errors sur reconnect
    onnotice: () => {},       // silencieux
    onparameter: () => {},
  });
}

let _client = createPool();
let _reconnecting = false;
let _lastReconnectAt = 0;

export function getSQL(): ReturnType<typeof postgres> {
  return _client;
}

// Proxy transparent — si le pool est mort, les requêtes vont toujours au bon _client
export const sharedClient = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) { return (_client as any)[prop]; },
  apply(_target, _thisArg, args) { return (_client as any)(...args); },
}) as unknown as ReturnType<typeof postgres>;

// Force reconnect — protégé contre appels concurrents
export async function forceReconnect() {
  if (_reconnecting) return;
  const now = Date.now();
  if (now - _lastReconnectAt < 5000) return; // max 1 reconnect / 5s

  _reconnecting = true;
  _lastReconnectAt = now;
  try {
    console.log('🔄 [POOL] Force reconnect...');
    try { await _client.end({ timeout: 2 }); } catch { /* ignore */ }
    _client = createPool();
    await _client`SELECT 1`;
    console.log('✅ [POOL] Reconnected and tested');
  } catch (e: any) {
    console.error('❌ [POOL] Reconnect failed:', e?.message?.substring(0, 80));
    _client = createPool(); // recréer quand même — il se reconnectera à la prochaine requête
  } finally {
    _reconnecting = false;
  }
}

// Keepalive: ping DB toutes les 20s — si fail, reconnect silencieux
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

export function startPoolKeepalive() {
  if (keepaliveInterval) return;

  keepaliveInterval = setInterval(() => {
    Promise.resolve().then(async () => {
      try {
        await Promise.race([
          _client`SELECT 1`,
          new Promise((_, reject) => setTimeout(() => reject(new Error('keepalive timeout')), 8000)),
        ]);
      } catch (e: any) {
        const msg = (e?.message || '').toLowerCase();
        console.warn('⚠️  [POOL] Keepalive failed:', (e?.message || '').substring(0, 80));
        if (
          msg.includes('connection_ended') ||
          msg.includes('connection') ||
          msg.includes('econnrefused') ||
          msg.includes('timeout') ||
          msg.includes('socket')
        ) {
          forceReconnect().catch(() => {});
        }
      }
    }).catch(() => {}); // Double protection — JAMAIS d'exception non gérée
  }, 20_000);

  console.log('💓 [POOL] Keepalive started (20s interval)');
}

/** Alias de compatibilité — appelé dans seed-demo */
export function initPool(): void {
  // pool initialisé automatiquement via getSQL()
}

