/**
 * SWISSRH — Migration Patch 016
 * ============================================================
 * 016 — audit_logs (Critique 3+5)
 * 017 — data_consent nLPD art.6 (Critique 7)
 * 018 — data_retention_policy configurable (Critique 7)
 * 019 — users.role enum étendu (rh_manager, employee)
 * ============================================================
 */

import { getSQL } from './pool.js';

export async function migrateSecurityPatches(): Promise<void> {
  const sql = getSQL();
  console.log('[MIGRATE] Patches sécurité 016-019...');

  // ── PATCH 016 — Audit log ─────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            BIGSERIAL PRIMARY KEY,
      created_at    TIMESTAMP DEFAULT NOW(),
      user_id       INTEGER,
      user_email    VARCHAR(255),
      user_role     VARCHAR(50),
      company_id    INTEGER,
      action        VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100),
      resource_id   VARCHAR(100),
      details       TEXT,
      ip_address    VARCHAR(45)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs (company_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id, created_at DESC)`;
  console.log('[MIGRATE] ✅ 016 audit_logs');

  // ── PATCH 017 — Consentement nLPD art.6 ─────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS data_consent (
      id              SERIAL PRIMARY KEY,
      employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      company_id      INTEGER NOT NULL,
      consent_type    VARCHAR(100) NOT NULL, -- 'hr_data_processing' | 'salary_data' | 'third_party'
      consented       BOOLEAN NOT NULL DEFAULT false,
      consent_date    TIMESTAMP,
      revoked_date    TIMESTAMP,
      legal_basis     TEXT,                  -- CO art. 328b, nLPD art. 6
      ip_address      VARCHAR(45),
      created_at      TIMESTAMP DEFAULT NOW(),
      UNIQUE (employee_id, consent_type)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_data_consent_employee ON data_consent (employee_id)`;
  console.log('[MIGRATE] ✅ 017 data_consent');

  // ── PATCH 018 — Politique de rétention configurable ──────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS data_retention_policy (
      id             SERIAL PRIMARY KEY,
      company_id     INTEGER NOT NULL UNIQUE,
      salary_years   INTEGER NOT NULL DEFAULT 10,  -- légal CH CO art.962
      hr_years       INTEGER NOT NULL DEFAULT 7,   -- recommandé nLPD
      audit_years    INTEGER NOT NULL DEFAULT 2,
      consent_years  INTEGER NOT NULL DEFAULT 5,
      created_at     TIMESTAMP DEFAULT NOW(),
      updated_at     TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('[MIGRATE] ✅ 018 data_retention_policy');

  // ── PATCH 019 — Étendre users.role avec rh_manager + employee ────────
  // Ajouter employee_id sur users pour lier un compte employé
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id)
  `;
  // S'assurer que le rôle 'rh_manager' est accepté (pas de CHECK constraint en Postgres par défaut)
  console.log('[MIGRATE] ✅ 019 users.employee_id');

  // ── PATCH 020 — Champ nlpd_deleted_at sur employees ──────────────────
  await sql`
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS nlpd_deleted_at TIMESTAMP
  `;
  await sql`
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS nlpd_delete_reason TEXT
  `;
  console.log('[MIGRATE] ✅ 020 employees.nlpd_deleted_at');

  console.log('[MIGRATE] ✅ Patches sécurité 016-020 terminés');
}

// ── PATCH 021 — SSO nonces (usage unique) ────────────────────────────────
export async function migrateSso(): Promise<void> {
  const sql = getSQL();

  await sql`
    CREATE TABLE IF NOT EXISTS sso_nonces (
      id         SERIAL PRIMARY KEY,
      nonce      VARCHAR(64) UNIQUE NOT NULL,
      email      VARCHAR(255),
      used_at    TIMESTAMP DEFAULT NOW()
    )
  `;
  // Auto-nettoyage des nonces de plus de 10 min (cron ou trigger)
  await sql`CREATE INDEX IF NOT EXISTS idx_sso_nonces_used_at ON sso_nonces (used_at)`;

  // Colonne sso_provider sur users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50)`;

  // Colonne winwin_client_id sur companies (lien WinWin ↔ SwissRH)
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS winwin_client_id INTEGER`;
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_winwin_client ON companies (winwin_client_id)`;

  console.log('[MIGRATE] ✅ 021 SSO nonces + companies.winwin_client_id');
}
