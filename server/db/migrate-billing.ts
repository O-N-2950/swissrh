/**
 * SWISSRH — Migration Stripe Billing + Swissdec 5.0
 */
import { getSQL } from './pool.js';

export async function migrateBilling(): Promise<void> {
  const sql = getSQL();
  console.log('[MIGRATE] Billing + Swissdec 5.0 migrations...');

  // ── Stripe billing sur companies ──────────────────────────
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_plan           VARCHAR(20) DEFAULT 'trial'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_status         VARCHAR(20) DEFAULT 'trial'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(100)`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100)`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_period_end     TIMESTAMP`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS winwin_client_id       INTEGER`;
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_stripe_sub ON companies(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`;

  // ── Swissdec 5.0 — champs supplémentaires employees ──────
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality       VARCHAR(3)  DEFAULT 'CH'`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS civil_status      VARCHAR(20) DEFAULT 'single'`; // single|married|divorced|widowed|separated
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS children_count    INTEGER DEFAULT 0`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_cross_border   BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_canton       VARCHAR(2)`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS residence_canton  VARCHAR(2)`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_at_source     BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_at_source_code VARCHAR(10)`;

  // ── Swissdec 5.0 — champs supplémentaires payslips ────────
  await sql`ALTER TABLE payslips ADD COLUMN IF NOT EXISTS source_tax_amount  DECIMAL(12,2) DEFAULT 0`;
  await sql`ALTER TABLE payslips ADD COLUMN IF NOT EXISTS source_tax_rate    DECIMAL(5,4)  DEFAULT 0`;
  await sql`ALTER TABLE payslips ADD COLUMN IF NOT EXISTS thirteenth_month   DECIMAL(12,2) DEFAULT 0`;
  await sql`ALTER TABLE payslips ADD COLUMN IF NOT EXISTS cantonal_family_alloc DECIMAL(12,2) DEFAULT 0`;

  // ── Table swissdec_submissions — historique envois ────────
  await sql`
    CREATE TABLE IF NOT EXISTS swissdec_submissions (
      id           SERIAL PRIMARY KEY,
      company_id   INTEGER REFERENCES companies(id) NOT NULL,
      year         INTEGER NOT NULL,
      month        INTEGER,                       -- NULL = annuel
      declaration_type VARCHAR(20) NOT NULL,      -- monthly|annual|correction
      status       VARCHAR(20) DEFAULT 'pending', -- pending|sent|accepted|rejected|error
      xml_content  TEXT,                          -- XML ELM envoyé
      response_xml TEXT,                          -- réponse Swissdec
      error_msg    TEXT,
      submitted_by INTEGER REFERENCES users(id),
      submitted_at TIMESTAMP DEFAULT NOW(),
      accepted_at  TIMESTAMP,
      sd_reference VARCHAR(100)                   -- référence Swissdec
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_swissdec_company_year ON swissdec_submissions(company_id, year)`;

  console.log('[MIGRATE] ✅ Billing + Swissdec 5.0 migrations complete');
}
