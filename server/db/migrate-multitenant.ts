/**
 * SWISSRH — Migration multi-mandants
 * ============================================================
 * Ajoute la table `tenants` (fiduciaires) et relie les companies.
 * Chaque fiduciaire peut gérer N entreprises clientes.
 * ============================================================
 */
import { getSQL } from './pool.js';

export async function migrateMultiTenant(): Promise<void> {
  const sql = getSQL();
  console.log('[MIGRATE] Running multi-tenant migration...');

  // ── Table tenants (fiduciaires) ───────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(200) NOT NULL,         -- "Fiduciaire Dupont SA"
      slug         VARCHAR(100) UNIQUE,           -- "dupont-sa"
      email        VARCHAR(255),
      phone        VARCHAR(30),
      address      TEXT,
      npa          VARCHAR(10),
      city         VARCHAR(100),
      uid          VARCHAR(20),                   -- CHE-xxx.xxx.xxx
      plan         VARCHAR(20) DEFAULT 'fiduciaire', -- starter|pro|fiduciaire
      is_active    BOOLEAN DEFAULT true,
      created_at   TIMESTAMP DEFAULT NOW(),
      updated_at   TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── Ajout tenant_id sur companies ────────────────────────
  await sql`
    ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)
  `;

  // ── Index ─────────────────────────────────────────────────
  await sql`
    CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id)
  `;

  // ── Ajout du rôle fiduciaire sur users ────────────────────
  // (le champ role VARCHAR(20) supporte déjà les nouvelles valeurs)
  // Rôles: admin | rh_manager | employee | fiduciaire

  // ── Table tenant_users : lien user ↔ tenant ───────────────
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_users (
      id           SERIAL PRIMARY KEY,
      tenant_id    INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id      INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      role         VARCHAR(20) DEFAULT 'fiduciaire',       -- fiduciaire | admin
      created_at   TIMESTAMP DEFAULT NOW(),
      UNIQUE(tenant_id, user_id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id)
  `;

  console.log('[MIGRATE] ✅ Multi-tenant migration complete');
}
