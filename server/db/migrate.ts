/**
 * SWISSRH — Auto-migration at startup
 * Crée toutes les tables si elles n'existent pas.
 * Chaque patch est idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 */
import { getSQL } from './pool.js';

export async function migrateOnStart(): Promise<void> {
  const sql = getSQL();

  console.log('[MIGRATE] Running migrations...');

  // ── PATCH 001 — Core tables ──────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      legal_form  VARCHAR(50),
      uid         VARCHAR(20),                -- CHE-XXX.XXX.XXX
      address     TEXT,
      npa         VARCHAR(10),
      city        VARCHAR(100),
      canton      VARCHAR(2) DEFAULT 'JU',
      avs_number  VARCHAR(20),               -- No caisse AVS
      lpp_number  VARCHAR(20),               -- No institution LPP
      laa_number  VARCHAR(20),               -- No SUVA/LAA
      ijm_rate    DECIMAL(5,4) DEFAULT 0.015,
      laa_np_rate DECIMAL(5,4) DEFAULT 0.013,
      laa_p_rate  DECIMAL(5,4) DEFAULT 0.008,
      fam_alloc   DECIMAL(5,4) DEFAULT 0.014,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      email        VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      role         VARCHAR(20) DEFAULT 'user',   -- admin | hr | accountant | user
      company_id   INTEGER REFERENCES companies(id),
      first_name   VARCHAR(100),
      last_name    VARCHAR(100),
      last_login   TIMESTAMP,
      is_active    BOOLEAN DEFAULT true,
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      avs_number      VARCHAR(20),                    -- 756.XXXX.XXXX.XX
      first_name      VARCHAR(100) NOT NULL,
      last_name       VARCHAR(100) NOT NULL,
      email           VARCHAR(255),
      phone           VARCHAR(30),
      address         TEXT,
      npa             VARCHAR(10),
      city            VARCHAR(100),
      birthdate       DATE,
      hire_date       DATE,
      end_date        DATE,
      contract_type   VARCHAR(20) DEFAULT 'CDI',      -- CDI | CDD | horaire | apprenti
      permit_type     VARCHAR(5)  DEFAULT 'CH',        -- CH | C | B | G | L | F
      permit_expiry   DATE,
      activity_rate   DECIMAL(5,2) DEFAULT 100,        -- 100, 80, 60, 50...
      weekly_hours    DECIMAL(5,2) DEFAULT 42,
      salary_type     VARCHAR(10) DEFAULT 'monthly',   -- monthly | hourly
      salary_amount   DECIMAL(12,2),                   -- mensuel brut ou taux horaire
      lpp_join_date   DATE,
      cost_center     VARCHAR(50),
      department      VARCHAR(100),
      position        VARCHAR(100),
      vacation_weeks  DECIMAL(4,1) DEFAULT 5,
      is_active       BOOLEAN DEFAULT true,
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── PATCH 002 — Payroll ───────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      period_year     INTEGER NOT NULL,
      period_month    INTEGER NOT NULL,   -- 1-12
      status          VARCHAR(20) DEFAULT 'draft',  -- draft | validated | locked
      total_gross     DECIMAL(14,2) DEFAULT 0,
      total_net       DECIMAL(14,2) DEFAULT 0,
      total_employer  DECIMAL(14,2) DEFAULT 0,
      payslips_count  INTEGER DEFAULT 0,
      created_by      INTEGER REFERENCES users(id),
      validated_at    TIMESTAMP,
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payslips (
      id                  SERIAL PRIMARY KEY,
      run_id              INTEGER REFERENCES payroll_runs(id),
      employee_id         INTEGER REFERENCES employees(id) NOT NULL,
      company_id          INTEGER REFERENCES companies(id) NOT NULL,
      period_year         INTEGER NOT NULL,
      period_month        INTEGER NOT NULL,

      -- Salaire de base
      gross_salary        DECIMAL(12,2) NOT NULL,
      activity_rate       DECIMAL(5,2)  DEFAULT 100,

      -- Heures (pour salaires horaires)
      hours_normal        DECIMAL(8,2)  DEFAULT 0,
      hours_extra_25      DECIMAL(8,2)  DEFAULT 0,   -- +25% HS
      hours_night         DECIMAL(8,2)  DEFAULT 0,   -- +25% nuit
      hours_sunday        DECIMAL(8,2)  DEFAULT 0,   -- +50% dim
      hours_holiday       DECIMAL(8,2)  DEFAULT 0,   -- jours fériés
      vacation_indemnity  DECIMAL(12,2) DEFAULT 0,   -- indemnité vacances %
      bonus               DECIMAL(12,2) DEFAULT 0,

      -- Déductions employé
      avs_employee        DECIMAL(12,2) DEFAULT 0,   -- 5.3%
      ai_employee         DECIMAL(12,2) DEFAULT 0,   -- 0.7%
      apg_employee        DECIMAL(12,2) DEFAULT 0,   -- 0.225%
      ac_employee         DECIMAL(12,2) DEFAULT 0,   -- 1.1%
      lpp_employee        DECIMAL(12,2) DEFAULT 0,   -- variable par âge
      lpp_rate            DECIMAL(5,4)  DEFAULT 0,
      laa_np_employee     DECIMAL(12,2) DEFAULT 0,   -- 1.3% NBUV
      ijm_employee        DECIMAL(12,2) DEFAULT 0,   -- 0.75%
      family_allowance    DECIMAL(12,2) DEFAULT 0,   -- allocations fam. (positif)
      other_deductions    DECIMAL(12,2) DEFAULT 0,
      total_deductions    DECIMAL(12,2) DEFAULT 0,

      -- Net
      net_salary          DECIMAL(12,2) NOT NULL,

      -- Charges patronales
      avs_employer        DECIMAL(12,2) DEFAULT 0,
      ai_employer         DECIMAL(12,2) DEFAULT 0,
      apg_employer        DECIMAL(12,2) DEFAULT 0,
      ac_employer         DECIMAL(12,2) DEFAULT 0,
      lpp_employer        DECIMAL(12,2) DEFAULT 0,
      laa_p_employer      DECIMAL(12,2) DEFAULT 0,   -- 0.8% LAA professionnelle
      ijm_employer        DECIMAL(12,2) DEFAULT 0,
      fam_alloc_employer  DECIMAL(12,2) DEFAULT 0,   -- 1.4%
      total_employer      DECIMAL(12,2) DEFAULT 0,
      total_cost          DECIMAL(12,2) DEFAULT 0,   -- brut + charges patronales

      pdf_url             TEXT,
      sent_at             TIMESTAMP,
      notes               TEXT,
      created_at          TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── PATCH 003 — Time tracking ─────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS time_entries (
      id              SERIAL PRIMARY KEY,
      employee_id     INTEGER REFERENCES employees(id) NOT NULL,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      work_date       DATE NOT NULL,
      arrival_time    DECIMAL(5,2),           -- centièmes: 8.50 = 08h30
      departure_time  DECIMAL(5,2),
      break_duration  DECIMAL(5,2) DEFAULT 0,
      worked_hours    DECIMAL(5,2),           -- calculé auto
      overtime_hours  DECIMAL(5,2) DEFAULT 0,
      night_hours     DECIMAL(5,2) DEFAULT 0,
      sunday_hours    DECIMAL(5,2) DEFAULT 0,
      holiday_hours   DECIMAL(5,2) DEFAULT 0,
      entry_type      VARCHAR(20) DEFAULT 'work', -- work | sick | vacation | holiday | comp
      notes           TEXT,
      approved_by     INTEGER REFERENCES users(id),
      approved_at     TIMESTAMP,
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── PATCH 004 — AVS declarations ─────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS avs_declarations (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      year            INTEGER NOT NULL,
      status          VARCHAR(20) DEFAULT 'draft',  -- draft | submitted | confirmed
      total_avs_base  DECIMAL(14,2) DEFAULT 0,
      total_avs_emp   DECIMAL(14,2) DEFAULT 0,
      total_avs_er    DECIMAL(14,2) DEFAULT 0,
      xml_url         TEXT,
      submitted_at    TIMESTAMP,
      confirmed_at    TIMESTAMP,
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── PATCH 005 — Monitoring ────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS monitor_log (
      id          SERIAL PRIMARY KEY,
      checked_at  TIMESTAMP DEFAULT NOW(),
      status      VARCHAR(20) NOT NULL,   -- ok | degraded | down | startup | recovery
      check_type  VARCHAR(50) DEFAULT 'periodic',
      details     TEXT,
      failures    TEXT
    )
  `;

  // ── Indexes ───────────────────────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_employees_company   ON employees(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payslips_run        ON payslips(run_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payslips_employee   ON payslips(employee_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payslips_period     ON payslips(period_year, period_month)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_emp    ON time_entries(employee_id, work_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_monitor_log_date    ON monitor_log(checked_at DESC)`;

  console.log('[MIGRATE] ✅ All migrations complete');
}
