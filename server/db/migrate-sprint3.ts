/**
 * SWISSRH — Migration Sprint 3
 * Planning shifts / Onboarding / Notes de frais
 */
import { getSQL } from './pool.js';

export async function migrateSprint3(): Promise<void> {
  const sql = getSQL();
  console.log('[MIGRATE] Sprint 3 migrations...');

  // ── Planning shifts ────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS shifts (
      id            SERIAL PRIMARY KEY,
      company_id    INTEGER REFERENCES companies(id) NOT NULL,
      employee_id   INTEGER REFERENCES employees(id) NOT NULL,
      shift_date    DATE NOT NULL,
      start_time    TIME NOT NULL,           -- 08:00
      end_time      TIME NOT NULL,           -- 17:00
      break_minutes INTEGER DEFAULT 30,
      role_label    VARCHAR(100),            -- "Caissier", "Chef de rang"...
      notes         TEXT,
      status        VARCHAR(20) DEFAULT 'scheduled', -- scheduled|confirmed|absent|swapped
      created_by    INTEGER REFERENCES users(id),
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_shifts_company_date ON shifts(company_id, shift_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shifts_employee     ON shifts(employee_id, shift_date)`;

  // ── Onboarding tasks ───────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS onboarding_templates (
      id          SERIAL PRIMARY KEY,
      company_id  INTEGER REFERENCES companies(id) NOT NULL,
      title       VARCHAR(200) NOT NULL,
      description TEXT,
      days_offset INTEGER DEFAULT 0,  -- J+0, J+1, J+7...
      category    VARCHAR(50) DEFAULT 'admin', -- admin|it|rh|manager
      is_active   BOOLEAN DEFAULT true,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id            SERIAL PRIMARY KEY,
      company_id    INTEGER REFERENCES companies(id) NOT NULL,
      employee_id   INTEGER REFERENCES employees(id) NOT NULL,
      template_id   INTEGER REFERENCES onboarding_templates(id),
      title         VARCHAR(200) NOT NULL,
      description   TEXT,
      due_date      DATE,
      category      VARCHAR(50) DEFAULT 'admin',
      status        VARCHAR(20) DEFAULT 'pending',  -- pending|in_progress|done|skipped
      assigned_to   INTEGER REFERENCES users(id),
      completed_at  TIMESTAMP,
      notes         TEXT,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_onboarding_employee ON onboarding_tasks(employee_id)`;

  // ── Notes de frais ─────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS expense_reports (
      id            SERIAL PRIMARY KEY,
      company_id    INTEGER REFERENCES companies(id) NOT NULL,
      employee_id   INTEGER REFERENCES employees(id) NOT NULL,
      title         VARCHAR(200) NOT NULL,
      period_year   INTEGER NOT NULL,
      period_month  INTEGER NOT NULL,
      status        VARCHAR(20) DEFAULT 'draft', -- draft|submitted|approved|rejected|paid
      total_amount  DECIMAL(12,2) DEFAULT 0,
      approved_by   INTEGER REFERENCES users(id),
      approved_at   TIMESTAMP,
      paid_at       TIMESTAMP,
      notes         TEXT,
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS expense_items (
      id              SERIAL PRIMARY KEY,
      report_id       INTEGER REFERENCES expense_reports(id) ON DELETE CASCADE NOT NULL,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      expense_date    DATE NOT NULL,
      category        VARCHAR(50) NOT NULL,  -- travel|meal|accommodation|parking|other
      description     VARCHAR(300) NOT NULL,
      amount          DECIMAL(10,2) NOT NULL,
      vat_rate        DECIMAL(5,4) DEFAULT 0,
      vat_amount      DECIMAL(10,2) DEFAULT 0,
      receipt_url     TEXT,
      km_distance     DECIMAL(8,2),          -- pour frais km (0.70 CHF/km)
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_report   ON expense_items(report_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_company  ON expense_reports(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expense_reports(employee_id)`;

  console.log('[MIGRATE] ✅ Sprint 3 migrations complete');
}
