import { getSQL } from './pool.js';

export async function migrateSprint5(): Promise<void> {
  const sql = getSQL();
  console.log('[MIGRATE] Sprint 5 — API keys + PWA...');

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id            SERIAL PRIMARY KEY,
      company_id    INTEGER REFERENCES companies(id) NOT NULL,
      name          VARCHAR(100) NOT NULL,
      key_hash      VARCHAR(64)  NOT NULL UNIQUE,
      key_prefix    VARCHAR(20)  NOT NULL,
      scopes        JSONB        DEFAULT '["read"]',
      is_active     BOOLEAN      DEFAULT true,
      last_used     TIMESTAMP,
      request_count INTEGER      DEFAULT 0,
      expires_at    TIMESTAMP,
      created_by    INTEGER REFERENCES users(id),
      created_at    TIMESTAMP    DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_hash    ON api_keys(key_hash) WHERE is_active = true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id)`;

  console.log('[MIGRATE] ✅ Sprint 5 done');
}
