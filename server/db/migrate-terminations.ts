/**
 * SWISSRH — Migration Licenciements & CO 336c
 * Appelée depuis migrate.ts au démarrage
 */
import { getSQL } from '../db/pool.js';

export async function migrateTerminations() {
  const sql = getSQL();

  // ── Table principale : licenciements ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS terminations (
      id                    SERIAL PRIMARY KEY,
      employee_id           INTEGER REFERENCES employees(id) NOT NULL,
      company_id            INTEGER REFERENCES companies(id) NOT NULL,
      created_by            INTEGER REFERENCES users(id),

      -- Données de base
      dismissal_date        DATE NOT NULL,             -- Date remise du congé
      end_of_month_notice   BOOLEAN DEFAULT true,       -- Terme fin de mois ?
      reason                TEXT,                       -- Motif (interne)
      notes                 TEXT,

      -- Résultats calculés (CO 335c / 336c)
      months_employed       INTEGER DEFAULT 0,
      notice_period_months  INTEGER DEFAULT 1,          -- 1, 2 ou 3
      initial_end_date      DATE,                       -- Sans suspension
      effective_end_date    DATE,                       -- Avec suspension(s)
      extended_by_days      INTEGER DEFAULT 0,

      -- Suspension CO 336c
      max_suspension_days   INTEGER DEFAULT 30,         -- Plafond légal
      total_suspended_days  INTEGER DEFAULT 0,
      suspensions_detail    JSONB DEFAULT '[]',         -- Détail par arrêt

      -- IJM
      ijm_end_date          DATE,                       -- 730j dès 1er arrêt

      -- Métadonnées
      alerts                JSONB DEFAULT '[]',
      legal_basis           JSONB DEFAULT '[]',
      summary_text          TEXT,

      created_at            TIMESTAMP DEFAULT NOW(),
      updated_at            TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── Table : arrêts maladie liés à un licenciement ──────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS termination_sick_leaves (
      id                SERIAL PRIMARY KEY,
      termination_id    INTEGER REFERENCES terminations(id) ON DELETE CASCADE NOT NULL,
      start_date        DATE NOT NULL,
      end_date          DATE NOT NULL,
      certificate_url   TEXT,           -- Lien vers le certificat médical
      notes             TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── Index ──────────────────────────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_terminations_company   ON terminations(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_terminations_employee  ON terminations(employee_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_terminations_end_date  ON terminations(effective_end_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_term_sick_leaves_tid   ON termination_sick_leaves(termination_id)`;

  console.log('[MIGRATE] ✅ terminations + termination_sick_leaves OK');
}
