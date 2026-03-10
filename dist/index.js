var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db/pool.ts
import postgres from "postgres";
function createPool() {
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 10,
    // seconds
    connect_timeout: 30,
    max_lifetime: 60 * 3,
    // 3 min — évite les connexions zombies
    prepare: false,
    // CRITIQUE — évite prepared statement errors sur reconnect
    onnotice: () => {
    },
    // silencieux
    onparameter: () => {
    }
  });
}
function getSQL() {
  return _client;
}
async function forceReconnect() {
  if (_reconnecting) return;
  const now = Date.now();
  if (now - _lastReconnectAt < 5e3) return;
  _reconnecting = true;
  _lastReconnectAt = now;
  try {
    console.log("\u{1F504} [POOL] Force reconnect...");
    try {
      await _client.end({ timeout: 2 });
    } catch {
    }
    _client = createPool();
    await _client`SELECT 1`;
    console.log("\u2705 [POOL] Reconnected and tested");
  } catch (e) {
    console.error("\u274C [POOL] Reconnect failed:", e?.message?.substring(0, 80));
    _client = createPool();
  } finally {
    _reconnecting = false;
  }
}
function startPoolKeepalive() {
  if (keepaliveInterval) return;
  keepaliveInterval = setInterval(() => {
    Promise.resolve().then(async () => {
      try {
        await Promise.race([
          _client`SELECT 1`,
          new Promise((_, reject) => setTimeout(() => reject(new Error("keepalive timeout")), 8e3))
        ]);
      } catch (e) {
        const msg = (e?.message || "").toLowerCase();
        console.warn("\u26A0\uFE0F  [POOL] Keepalive failed:", (e?.message || "").substring(0, 80));
        if (msg.includes("connection_ended") || msg.includes("connection") || msg.includes("econnrefused") || msg.includes("timeout") || msg.includes("socket")) {
          forceReconnect().catch(() => {
          });
        }
      }
    }).catch(() => {
    });
  }, 2e4);
  console.log("\u{1F493} [POOL] Keepalive started (20s interval)");
}
var connectionString, _client, _reconnecting, _lastReconnectAt, sharedClient, keepaliveInterval;
var init_pool = __esm({
  "server/db/pool.ts"() {
    "use strict";
    connectionString = process.env.DATABASE_URL;
    _client = createPool();
    _reconnecting = false;
    _lastReconnectAt = 0;
    sharedClient = new Proxy({}, {
      get(_target, prop) {
        return _client[prop];
      },
      apply(_target, _thisArg, args) {
        return _client(...args);
      }
    });
    keepaliveInterval = null;
  }
});

// server/db/seed-demo.ts
var seed_demo_exports = {};
__export(seed_demo_exports, {
  seedDemo: () => seedDemo
});
import bcrypt2 from "bcryptjs";
async function seedDemo() {
  const sql = getSQL();
  const [{ c }] = await sql`SELECT COUNT(*)::int as c FROM companies`;
  if (c > 0) return { ok: false, message: "Donn\xE9es d\xE9j\xE0 pr\xE9sentes \u2014 seed ignor\xE9" };
  console.log("[SEED] Cr\xE9ation des donn\xE9es de d\xE9monstration...");
  const [company] = await sql`
    INSERT INTO companies (
      name, legal_form, uid, address, npa, city, canton,
      avs_number, lpp_number, laa_number,
      laa_np_rate, laa_p_rate, ijm_rate, fam_alloc
    ) VALUES (
      'Dupont Industries Sàrl', 'Sàrl',
      'CHE-123.456.789',
      'Route de la Gare 12', '2950', 'Courgenay', 'JU',
      '26.39.000.123', 'LPP-456789', 'SUVA-789012',
      0.013, 0.008, 0.015, 0.014
    ) RETURNING id
  `;
  const hash = await bcrypt2.hash("Demo2025!", 12);
  await sql`
    INSERT INTO users (email, password_hash, role, company_id, first_name, last_name)
    VALUES ('admin@demo.ch', ${hash}, 'admin', ${company.id}, 'Admin', 'Demo')
  `;
  const EMPLOYEES = [
    {
      first_name: "Marc",
      last_name: "Dupont",
      email: "marc.dupont@dupont-industries.ch",
      birthdate: "1986-05-14",
      hire_date: "2019-03-01",
      contract_type: "CDI",
      permit_type: "CH",
      activity_rate: 100,
      weekly_hours: 42,
      salary_type: "monthly",
      salary_amount: 5800,
      department: "Production",
      position: "Chef d'atelier",
      vacation_weeks: 5
    },
    {
      first_name: "Sophie",
      last_name: "M\xFCller",
      email: "sophie.mueller@dupont-industries.ch",
      birthdate: "1995-09-22",
      hire_date: "2021-06-15",
      contract_type: "CDI",
      permit_type: "B",
      permit_expiry: "2026-09-30",
      activity_rate: 80,
      weekly_hours: 34,
      salary_type: "monthly",
      salary_amount: 4200,
      department: "Administration",
      position: "Assistante RH",
      vacation_weeks: 5
    },
    {
      first_name: "Carlos",
      last_name: "Garc\xEDa",
      email: "carlos.garcia@dupont-industries.ch",
      birthdate: "1990-03-08",
      hire_date: "2024-01-01",
      contract_type: "CDD",
      permit_type: "G",
      permit_expiry: "2025-12-31",
      activity_rate: 100,
      weekly_hours: 42,
      salary_type: "monthly",
      salary_amount: 3900,
      department: "Logistique",
      position: "Magasinier",
      vacation_weeks: 5
    },
    {
      first_name: "Anna",
      last_name: "Schneider",
      email: "anna.schneider@dupont-industries.ch",
      birthdate: "1979-11-30",
      hire_date: "2015-11-01",
      contract_type: "CDI",
      permit_type: "CH",
      activity_rate: 100,
      weekly_hours: 42,
      salary_type: "monthly",
      salary_amount: 7200,
      department: "Direction",
      position: "Responsable RH",
      vacation_weeks: 6
    },
    {
      first_name: "Lucie",
      last_name: "Favre",
      email: "lucie.favre@dupont-industries.ch",
      birthdate: "2000-04-17",
      hire_date: "2023-08-01",
      contract_type: "Horaire",
      permit_type: "CH",
      activity_rate: 100,
      weekly_hours: 42,
      salary_type: "hourly",
      salary_amount: 28.5,
      department: "Production",
      position: "Op\xE9ratrice",
      vacation_weeks: 5
    }
  ];
  const empIds = [];
  for (const emp of EMPLOYEES) {
    const [e] = await sql`
      INSERT INTO employees (
        company_id, first_name, last_name, email, birthdate, hire_date,
        contract_type, permit_type, permit_expiry,
        activity_rate, weekly_hours, salary_type, salary_amount,
        department, position, vacation_weeks, is_active
      ) VALUES (
        ${company.id}, ${emp.first_name}, ${emp.last_name}, ${emp.email},
        ${emp.birthdate}, ${emp.hire_date},
        ${emp.contract_type}, ${emp.permit_type}, ${emp.permit_expiry || null},
        ${emp.activity_rate}, ${emp.weekly_hours},
        ${emp.salary_type}, ${emp.salary_amount},
        ${emp.department}, ${emp.position}, ${emp.vacation_weeks}, true
      ) RETURNING id
    `;
    empIds.push(e.id);
  }
  const BALANCES = [
    { idx: 0, entitled: 25, taken: 8 },
    { idx: 1, entitled: 20, taken: 3 },
    { idx: 2, entitled: 25, taken: 12 },
    { idx: 3, entitled: 30, taken: 15 },
    { idx: 4, entitled: 25, taken: 6 }
  ];
  for (const b of BALANCES) {
    await sql`
      INSERT INTO vacation_balances (
        employee_id, company_id, year,
        entitled_days, taken_days, balance_days, carried_over_days
      ) VALUES (
        ${empIds[b.idx]}, ${company.id}, 2025,
        ${b.entitled}, ${b.taken}, ${b.entitled - b.taken}, 0
      ) ON CONFLICT DO NOTHING
    `;
  }
  const ABS = [
    { idx: 0, type: "vacation", start: "2025-03-03", end: "2025-03-07", status: "approved" },
    { idx: 1, type: "illness", start: "2025-02-10", end: "2025-02-12", status: "approved" },
    { idx: 2, type: "vacation", start: "2025-03-24", end: "2025-03-28", status: "pending" },
    { idx: 3, type: "family", start: "2025-02-20", end: "2025-02-20", status: "approved" },
    { idx: 4, type: "vacation", start: "2025-04-14", end: "2025-04-18", status: "pending" }
  ];
  for (const a of ABS) {
    const d1 = new Date(a.start), d2 = new Date(a.end);
    const days = Math.round((d2.getTime() - d1.getTime()) / 864e5) + 1;
    await sql`
      INSERT INTO absence_requests (
        employee_id, company_id, absence_type,
        start_date, end_date, days_count, status, submitted_at
      ) VALUES (
        ${empIds[a.idx]}, ${company.id}, ${a.type},
        ${a.start}, ${a.end}, ${days}, ${a.status}, NOW()
      )
    `;
  }
  const TODAY = /* @__PURE__ */ new Date();
  const MON = new Date(TODAY);
  MON.setDate(TODAY.getDate() - TODAY.getDay() + 1);
  for (let d = 0; d < 5; d++) {
    const dt = new Date(MON);
    dt.setDate(MON.getDate() + d);
    const dateStr = dt.toISOString().split("T")[0];
    for (let i = 0; i < 3; i++) {
      const startH = 8 + (i % 2 === 0 ? 0 : 0.25);
      const endH = 17 + (d % 3 === 0 ? 0.5 : 0);
      const worked = endH - startH - 0.5;
      const target = EMPLOYEES[i].weekly_hours / 5;
      const ot = Math.max(0, worked - target);
      await sql`
        INSERT INTO time_entries (
          employee_id, company_id, work_date,
          start_time, end_time, break_minutes,
          worked_hours, overtime_hours, status
        ) VALUES (
          ${empIds[i]}, ${company.id}, ${dateStr},
          ${`${Math.floor(startH).toString().padStart(2, "0")}:${String(startH % 1 * 60).padStart(2, "0")}`},
          ${`${Math.floor(endH).toString().padStart(2, "0")}:${String(endH % 1 * 60).padStart(2, "0")}`},
          30, ${worked}, ${ot}, 'approved'
        ) ON CONFLICT DO NOTHING
      `;
    }
  }
  console.log(`[SEED] \u2705 ${EMPLOYEES.length} employ\xE9s cr\xE9\xE9s \u2014 company_id=${company.id}`);
  console.log(`[SEED] \u{1F511} Login: admin@demo.ch / Demo2025!`);
  return {
    ok: true,
    message: `Seed OK: ${EMPLOYEES.length} employ\xE9s \xB7 Login: admin@demo.ch / Demo2025!`
  };
}
var init_seed_demo = __esm({
  "server/db/seed-demo.ts"() {
    "use strict";
    init_pool();
    if (process.argv[1].includes("seed-demo")) {
      seedDemo().then((r) => {
        console.log(r.message);
        process.exit(0);
      }).catch((e) => {
        console.error(e);
        process.exit(1);
      });
    }
  }
});

// server/index.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

// server/db/migrate.ts
init_pool();
async function migrateOnStart() {
  const sql = getSQL();
  console.log("[MIGRATE] Running migrations...");
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
  await sql`CREATE INDEX IF NOT EXISTS idx_employees_company   ON employees(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payslips_run        ON payslips(run_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payslips_employee   ON payslips(employee_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payslips_period     ON payslips(period_year, period_month)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_emp    ON time_entries(employee_id, work_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_monitor_log_date    ON monitor_log(checked_at DESC)`;
  console.log("[MIGRATE] \u2705 All migrations complete");
}

// server/db/migrate-security.ts
init_pool();
async function migrateSecurityPatches() {
  const sql = getSQL();
  console.log("[MIGRATE] Patches s\xE9curit\xE9 016-019...");
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
  console.log("[MIGRATE] \u2705 016 audit_logs");
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
  console.log("[MIGRATE] \u2705 017 data_consent");
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
  console.log("[MIGRATE] \u2705 018 data_retention_policy");
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id)
  `;
  console.log("[MIGRATE] \u2705 019 users.employee_id");
  await sql`
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS nlpd_deleted_at TIMESTAMP
  `;
  await sql`
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS nlpd_delete_reason TEXT
  `;
  console.log("[MIGRATE] \u2705 020 employees.nlpd_deleted_at");
  console.log("[MIGRATE] \u2705 Patches s\xE9curit\xE9 016-020 termin\xE9s");
}
async function migrateSso() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS sso_nonces (
      id         SERIAL PRIMARY KEY,
      nonce      VARCHAR(64) UNIQUE NOT NULL,
      email      VARCHAR(255),
      used_at    TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_sso_nonces_used_at ON sso_nonces (used_at)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50)`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS winwin_client_id INTEGER`;
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_winwin_client ON companies (winwin_client_id)`;
  console.log("[MIGRATE] \u2705 021 SSO nonces + companies.winwin_client_id");
}
async function migrateSectorDextra() {
  const sql = getSQL();
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS sector VARCHAR(30) DEFAULT 'office'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_dextra BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS cct_name VARCHAR(100)`;
  await sql`ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS night_hours DECIMAL(5,2) DEFAULT 0`;
  await sql`ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS sunday_hours DECIMAL(5,2) DEFAULT 0`;
  await sql`ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS holiday_hours DECIMAL(5,2) DEFAULT 0`;
  await sql`ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS shift_type VARCHAR(30) DEFAULT 'normal'`;
  await sql`ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS tips_amount DECIMAL(10,2) DEFAULT 0`;
  await sql`ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS notes TEXT`;
  await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS age INTEGER GENERATED ALWAYS AS (DATE_PART('year', AGE(birthdate))::int) STORED`;
  console.log("[MIGRATE] \u2705 Patch 022 \u2014 Sector + DEXTRA");
}

// server/index.ts
init_pool();

// server/monitoring/crash-monitor.ts
init_pool();
var state = {
  lastCheck: null,
  consecutiveFailures: 0,
  isDegraded: false,
  startupTime: /* @__PURE__ */ new Date(),
  aiHealthy: true
};
async function checkDatabase() {
  const sql = getSQL();
  if (!sql) return { ok: false, error: "DATABASE_URL not set" };
  try {
    const result = await sql`SELECT 1 as ping`;
    if (result[0]?.ping !== 1) throw new Error("Unexpected result");
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('companies','employees','payslips','payroll_runs')
    `;
    if (tables.length < 4) {
      return { ok: false, error: `Tables manquantes (${tables.length}/4)` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function checkDataIntegrity() {
  const sql = getSQL();
  if (!sql) return { ok: false, error: "No DB" };
  try {
    const [result] = await sql`SELECT COUNT(*)::int as count FROM companies`;
    return { ok: true, count: result.count };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function runHealthCheck() {
  const checks = {};
  const failures = [];
  checks.database = await checkDatabase();
  checks.integrity = await checkDataIntegrity();
  if (!checks.database.ok) failures.push(`DB: ${checks.database.error}`);
  if (!checks.integrity.ok) failures.push(`Integrity: ${checks.integrity.error}`);
  const status = !checks.database.ok ? "down" : failures.length > 0 ? "degraded" : "ok";
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const sql = getSQL();
  if (sql) {
    try {
      await sql`
        INSERT INTO monitor_log (status, check_type, details, failures)
        VALUES (${status}, 'periodic', ${JSON.stringify(checks)}, ${failures.join(" | ") || null})
      `;
    } catch (e) {
      console.error("[MONITOR] Log insert:", e.message);
    }
  }
  state.lastCheck = /* @__PURE__ */ new Date();
  if (failures.length > 0) {
    state.consecutiveFailures++;
    console.error(`[MONITOR] \u26A0\uFE0F ${failures.length} \xE9chec(s) \u2014 cons\xE9cutifs: ${state.consecutiveFailures}`);
    failures.forEach((f) => console.error(`  \u274C ${f}`));
    if (state.consecutiveFailures >= 2 && !state.isDegraded) {
      state.isDegraded = true;
      console.error("[MONITOR] \u{1F6A8} SERVICE D\xC9GRAD\xC9 \u2014 alerte admin");
    }
  } else {
    if (state.isDegraded) {
      const downtimeMin = state.consecutiveFailures * 5;
      console.log(`[MONITOR] \u2705 SERVICE R\xC9TABLI (downtime: ${downtimeMin} min)`);
      state.isDegraded = false;
    }
    state.consecutiveFailures = 0;
    console.log(`[MONITOR] \u2705 All checks OK \u2014 ${timestamp}`);
  }
  return { status, checks, timestamp };
}
async function startupCheck() {
  console.log("[MONITOR] \u{1F504} Startup check...");
  const sql = getSQL();
  if (sql) {
    try {
      const [last] = await sql`
        SELECT checked_at, status FROM monitor_log
        ORDER BY checked_at DESC LIMIT 1
      `;
      if (last) {
        const gapMin = (Date.now() - new Date(last.checked_at).getTime()) / 6e4;
        if (gapMin > 10) {
          const duration = gapMin < 60 ? `${Math.round(gapMin)} min` : `${(gapMin / 60).toFixed(1)}h`;
          console.warn(`[MONITOR] \u26A0\uFE0F DOWNTIME D\xC9TECT\xC9: ${duration} sans heartbeat`);
          await sql`
            INSERT INTO monitor_log (status, check_type, details)
            VALUES ('recovery', 'startup', ${`R\xE9tabli apr\xE8s ${duration} de downtime`})
          `;
        }
      }
    } catch (e) {
      console.error("[MONITOR] Startup DB check:", e.message);
    }
  }
  if (sql) {
    await sql`
      INSERT INTO monitor_log (status, check_type, details)
      VALUES ('startup', 'startup', ${`SWISSRH d\xE9marr\xE9 \u2014 ${(/* @__PURE__ */ new Date()).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}`})
    `.catch(() => {
    });
  }
  await runHealthCheck();
  console.log("[MONITOR] \u2705 Startup check termin\xE9");
}
var intervalId = null;
function startPeriodicMonitoring() {
  if (intervalId) return;
  intervalId = setInterval(async () => {
    try {
      await runHealthCheck();
    } catch (e) {
      console.error("[MONITOR] Periodic crash:", e.message);
    }
  }, 5 * 60 * 1e3);
  console.log("[MONITOR] \u{1F501} Monitoring p\xE9riodique activ\xE9 (5 min)");
}
function getMonitorState() {
  return {
    ...state,
    uptime: Math.round((Date.now() - state.startupTime.getTime()) / 6e4)
  };
}
async function getMonitorHistory(limit = 20) {
  const sql = getSQL();
  if (!sql) return [];
  try {
    return await sql`SELECT * FROM monitor_log ORDER BY checked_at DESC LIMIT ${limit}`;
  } catch {
    return [];
  }
}

// server/monitoring/routes.ts
import { Router } from "express";
var monitoringRouter = Router();
monitoringRouter.get("/health", async (_req, res) => {
  try {
    const result = await runHealthCheck();
    const httpStatus = result.status === "down" ? 503 : result.status === "degraded" ? 207 : 200;
    res.status(httpStatus).json(result);
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});
monitoringRouter.get("/status", (_req, res) => {
  res.json(getMonitorState());
});
monitoringRouter.get("/history", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  res.json({ history: await getMonitorHistory(limit) });
});

// server/auth/routes.ts
init_pool();
import { Router as Router2 } from "express";
import bcrypt from "bcryptjs";

// server/auth/middleware.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("[AUTH] JWT_SECRET_KEY manquante \u2014 obligatoire en prod");
}
var _secret = JWT_SECRET || "swissrh-dev-secret-CHANGE-IN-PROD-min-32-chars";
function signToken(payload) {
  return jwt.sign(payload, _secret, { expiresIn: "7d" });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, _secret);
  } catch {
    return null;
  }
}
function extractToken(req) {
  return req.cookies?.srh_session || req.headers.authorization?.replace("Bearer ", "") || null;
}
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Non authentifi\xE9" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Session invalide ou expir\xE9e" });
  req.user = payload;
  next();
}
function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Non authentifi\xE9" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Session invalide ou expir\xE9e" });
  if (payload.role !== "admin") {
    console.warn(`[SECURITY] \u26D4 Non-admin: ${payload.email} \u2192 ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: "Acc\xE8s r\xE9serv\xE9 \xE0 l'administrateur" });
  }
  req.user = payload;
  next();
}
function requireManager(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Non authentifi\xE9" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Session invalide ou expir\xE9e" });
  if (!["admin", "rh_manager"].includes(payload.role)) {
    console.warn(`[SECURITY] \u26D4 Non-manager: ${payload.email} \u2192 ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: "Acc\xE8s r\xE9serv\xE9 aux gestionnaires RH" });
  }
  req.user = payload;
  next();
}
function canAccessEmployee(requester, targetEmployeeId) {
  if (requester.role === "admin" || requester.role === "rh_manager") return true;
  return requester.employeeId === targetEmployeeId;
}

// server/auth/routes.ts
var authRouter = Router2();
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
    const sql = getSQL();
    const [user] = await sql`
      SELECT u.*, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${email.toLowerCase()} AND u.is_active = true
    `;
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Identifiants invalides" });
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    });
    res.cookie("srh_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    });
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        companyId: user.company_id,
        companyName: user.company_name
      }
    });
  } catch (e) {
    console.error("[AUTH] Login error:", e.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
authRouter.post("/logout", (_req, res) => {
  res.clearCookie("srh_session");
  res.json({ ok: true });
});
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { userId } = req.user;
    const sql = getSQL();
    const [user] = await sql`
      SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.company_id, u.last_login,
             c.name as company_name, c.canton
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ${userId} AND u.is_active = true
    `;
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
authRouter.post("/setup", async (req, res) => {
  try {
    const sql = getSQL();
    const [count] = await sql`SELECT COUNT(*)::int as c FROM users`;
    if (count.c > 0) return res.status(403).json({ error: "Setup d\xE9j\xE0 effectu\xE9" });
    const { email, password, companyName, canton } = req.body;
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: "email, password et companyName requis" });
    }
    const [company] = await sql`
      INSERT INTO companies (name, canton) VALUES (${companyName}, ${canton || "JU"})
      RETURNING id
    `;
    const hash = await bcrypt.hash(password, 12);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role, company_id)
      VALUES (${email.toLowerCase()}, ${hash}, 'admin', ${company.id})
      RETURNING id, email, role, company_id
    `;
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id
    });
    res.cookie("srh_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    });
    console.log(`[AUTH] \u{1F389} Setup: admin ${email} + company "${companyName}" cr\xE9\xE9s`);
    res.json({ ok: true, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
authRouter.get("/setup-check", async (_req, res) => {
  try {
    const sql = getSQL();
    const [{ c }] = await sql`SELECT COUNT(*)::int as c FROM users WHERE is_active = true`;
    res.json({ needsSetup: c === 0 });
  } catch {
    res.json({ needsSetup: false });
  }
});

// server/api/employees.ts
init_pool();
import { Router as Router3 } from "express";

// server/utils/encryption.ts
import crypto from "crypto";
var ALGO = "aes-256-gcm";
var IV_LEN = 12;
var TAG_LEN = 16;
function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[ENCRYPTION] ENCRYPTION_KEY manquante ou invalide (doit \xEAtre 64 chars hex)");
    }
    console.warn("[ENCRYPTION] \u26A0\uFE0F  Cl\xE9 de dev utilis\xE9e \u2014 ENCRYPTION_KEY manquante");
    return Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");
  }
  return Buffer.from(keyHex, "hex");
}
function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}
function decrypt(ciphertext) {
  if (ciphertext == null) return null;
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final("utf8");
  } catch {
    console.error("[ENCRYPTION] D\xE9chiffrement \xE9chou\xE9 \u2014 donn\xE9es corrompues ?");
    return null;
  }
}
function maskAvs(avs) {
  if (!avs) return "\u2014";
  const clean = avs.replace(/\D/g, "");
  if (clean.length !== 13) return "756.XXXX.XXXX.XX";
  return `${clean.slice(0, 3)}.XXXX.XXXX.XX`;
}

// server/utils/audit-log.ts
init_pool();
function audit(entry) {
  const sql = getSQL();
  sql`
    INSERT INTO audit_logs
      (user_id, user_email, user_role, company_id, action,
       resource_type, resource_id, details, ip_address)
    VALUES (
      ${entry.userId}, ${entry.userEmail}, ${entry.userRole},
      ${entry.companyId}, ${entry.action},
      ${entry.resourceType ?? null}, ${String(entry.resourceId ?? "") || null},
      ${entry.details ?? null}, ${entry.ipAddress ?? null}
    )
  `.catch((err) => console.error("[AUDIT] Write failed:", err?.message));
}
function getIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.connection?.remoteAddress || "unknown";
}

// server/api/employees.ts
var employeesRouter = Router3();
employeesRouter.get("/", requireAuth, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  const { active, search } = req.query;
  try {
    const selfFilter = user.role === "employee" && user.employeeId ? sql`AND e.id = ${user.employeeId}` : sql`1=1`;
    const employees = await sql`
      SELECT e.id, e.first_name, e.last_name, e.email, e.phone,
             e.birthdate, e.hire_date, e.end_date,
             e.contract_type, e.permit_type, e.permit_expiry,
             e.activity_rate, e.weekly_hours, e.salary_type, e.salary_amount,
             e.department, e.position, e.vacation_weeks,
             e.avs_number,
             e.address, e.npa, e.city, e.cost_center, e.is_active,
             EXTRACT(YEAR FROM AGE(e.birthdate))::int as age,
             CASE WHEN e.permit_expiry < CURRENT_DATE + 30
                   AND e.permit_expiry > CURRENT_DATE
                  THEN true ELSE false END as permit_expiring_soon
      FROM employees e
      WHERE e.company_id = ${user.companyId}
        AND (${active === "false" ? sql`1=1` : sql`e.is_active = true`})
        AND (${search ? sql`
          LOWER(e.first_name || ' ' || e.last_name) LIKE ${"%" + String(search).toLowerCase() + "%"}
        ` : sql`1=1`})
        AND ${selfFilter}
      ORDER BY e.last_name, e.first_name
    `;
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "VIEW_EMPLOYEE_LIST",
      details: `${employees.length} employ\xE9s`,
      ipAddress: getIp(req)
    });
    const isPrivileged = user.role === "admin" || user.role === "rh_manager";
    const mapped = employees.map((e) => ({
      ...e,
      avs_number: isPrivileged ? decrypt(e.avs_number) : maskAvs(decrypt(e.avs_number))
      // employee : masqué
    }));
    res.json({ ok: true, employees: mapped });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
employeesRouter.get("/:id", requireAuth, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  const targetId = parseInt(req.params.id);
  if (!canAccessEmployee(user, targetId)) {
    return res.status(403).json({ error: "Acc\xE8s non autoris\xE9" });
  }
  try {
    const [emp] = await sql`
      SELECT e.*,
             EXTRACT(YEAR FROM AGE(e.birthdate))::int as age
      FROM employees e
      WHERE e.id = ${targetId} AND e.company_id = ${user.companyId}
    `;
    if (!emp) return res.status(404).json({ error: "Employ\xE9 introuvable" });
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "VIEW_EMPLOYEE",
      resourceType: "employee",
      resourceId: targetId,
      ipAddress: getIp(req)
    });
    const isPrivileged = user.role === "admin" || user.role === "rh_manager";
    res.json({
      ok: true,
      employee: {
        ...emp,
        avs_number: isPrivileged ? decrypt(emp.avs_number) : maskAvs(decrypt(emp.avs_number)),
        avs_masked: maskAvs(decrypt(emp.avs_number))
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
employeesRouter.post("/", requireManager, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      birthdate,
      hireDate,
      contractType,
      permitType,
      permitExpiry,
      activityRate,
      weeklyHours,
      salaryType,
      salaryAmount,
      department,
      position,
      vacationWeeks,
      avsNumber,
      address,
      npa,
      city,
      costCenter
    } = req.body;
    if (!firstName || !lastName || !hireDate) {
      return res.status(400).json({ error: "firstName, lastName et hireDate requis" });
    }
    const encryptedAvs = avsNumber ? encrypt(avsNumber) : null;
    const [emp] = await sql`
      INSERT INTO employees (
        company_id, first_name, last_name, email, phone,
        birthdate, hire_date, contract_type, permit_type, permit_expiry,
        activity_rate, weekly_hours, salary_type, salary_amount,
        department, position, vacation_weeks, avs_number,
        address, npa, city, cost_center
      ) VALUES (
        ${user.companyId}, ${firstName}, ${lastName}, ${email || null}, ${phone || null},
        ${birthdate || null}, ${hireDate}, ${contractType || "CDI"}, ${permitType || "CH"},
        ${permitExpiry || null},
        ${activityRate || 100}, ${weeklyHours || 42}, ${salaryType || "monthly"},
        ${salaryAmount || 0}, ${department || null}, ${position || null},
        ${vacationWeeks || 5}, ${encryptedAvs},
        ${address || null}, ${npa || null}, ${city || null}, ${costCenter || null}
      )
      RETURNING *
    `;
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "UPDATE_EMPLOYEE",
      resourceType: "employee",
      resourceId: emp.id,
      details: `Cr\xE9ation: ${firstName} ${lastName}`,
      ipAddress: getIp(req)
    });
    res.json({
      ok: true,
      employee: {
        ...emp,
        avs_number: maskAvs(avsNumber)
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
employeesRouter.put("/:id", requireManager, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  const id = parseInt(req.params.id);
  try {
    const [existing] = await sql`
      SELECT id FROM employees WHERE id = ${id} AND company_id = ${user.companyId}
    `;
    if (!existing) return res.status(404).json({ error: "Employ\xE9 introuvable" });
    const {
      firstName,
      lastName,
      email,
      phone,
      birthdate,
      hireDate,
      endDate,
      contractType,
      permitType,
      permitExpiry,
      activityRate,
      weeklyHours,
      salaryType,
      salaryAmount,
      department,
      position,
      vacationWeeks,
      avsNumber,
      address,
      npa,
      city,
      costCenter,
      isActive,
      notes
    } = req.body;
    const encryptedAvs = avsNumber !== void 0 ? encrypt(avsNumber) : void 0;
    const [emp] = await sql`
      UPDATE employees SET
        first_name    = COALESCE(${firstName}, first_name),
        last_name     = COALESCE(${lastName}, last_name),
        email         = ${email ?? null},
        phone         = ${phone ?? null},
        birthdate     = ${birthdate ?? null},
        hire_date     = COALESCE(${hireDate}, hire_date),
        end_date      = ${endDate ?? null},
        contract_type = COALESCE(${contractType}, contract_type),
        permit_type   = COALESCE(${permitType}, permit_type),
        permit_expiry = ${permitExpiry ?? null},
        activity_rate = COALESCE(${activityRate}, activity_rate),
        weekly_hours  = COALESCE(${weeklyHours}, weekly_hours),
        salary_type   = COALESCE(${salaryType}, salary_type),
        salary_amount = COALESCE(${salaryAmount}, salary_amount),
        department    = ${department ?? null},
        position      = ${position ?? null},
        vacation_weeks= COALESCE(${vacationWeeks}, vacation_weeks),
        avs_number    = ${encryptedAvs !== void 0 ? encryptedAvs : sql`avs_number`},
        address       = ${address ?? null},
        npa           = ${npa ?? null},
        city          = ${city ?? null},
        cost_center   = ${costCenter ?? null},
        is_active     = COALESCE(${isActive}, is_active),
        notes         = ${notes ?? null},
        updated_at    = NOW()
      WHERE id = ${id} AND company_id = ${user.companyId}
      RETURNING *
    `;
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "UPDATE_EMPLOYEE",
      resourceType: "employee",
      resourceId: id,
      details: `Modification employ\xE9 ${id}`,
      ipAddress: getIp(req)
    });
    res.json({
      ok: true,
      employee: {
        ...emp,
        avs_number: maskAvs(decrypt(emp.avs_number))
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
employeesRouter.delete("/:id", requireManager, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  const id = parseInt(req.params.id);
  try {
    await sql`
      UPDATE employees
      SET is_active = false, end_date = CURRENT_DATE, updated_at = NOW()
      WHERE id = ${id} AND company_id = ${user.companyId}
    `;
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "DELETE_EMPLOYEE",
      resourceType: "employee",
      resourceId: id,
      ipAddress: getIp(req)
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
employeesRouter.get("/alerts/permits", requireManager, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  try {
    const alerts = await sql`
      SELECT id, first_name, last_name, permit_type, permit_expiry,
        (permit_expiry - CURRENT_DATE)::int as days_remaining
      FROM employees
      WHERE company_id = ${user.companyId}
        AND is_active = true
        AND permit_type NOT IN ('CH', 'C')
        AND permit_expiry IS NOT NULL
        AND permit_expiry <= CURRENT_DATE + 60
      ORDER BY permit_expiry ASC
    `;
    res.json({ ok: true, alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// server/api/salary.ts
init_pool();
import { Router as Router4 } from "express";

// server/utils/swiss-salary.ts
var RATES_2025 = {
  avs: 0.053,
  ai: 7e-3,
  apg: 225e-5,
  ac: 0.011,
  ac_threshold_monthly: 12350,
  // 148'200 / 12
  lpp: {
    min_age: 25,
    rates: [
      { from: 25, to: 34, rate: 0.07 },
      { from: 35, to: 44, rate: 0.1 },
      { from: 45, to: 54, rate: 0.15 },
      { from: 55, to: 99, rate: 0.18 }
    ],
    coordination_monthly: 2143.75,
    // 25'725 / 12
    entry_threshold_monthly: 1837.5
    // 22'050 / 12
  },
  laa_np: 0.013,
  // NBUV — employé uniquement
  laa_p: 8e-3,
  // BUV  — employeur uniquement
  // LAAC — LAA Complémentaire (sur salaire > plafond LAA 12'350/mois)
  laac: {
    ceiling_monthly: 12350,
    // = plafond LAA
    employee_rate: 5e-3,
    // 0.5% — taux indicatif, surcharger selon police
    employer_rate: 5e-3
    // 0.5% — idem
  },
  ijm: 75e-4,
  // 0.75% chacun employé/employeur
  fam_alloc: 0.014,
  // allocations familiales — employeur uniquement
  overtime_rate: 0.25,
  // CO Art. 321c
  night_rate: 0.25,
  // LTr Art. 17b (23h–06h)
  sunday_rate: 0.5,
  // LTr Art. 19
  holiday_rate: 1,
  vacation: {
    4: 8.33 / 100,
    5: 10.64 / 100,
    6: 13.04 / 100
  }
};
function getLppRate(age) {
  if (age < RATES_2025.lpp.min_age) return 0;
  for (const b of RATES_2025.lpp.rates) {
    if (age >= b.from && age <= b.to) return b.rate;
  }
  return 0;
}
function calculateSalary(input) {
  const {
    age,
    activityRate = 100,
    hasLpp = true,
    hasLaa = true,
    hasLaac = false,
    laacEmployeeRate = RATES_2025.laac.employee_rate,
    laacEmployerRate = RATES_2025.laac.employer_rate,
    hasIjm = true,
    familyAllowance = 0,
    isHourly = false,
    hourlyRate = 0,
    hoursNormal = 0,
    hoursExtra25 = 0,
    hoursNight = 0,
    hoursSunday = 0,
    hoursHoliday = 0,
    vacationWeeks = 5,
    bonus = 0
  } = input;
  const r = RATES_2025;
  let grossBase = 0, grossHours = 0, grossExtra25 = 0, grossNight = 0;
  let grossSunday = 0, grossHoliday = 0, grossVacation = 0;
  if (isHourly && hourlyRate > 0) {
    grossHours = hoursNormal * hourlyRate;
    grossExtra25 = hoursExtra25 * hourlyRate * (1 + r.overtime_rate);
    grossNight = hoursNight * hourlyRate * (1 + r.night_rate);
    grossSunday = hoursSunday * hourlyRate * (1 + r.sunday_rate);
    grossHoliday = hoursHoliday * hourlyRate;
    const vacRate = r.vacation[vacationWeeks] ?? r.vacation[5];
    grossVacation = (grossHours + grossExtra25 + grossNight + grossSunday + grossHoliday + bonus) * vacRate;
  } else {
    grossBase = input.grossMonthly * (activityRate / 100);
  }
  const grossBonus = bonus;
  const grossTotal = grossBase + grossHours + grossExtra25 + grossNight + grossSunday + grossHoliday + grossVacation + grossBonus;
  const acBase = Math.min(grossTotal, r.ac_threshold_monthly);
  const lppRate = hasLpp ? getLppRate(age) : 0;
  const lppBase = hasLpp && grossTotal >= r.lpp.entry_threshold_monthly ? Math.max(0, grossTotal - r.lpp.coordination_monthly) : 0;
  const lpp = lppBase * (lppRate / 2);
  const isAboveLaaCeiling = grossTotal > r.laac.ceiling_monthly;
  const laacBase = hasLaac && isAboveLaaCeiling ? grossTotal - r.laac.ceiling_monthly : 0;
  const laac = laacBase * laacEmployeeRate;
  const laacEr = laacBase * laacEmployerRate;
  const avs = grossTotal * r.avs;
  const ai = grossTotal * r.ai;
  const apg = grossTotal * r.apg;
  const ac = acBase * r.ac;
  const laaNp = hasLaa ? grossTotal * r.laa_np : 0;
  const ijm = hasIjm ? grossTotal * r.ijm : 0;
  const totalDeductions = avs + ai + apg + ac + lpp + laaNp + laac + ijm - familyAllowance;
  const netSalary = grossTotal - totalDeductions;
  const avsEr = grossTotal * r.avs;
  const aiEr = grossTotal * r.ai;
  const apgEr = grossTotal * r.apg;
  const acEr = acBase * r.ac;
  const lppEr = lpp;
  const laaPEr = hasLaa ? grossTotal * r.laa_p : 0;
  const ijmEr = hasIjm ? grossTotal * r.ijm : 0;
  const famAllocEr = grossTotal * r.fam_alloc;
  const totalEmployer = avsEr + aiEr + apgEr + acEr + lppEr + laaPEr + laacEr + ijmEr + famAllocEr;
  const totalCost = grossTotal + totalEmployer;
  return {
    grossBase,
    grossHours,
    grossExtra25,
    grossNight,
    grossSunday,
    grossHoliday,
    grossVacation,
    grossBonus,
    grossTotal,
    avs,
    ai,
    apg,
    ac,
    lpp,
    lppRate: lppRate / 2,
    laaNp,
    laac,
    laacBase,
    ijm,
    familyAllowance,
    totalDeductions,
    netSalary,
    avsEr,
    aiEr,
    apgEr,
    acEr,
    lppEr,
    laaPEr,
    laacEr,
    ijmEr,
    famAllocEr,
    totalEmployer,
    totalCost,
    lppBase,
    acBase,
    isAboveLaaCeiling
  };
}
function hmmToCent(h, m) {
  return h + m / 60;
}
function parseTimeInput(val) {
  if (!val?.trim()) return null;
  val = val.trim();
  if (/^\d+[.,]\d+$/.test(val)) return parseFloat(val.replace(",", "."));
  if (/^\d+:\d{1,2}$/.test(val)) {
    const [h, m] = val.split(":");
    return hmmToCent(+h, +m);
  }
  if (/^\d+$/.test(val)) return +val;
  return null;
}
var VACATION_RATES = { 4: 8.33 / 100, 5: 10.64 / 100, 6: 13.04 / 100 };

// server/api/salary.ts
var salaryRouter = Router4();
salaryRouter.post("/calculate", (req, res) => {
  try {
    const result = calculateSalary(req.body);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
salaryRouter.post("/payslip", async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const sql = getSQL();
    const {
      employeeId,
      periodYear,
      periodMonth,
      runId = null,
      ...salaryInput
    } = req.body;
    if (!employeeId || !periodYear || !periodMonth) {
      return res.status(400).json({ error: "employeeId, periodYear, periodMonth requis" });
    }
    const [emp] = await sql`
      SELECT * FROM employees WHERE id = ${employeeId} AND company_id = ${companyId} AND is_active = true
    `;
    if (!emp) return res.status(404).json({ error: "Employ\xE9 introuvable" });
    const result = calculateSalary(salaryInput);
    const [payslip] = await sql`
      INSERT INTO payslips (
        run_id, employee_id, company_id, period_year, period_month,
        gross_salary, activity_rate,
        hours_normal, hours_extra_25, hours_night, hours_sunday, hours_holiday,
        vacation_indemnity, bonus,
        avs_employee, ai_employee, apg_employee, ac_employee,
        lpp_employee, lpp_rate, laa_np_employee, ijm_employee,
        family_allowance, other_deductions, total_deductions,
        net_salary,
        avs_employer, ai_employer, apg_employer, ac_employer,
        lpp_employer, laa_p_employer, ijm_employer, fam_alloc_employer,
        total_employer, total_cost
      ) VALUES (
        ${runId}, ${employeeId}, ${companyId}, ${periodYear}, ${periodMonth},
        ${result.grossTotal}, ${salaryInput.activityRate || 100},
        ${salaryInput.hoursNormal || 0}, ${salaryInput.hoursExtra25 || 0},
        ${salaryInput.hoursNight || 0}, ${salaryInput.hoursSunday || 0}, ${salaryInput.hoursHoliday || 0},
        ${result.grossVacation}, ${result.grossBonus},
        ${result.avs}, ${result.ai}, ${result.apg}, ${result.ac},
        ${result.lpp}, ${result.lppRate}, ${result.laaNp}, ${result.ijm},
        ${result.familyAllowance}, 0, ${result.totalDeductions},
        ${result.netSalary},
        ${result.avsEr}, ${result.aiEr}, ${result.apgEr}, ${result.acEr},
        ${result.lppEr}, ${result.laaPEr}, ${result.ijmEr}, ${result.famAllocEr},
        ${result.totalEmployer}, ${result.totalCost}
      )
      RETURNING *
    `;
    res.json({ ok: true, payslip, calculation: result });
  } catch (e) {
    console.error("[SALARY] Payslip create:", e.message);
    res.status(500).json({ error: e.message });
  }
});
salaryRouter.get("/payslips", async (req, res) => {
  try {
    const { companyId } = req.user;
    const { year, month, employeeId } = req.query;
    const sql = getSQL();
    let payslips;
    if (employeeId) {
      payslips = await sql`
        SELECT p.*, e.first_name, e.last_name, e.salary_type
        FROM payslips p JOIN employees e ON p.employee_id = e.id
        WHERE p.company_id = ${companyId}
          AND (${year ? sql`p.period_year = ${Number(year)}` : sql`1=1`})
          AND (${month ? sql`p.period_month = ${Number(month)}` : sql`1=1`})
          AND p.employee_id = ${Number(employeeId)}
        ORDER BY p.period_year DESC, p.period_month DESC
      `;
    } else {
      payslips = await sql`
        SELECT p.*, e.first_name, e.last_name, e.salary_type
        FROM payslips p JOIN employees e ON p.employee_id = e.id
        WHERE p.company_id = ${companyId}
          AND (${year ? sql`p.period_year = ${Number(year)}` : sql`1=1`})
          AND (${month ? sql`p.period_month = ${Number(month)}` : sql`1=1`})
        ORDER BY p.period_year DESC, p.period_month DESC
        LIMIT 200
      `;
    }
    res.json({ ok: true, payslips });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
salaryRouter.post("/time/parse", (req, res) => {
  const { value } = req.body;
  const result = parseTimeInput(value);
  if (result === null) return res.status(400).json({ error: "Format invalide. Utilisez 8.50 ou 8:30" });
  const hours = Math.floor(result);
  const minutes = Math.round((result - hours) * 60);
  res.json({ ok: true, centesimals: result, hours, minutes, str: `${hours}h${String(minutes).padStart(2, "0")}` });
});

// server/api/pdf-payslip.ts
init_pool();
import { Router as Router5 } from "express";
import PDFDocument from "pdfkit";
var pdfRouter = Router5();
pdfRouter.get("/payslip/:id/pdf", requireAuth, async (req, res) => {
  try {
    const { companyId, role } = req.user;
    const sql = getSQL();
    const psId = Number(req.params.id);
    const [ps] = await sql`
      SELECT p.*,
        e.first_name, e.last_name, e.avs_number, e.birthdate,
        e.hire_date, e.contract_type, e.permit_type,
        e.activity_rate, e.department, e.position,
        e.salary_type,
        c.name as company_name, c.legal_form, c.address,
        c.npa, c.city, c.canton, c.uid as company_uid,
        c.avs_number as company_avs, c.laa_number
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      JOIN companies c ON p.company_id = c.id
      WHERE p.id = ${psId} AND p.company_id = ${companyId}
    `;
    if (!ps) return res.status(404).json({ error: "Bulletin introuvable" });
    if (role === "employee") {
      const { userId } = req.user;
      const [emp] = await sql`SELECT id FROM employees WHERE id = ${ps.employee_id}`;
    }
    const month = new Date(ps.period_year, ps.period_month - 1).toLocaleString("fr-CH", { month: "long", year: "numeric" });
    const fmt = (n) => n == null ? "0.00" : Number(n).toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bulletin-${ps.last_name}-${ps.period_year}-${String(ps.period_month).padStart(2, "0")}.pdf"`
    );
    res.setHeader("Cache-Control", "no-store");
    doc.pipe(res);
    const M = 45;
    const W = 595 - M * 2;
    const BLUE = "#366389";
    const RED = "#B32D26";
    const DARK = "#1a2332";
    const GRAY = "#5a6578";
    const LGRAY = "#f3f5f9";
    doc.rect(0, 0, 595, 72).fill(DARK);
    doc.fontSize(22).font("Helvetica-Bold").fillColor("#ffffff").text("SwissRH", M, 20);
    doc.fontSize(9).font("Helvetica").fillColor("rgba(255,255,255,0.55)").text("Bulletin de salaire", M, 46);
    doc.roundedRect(595 - M - 110, 18, 110, 36, 6).fill(BLUE);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff").text(month, 595 - M - 105, 27, { width: 100, align: "center" });
    doc.moveDown();
    let y = 88;
    doc.rect(M, y, W / 2 - 8, 72).fill(LGRAY);
    doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY).text("EMPLOYEUR", M + 10, y + 10);
    doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK).text(ps.company_name + (ps.legal_form ? ` ${ps.legal_form}` : ""), M + 10, y + 22, { width: W / 2 - 28 });
    doc.fontSize(8).font("Helvetica").fillColor(GRAY).text(`${ps.address || ""}`, M + 10, y + 38, { width: W / 2 - 28 }).text(`${ps.npa || ""} ${ps.city || ""} \xB7 ${ps.canton || ""}`, M + 10, y + 50);
    if (ps.company_avs) {
      doc.text(`No AVS: ${ps.company_avs}`, M + 10, y + 62);
    }
    const ex = M + W / 2 + 8;
    doc.rect(ex, y, W / 2 - 8, 72).fill(LGRAY);
    doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY).text("EMPLOY\xC9(E)", ex + 10, y + 10);
    doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK).text(`${ps.first_name} ${ps.last_name}`, ex + 10, y + 22);
    doc.fontSize(8).font("Helvetica").fillColor(GRAY);
    const lines = [];
    if (ps.position) lines.push(ps.position);
    if (ps.department) lines.push(ps.department);
    if (ps.contract_type) lines.push(`Contrat: ${ps.contract_type} \xB7 ${ps.activity_rate}%`);
    if (ps.avs_number) lines.push(`AVS: ${ps.avs_number}`);
    if (ps.permit_type !== "CH") lines.push(`Permis: ${ps.permit_type}`);
    lines.forEach((l, i) => doc.text(l, ex + 10, y + 36 + i * 11));
    y += 84;
    const section = (title, yPos, color = BLUE) => {
      doc.rect(M, yPos, W, 18).fill(color);
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff").text(title, M + 8, yPos + 5);
      return yPos + 18;
    };
    const row = (label, amount, yPos, bold = false, indent = 0) => {
      if (yPos % 2 === 0) doc.rect(M, yPos, W, 14).fill("#fafbfc");
      doc.fontSize(8).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(DARK).text(label, M + 8 + indent, yPos + 3, { width: W - 100 });
      doc.fontSize(8).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(bold ? DARK : GRAY).text(`CHF ${amount}`, M + W - 88, yPos + 3, { width: 88, align: "right" });
      doc.moveTo(M, yPos + 14).lineTo(M + W, yPos + 14).stroke("#e9ecf0");
      return yPos + 14;
    };
    const totalRow = (label, amount, yPos, bgColor = BLUE) => {
      doc.rect(M, yPos, W, 18).fill(bgColor);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff").text(label, M + 8, yPos + 4);
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff").text(`CHF ${amount}`, M + W - 90, yPos + 4, { width: 90, align: "right" });
      return yPos + 18;
    };
    y = section("REVENUS", y);
    y = row("Salaire de base", fmt(ps.gross_salary), y);
    if (parseFloat(ps.vacation_indemnity) > 0)
      y = row("Indemnit\xE9 vacances (8.33%)", fmt(ps.vacation_indemnity), y, false, 8);
    if (parseFloat(ps.bonus) > 0)
      y = row("Bonus / gratification", fmt(ps.bonus), y, false, 8);
    if (parseFloat(ps.hours_extra_25) > 0)
      y = row(`Heures suppl\xE9mentaires (25%)`, fmt(ps.hours_extra_25), y, false, 8);
    if (parseFloat(ps.hours_night) > 0)
      y = row("Suppl\xE9ment nuit", fmt(ps.hours_night), y, false, 8);
    if (parseFloat(ps.family_allowance) > 0)
      y = row("Allocations familiales", fmt(ps.family_allowance), y, false, 8);
    y = totalRow("SALAIRE BRUT", fmt(ps.gross_salary), y);
    y += 8;
    y = section("D\xC9DUCTIONS EMPLOY\xC9", y);
    if (parseFloat(ps.avs_employee) > 0) y = row("AVS (5.30%)", fmt(ps.avs_employee), y);
    if (parseFloat(ps.ai_employee) > 0) y = row("AI (0.70%)", fmt(ps.ai_employee), y);
    if (parseFloat(ps.apg_employee) > 0) y = row("APG (0.225%)", fmt(ps.apg_employee), y);
    if (parseFloat(ps.ac_employee) > 0) y = row("AC (1.10%)", fmt(ps.ac_employee), y);
    if (parseFloat(ps.lpp_employee) > 0) {
      const lppPct = ps.lpp_rate ? `${(ps.lpp_rate * 100).toFixed(1)}%` : "";
      y = row(`LPP / 2e pilier ${lppPct}`, fmt(ps.lpp_employee), y);
    }
    if (parseFloat(ps.laa_np_employee) > 0) y = row("LAA NP (1.30%)", fmt(ps.laa_np_employee), y);
    if (parseFloat(ps.ijm_employee) > 0) y = row("IJM / perte gain (0.75%)", fmt(ps.ijm_employee), y);
    if (parseFloat(ps.total_deductions) > 0)
      y = totalRow("TOTAL D\xC9DUCTIONS", fmt(ps.total_deductions), y, RED);
    y += 8;
    doc.rect(M, y, W, 24).fill(DARK);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#ffffff").text("SALAIRE NET", M + 8, y + 6);
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff").text(`CHF ${fmt(ps.net_salary)}`, M + W - 120, y + 5, { width: 120, align: "right" });
    y += 32;
    if (y < 700) {
      y += 4;
      y = section("CHARGES PATRONALES (information)", y, "#94a3b8");
      if (parseFloat(ps.avs_employer) > 0) y = row("AVS/AI/APG employeur", fmt(parseFloat(ps.avs_employer) + parseFloat(ps.ai_employer) + parseFloat(ps.apg_employer)), y);
      if (parseFloat(ps.ac_employer) > 0) y = row("AC employeur", fmt(ps.ac_employer), y);
      if (parseFloat(ps.lpp_employer) > 0) y = row("LPP employeur", fmt(ps.lpp_employer), y);
      if (parseFloat(ps.laa_p_employer) > 0) y = row("LAA P employeur", fmt(ps.laa_p_employer), y);
      if (parseFloat(ps.ijm_employer) > 0) y = row("IJM employeur", fmt(ps.ijm_employer), y);
      if (parseFloat(ps.fam_alloc_employer) > 0) y = row("Allocations familiales", fmt(ps.fam_alloc_employer), y);
      y = totalRow("CO\xDBT TOTAL EMPLOYEUR", fmt(ps.total_cost), y, "#64748b");
    }
    doc.rect(0, 780, 595, 62).fill(DARK);
    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.45)").text(
      `SwissRH \xB7 ${ps.company_name} \xB7 Taux officiels 2025 \xB7 Document g\xE9n\xE9r\xE9 le ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-CH")} \xB7 CONFIDENTIEL`,
      M,
      793,
      { width: 595 - M * 2, align: "center" }
    );
    doc.fontSize(7).fillColor("rgba(255,255,255,0.3)").text(
      "Ce bulletin de salaire est \xE9tabli selon les bases l\xE9gales suisses (CO, LIFD, LAA, LPP, LAVS). Format ELM non certifi\xE9 Swissdec.",
      M,
      806,
      { width: 595 - M * 2, align: "center" }
    );
    doc.end();
  } catch (e) {
    console.error("[PDF]", e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});
pdfRouter.get("/payslips/run/:year/:month/pdf", requireAuth, requireManager, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { year, month } = req.params;
    const sql = getSQL();
    const payslips = await sql`
      SELECT p.id FROM payslips p
      WHERE p.company_id = ${companyId}
        AND p.period_year = ${Number(year)}
        AND p.period_month = ${Number(month)}
      ORDER BY p.id
    `;
    if (payslips.length === 0)
      return res.status(404).json({ error: "Aucun bulletin pour cette p\xE9riode" });
    res.json({
      ok: true,
      count: payslips.length,
      ids: payslips.map((p) => p.id),
      downloadAll: `/api/salary/payslips/batch-download?year=${year}&month=${month}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// server/api/reports.ts
init_pool();
import { Router as Router6 } from "express";
var reportsRouter = Router6();
reportsRouter.get("/dashboard", async (req, res) => {
  try {
    const { companyId } = req.user;
    const sql = getSQL();
    const { year = (/* @__PURE__ */ new Date()).getFullYear(), month = (/* @__PURE__ */ new Date()).getMonth() + 1 } = req.query;
    const [empCount] = await sql`
      SELECT COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE permit_type IN ('B','G','L') AND permit_expiry <= CURRENT_DATE + 60)::int as permits_expiring
      FROM employees
      WHERE company_id = ${companyId} AND is_active = true
    `;
    const [payroll] = await sql`
      SELECT
        COALESCE(SUM(gross_salary)::numeric, 0) as total_gross,
        COALESCE(SUM(net_salary)::numeric, 0) as total_net,
        COALESCE(SUM(total_employer)::numeric, 0) as total_employer_cost,
        COUNT(*)::int as payslips_count
      FROM payslips
      WHERE company_id = ${companyId}
        AND period_year = ${Number(year)}
        AND period_month = ${Number(month)}
    `;
    const [lastMonth] = await sql`
      SELECT COALESCE(SUM(gross_salary)::numeric, 0) as total_gross
      FROM payslips
      WHERE company_id = ${companyId}
        AND period_year = ${Number(month) === 1 ? Number(year) - 1 : Number(year)}
        AND period_month = ${Number(month) === 1 ? 12 : Number(month) - 1}
    `;
    const currentGross = parseFloat(payroll.total_gross);
    const lastGross = parseFloat(lastMonth.total_gross);
    const trend = lastGross > 0 ? ((currentGross - lastGross) / lastGross * 100).toFixed(1) : "0.0";
    res.json({
      ok: true,
      period: { year: Number(year), month: Number(month) },
      employees: { total: empCount.total, permitsExpiring: empCount.permits_expiring },
      payroll: {
        totalGross: currentGross,
        totalNet: parseFloat(payroll.total_net),
        totalEmployerCost: parseFloat(payroll.total_employer_cost),
        payslipsCount: payroll.payslips_count,
        trendVsLastMonth: `${Number(trend) >= 0 ? "+" : ""}${trend}%`
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
reportsRouter.get("/avs", async (req, res) => {
  try {
    const { companyId } = req.user;
    const { year = (/* @__PURE__ */ new Date()).getFullYear() } = req.query;
    const sql = getSQL();
    const rows = await sql`
      SELECT e.first_name, e.last_name, e.avs_number,
        SUM(p.gross_salary)::numeric as annual_gross,
        SUM(p.avs_employee)::numeric as avs_employee_total,
        SUM(p.avs_employer)::numeric as avs_employer_total
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${companyId} AND p.period_year = ${Number(year)}
      GROUP BY e.id, e.first_name, e.last_name, e.avs_number
      ORDER BY e.last_name
    `;
    res.json({ ok: true, year: Number(year), declarations: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// server/api/company.ts
init_pool();
import { Router as Router7 } from "express";
var companyRouter = Router7();
companyRouter.get("/", async (req, res) => {
  try {
    const { companyId } = req.user;
    const sql = getSQL();
    const [company] = await sql`SELECT * FROM companies WHERE id = ${companyId}`;
    res.json({ ok: true, company });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
companyRouter.put("/", async (req, res) => {
  try {
    const { companyId } = req.user;
    const sql = getSQL();
    const {
      name,
      legalForm,
      uid,
      address,
      npa,
      city,
      canton,
      avsNumber,
      lppNumber,
      laaNumber,
      ijmRate,
      laaP,
      famAlloc
    } = req.body;
    const [company] = await sql`
      UPDATE companies SET
        name        = COALESCE(${name}, name),
        legal_form  = ${legalForm ?? null},
        uid         = ${uid ?? null},
        address     = ${address ?? null},
        npa         = ${npa ?? null},
        city        = ${city ?? null},
        canton      = COALESCE(${canton}, canton),
        avs_number  = ${avsNumber ?? null},
        lpp_number  = ${lppNumber ?? null},
        laa_number  = ${laaNumber ?? null},
        ijm_rate    = COALESCE(${ijmRate}, ijm_rate),
        laa_p_rate  = COALESCE(${laaP}, laa_p_rate),
        fam_alloc   = COALESCE(${famAlloc}, fam_alloc),
        updated_at  = NOW()
      WHERE id = ${companyId}
      RETURNING *
    `;
    res.json({ ok: true, company });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// server/api/exports.ts
init_pool();
import { Router as Router8 } from "express";
var exportRouter = Router8();
function secureExportHeaders(res, filename, type) {
  res.setHeader("Content-Type", type === "csv" ? "text/csv; charset=utf-8" : "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
}
function csvWithWatermark(rows, headers, meta) {
  const lines = [
    `# *** CONFIDENTIEL \u2014 ${meta.exportType} ***`,
    `# Entreprise: ${meta.companyName}`,
    `# G\xE9n\xE9r\xE9 par: ${meta.generatedBy}`,
    `# Date: ${meta.generatedAt}`,
    `# USAGE INTERNE UNIQUEMENT \u2014 Ne pas diffuser`,
    `# ` + "=".repeat(60),
    "",
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
  ];
  return lines.join("\n");
}
exportRouter.get("/employees.csv", requireManager, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  try {
    const [company] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const employees = await sql`
      SELECT e.id, e.first_name, e.last_name, e.email, e.phone,
             e.birthdate, e.hire_date, e.contract_type, e.activity_rate,
             e.weekly_hours, e.salary_type, e.salary_amount,
             e.department, e.position, e.vacation_weeks,
             e.avs_number, e.permit_type, e.permit_expiry,
             e.address, e.npa, e.city
      FROM employees e
      WHERE e.company_id = ${user.companyId} AND e.is_active = true
      ORDER BY e.last_name, e.first_name
    `;
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "EXPORT_CSV",
      resourceType: "employees",
      details: `Export ${employees.length} employ\xE9s`,
      ipAddress: getIp(req)
    });
    const headers = [
      "ID",
      "Nom",
      "Pr\xE9nom",
      "Email",
      "T\xE9l\xE9phone",
      "Date naissance",
      "Date entr\xE9e",
      "Contrat",
      "Taux %",
      "Heures/sem",
      "Type salaire",
      "Salaire brut",
      "D\xE9partement",
      "Poste",
      "Semaines vacances",
      "AVS (masqu\xE9)",
      "Permis",
      "Expiry permis",
      "Adresse",
      "NPA",
      "Ville"
    ];
    const rows = employees.map((e) => [
      e.id,
      e.last_name,
      e.first_name,
      e.email || "",
      e.phone || "",
      e.birthdate ? e.birthdate.toISOString().slice(0, 10) : "",
      e.hire_date ? e.hire_date.toISOString().slice(0, 10) : "",
      e.contract_type,
      e.activity_rate,
      e.weekly_hours,
      e.salary_type,
      e.salary_amount || "",
      e.department || "",
      e.position || "",
      e.vacation_weeks,
      maskAvs(decrypt(e.avs_number)),
      // TOUJOURS masqué dans exports CSV
      e.permit_type || "",
      e.permit_expiry ? e.permit_expiry.toISOString().slice(0, 10) : "",
      e.address || "",
      e.npa || "",
      e.city || ""
    ]);
    const csv = csvWithWatermark(rows, headers, {
      companyName: company?.name || "SwissRH",
      generatedBy: user.email,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exportType: "Liste des employ\xE9s"
    });
    const filename = `swissrh-employes-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
    secureExportHeaders(res, filename, "csv");
    res.send("\uFEFF" + csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
exportRouter.get("/payslips.csv", requireManager, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  const { year = (/* @__PURE__ */ new Date()).getFullYear(), month = (/* @__PURE__ */ new Date()).getMonth() + 1 } = req.query;
  try {
    const [company] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const payslips = await sql`
      SELECT p.*, e.first_name, e.last_name, e.avs_number
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${user.companyId}
        AND p.period_year  = ${Number(year)}
        AND p.period_month = ${Number(month)}
      ORDER BY e.last_name, e.first_name
    `;
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "EXPORT_CSV",
      resourceType: "payslips",
      details: `Export paie ${year}/${month} \u2014 ${payslips.length} bulletins`,
      ipAddress: getIp(req)
    });
    const headers = [
      "Nom",
      "Pr\xE9nom",
      "AVS (masqu\xE9)",
      "P\xE9riode",
      "Brut",
      "Net",
      "AVS employ\xE9",
      "AC employ\xE9",
      "LPP employ\xE9",
      "Charges patronales",
      "Co\xFBt total employeur"
    ];
    const rows = payslips.map((p) => [
      p.last_name,
      p.first_name,
      maskAvs(decrypt(p.avs_number)),
      `${p.period_year}-${String(p.period_month).padStart(2, "0")}`,
      p.gross_salary,
      p.net_salary,
      p.avs_employee,
      p.ac_employee,
      p.lpp_employee,
      p.total_employer,
      p.total_cost
    ]);
    const csv = csvWithWatermark(rows, headers, {
      companyName: company?.name || "SwissRH",
      generatedBy: user.email,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exportType: `Bulletins de salaire ${year}/${month}`
    });
    const filename = `swissrh-paie-${year}-${String(month).padStart(2, "0")}.csv`;
    secureExportHeaders(res, filename, "csv");
    res.send("\uFEFF" + csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
exportRouter.get("/avs.csv", requireManager, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  const { year = (/* @__PURE__ */ new Date()).getFullYear() } = req.query;
  try {
    const [company] = await sql`SELECT name FROM companies WHERE id = ${user.companyId}`;
    const rows_data = await sql`
      SELECT e.last_name, e.first_name, e.avs_number, e.birthdate,
        SUM(p.gross_salary)::numeric      as annual_gross,
        SUM(p.avs_employee)::numeric      as avs_employee,
        SUM(p.avs_employer)::numeric      as avs_employer,
        SUM(p.ai_employee)::numeric       as ai_employee,
        SUM(p.apg_employee)::numeric      as apg_employee
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = ${user.companyId}
        AND p.period_year = ${Number(year)}
      GROUP BY e.id, e.last_name, e.first_name, e.avs_number, e.birthdate
      ORDER BY e.last_name
    `;
    audit({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.companyId,
      action: "EXPORT_AVS_XML",
      resourceType: "avs_declaration",
      details: `Export AVS ${year} \u2014 ${rows_data.length} employ\xE9s`,
      ipAddress: getIp(req)
    });
    const headers = [
      "Nom",
      "Pr\xE9nom",
      "No AVS",
      "Date naissance",
      "Salaire annuel brut",
      "AVS employ\xE9",
      "AVS employeur",
      "AI employ\xE9",
      "APG employ\xE9"
    ];
    const rows = rows_data.map((r) => [
      r.last_name,
      r.first_name,
      decrypt(r.avs_number) || "",
      // AVS en clair pour déclaration officielle
      r.birthdate ? r.birthdate.toISOString().slice(0, 10) : "",
      r.annual_gross,
      r.avs_employee,
      r.avs_employer,
      r.ai_employee,
      r.apg_employee
    ]);
    const csv = csvWithWatermark(rows, headers, {
      companyName: company?.name || "SwissRH",
      generatedBy: user.email,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exportType: `D\xE9claration AVS ${year} \u2014 CONFIDENTIEL`
    });
    const filename = `swissrh-avs-declaration-${year}.csv`;
    secureExportHeaders(res, filename, "csv");
    res.send("\uFEFF" + csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// server/api/gdpr.ts
init_pool();
import { Router as Router9 } from "express";
var gdprRouter = Router9();
gdprRouter.get("/my-data", requireAuth, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  audit({
    userId: user.userId,
    userEmail: user.email,
    userRole: user.role,
    companyId: user.companyId,
    action: "NLPD_DATA_REQUEST",
    resourceType: "self",
    ipAddress: getIp(req)
  });
  try {
    const [userData] = await sql`
      SELECT id, email, role, first_name, last_name, created_at, last_login
      FROM users WHERE id = ${user.userId}
    `;
    let employeeData = null;
    if (user.employeeId) {
      const [emp] = await sql`
        SELECT first_name, last_name, email, phone, birthdate, hire_date,
               end_date, contract_type, activity_rate, weekly_hours,
               department, position, vacation_weeks, address, npa, city,
               avs_number, permit_type, permit_expiry, created_at
        FROM employees
        WHERE id = ${user.employeeId} AND company_id = ${user.companyId}
      `;
      if (emp) {
        employeeData = {
          ...emp,
          avs_number: maskAvs(decrypt(emp.avs_number))
          // masqué dans la réponse auto
        };
      }
    }
    const payslips = user.employeeId ? await sql`
      SELECT period_year, period_month, gross_salary, net_salary, created_at
      FROM payslips
      WHERE employee_id = ${user.employeeId} AND company_id = ${user.companyId}
      ORDER BY period_year DESC, period_month DESC
      LIMIT 120
    ` : [];
    const logs = await sql`
      SELECT created_at, action, resource_type, details
      FROM audit_logs
      WHERE user_id = ${user.userId}
      ORDER BY created_at DESC LIMIT 100
    `;
    res.json({
      ok: true,
      exportDate: (/* @__PURE__ */ new Date()).toISOString(),
      notice: "Export nLPD art.8 \u2014 donn\xE9es vous concernant dans SwissRH",
      retention: {
        salarialData: "10 ans (CO art. 962)",
        hrData: "7 ans (configuration entreprise)",
        auditLogs: "2 ans"
      },
      user: userData,
      employee: employeeData,
      payslips,
      accessLog: logs
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
gdprRouter.delete("/delete-request", requireAuth, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  audit({
    userId: user.userId,
    userEmail: user.email,
    userRole: user.role,
    companyId: user.companyId,
    action: "NLPD_DATA_DELETE",
    resourceType: "self",
    details: "Demande d'effacement nLPD art.17",
    ipAddress: getIp(req)
  });
  const retentionCutoff = /* @__PURE__ */ new Date();
  retentionCutoff.setFullYear(retentionCutoff.getFullYear() - 10);
  try {
    const deleted = [];
    if (user.employeeId) {
      await sql`
        UPDATE employees SET
          email    = NULL,
          phone    = NULL,
          address  = NULL,
          npa      = NULL,
          city     = NULL,
          notes    = '[Effacé nLPD art.17 — ' || NOW()::date || ']',
          updated_at = NOW()
        WHERE id = ${user.employeeId}
          AND company_id = ${user.companyId}
          AND (end_date IS NULL OR end_date < ${retentionCutoff.toISOString()})
      `;
      deleted.push("coordonn\xE9es personnelles (email, t\xE9l\xE9phone, adresse)");
    }
    const retained = [
      "Bulletins de salaire (obligation CO art.962 \u2014 10 ans)",
      "Num\xE9ro AVS (obligation AVS)",
      "D\xE9clarations sociales (AVS, LPP, LAA)"
    ];
    res.json({
      ok: true,
      message: "Demande d'effacement trait\xE9e conform\xE9ment \xE0 la nLPD",
      deleted,
      retained,
      legalBasis: "CO art. 962 \u2014 conservation 10 ans obligatoire pour documents comptables"
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
gdprRouter.get("/audit-log", requireAdmin, async (req, res) => {
  const user = req.user;
  const sql = getSQL();
  const { days = 30, page = 1 } = req.query;
  const limit = 100;
  const offset = (Number(page) - 1) * limit;
  try {
    const logs = await sql`
      SELECT id, created_at, user_email, user_role, action,
             resource_type, resource_id, details, ip_address
      FROM audit_logs
      WHERE company_id = ${user.companyId}
        AND created_at >= NOW() - INTERVAL '1 day' * ${Number(days)}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    res.json({ ok: true, logs, page: Number(page), days: Number(days) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
gdprRouter.get("/retention-policy", requireAuth, async (_req, res) => {
  res.json({
    ok: true,
    policy: {
      salaryData: {
        retention: "10 ans",
        basis: "CO art. 962 al. 1 \u2014 obligation de conservation documents comptables",
        covers: ["bulletins de salaire", "d\xE9comptes AVS", "fiches IS", "Lohnausweis"]
      },
      hrData: {
        retention: "7 ans (configurable)",
        basis: "Recommandation nLPD / bonne pratique RH",
        covers: ["dossiers employ\xE9s", "\xE9valuations", "absences"]
      },
      auditLogs: {
        retention: "2 ans",
        basis: "S\xE9curit\xE9 et conformit\xE9 nLPD"
      },
      consentRecords: {
        retention: "5 ans apr\xE8s fin de relation de travail",
        basis: "nLPD art. 9 \u2014 preuve du consentement"
      }
    }
  });
});

// server/auth/sso.ts
init_pool();
import { Router as Router10 } from "express";
import jwt2 from "jsonwebtoken";
var ssoRouter = Router10();
function getSsoSecret() {
  const secret = process.env.WINWIN_SSO_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("[SSO] WINWIN_SSO_SECRET manquant en production");
  }
  return secret || "winwin-sso-dev-secret-CHANGE-IN-PROD";
}
ssoRouter.get("/sso-callback", async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token SSO manquant" });
  }
  const sql = getSQL();
  try {
    let payload;
    try {
      payload = jwt2.verify(token, getSsoSecret());
    } catch (e) {
      console.warn("[SSO] Token invalide ou expir\xE9:", e.message);
      return res.status(401).json({ error: "Token SSO invalide ou expir\xE9" });
    }
    if (payload.app !== "swissrh") {
      return res.status(400).json({ error: "Token SSO non destin\xE9 \xE0 SwissRH" });
    }
    const [usedNonce] = await sql`
      SELECT id FROM sso_nonces WHERE nonce = ${payload.nonce}
    `.catch(() => [null]);
    if (usedNonce) {
      return res.status(401).json({ error: "Token SSO d\xE9j\xE0 utilis\xE9" });
    }
    await sql`
      INSERT INTO sso_nonces (nonce, used_at, email)
      VALUES (${payload.nonce}, NOW(), ${payload.email})
    `.catch(() => {
    });
    const email = payload.email.toLowerCase();
    let [user] = await sql`
      SELECT u.*, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${email} AND u.is_active = true
    `;
    if (!user) {
      let companyId = payload.companyId || null;
      if (!companyId && payload.clientId) {
        const [linked] = await sql`
          SELECT id FROM companies WHERE winwin_client_id = ${payload.clientId}
        `.catch(() => [null]);
        if (linked) companyId = linked.id;
      }
      if (!companyId) {
        return res.status(403).json({
          error: "sso_no_company",
          message: "Votre entreprise n'a pas encore de compte SwissRH actif. Contactez votre administrateur."
        });
      }
      const [newUser] = await sql`
        INSERT INTO users (
          email, role, company_id, first_name, last_name,
          is_active, sso_provider, last_login
        ) VALUES (
          ${email}, 'employee', ${companyId},
          ${payload.firstName || null}, ${payload.lastName || null},
          true, 'winwin', NOW()
        )
        RETURNING *
      `;
      user = newUser;
      console.log(`[SSO] \u2705 Nouveau compte SwissRH cr\xE9\xE9 via WinWin: ${email} (company #${companyId})`);
    } else {
      await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
    }
    const srhToken = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      employeeId: user.employee_id || void 0
    });
    res.cookie("srh_session", srhToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 jours
    });
    audit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      companyId: user.company_id,
      action: "LOGIN",
      details: "SSO WinWin Magic Link",
      ipAddress: getIp(req)
    });
    console.log(`[SSO] \u2705 Login SSO WinWin: ${email} \u2192 role ${user.role}`);
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        companyId: user.company_id,
        companyName: user.company_name
      }
    });
  } catch (e) {
    console.error("[SSO] Erreur callback:", e.message);
    res.status(500).json({ error: "Erreur serveur SSO" });
  }
});
ssoRouter.get("/sso-status", (_req, res) => {
  const configured = !!process.env.WINWIN_SSO_SECRET;
  res.json({
    ok: true,
    sso: {
      winwin: {
        enabled: configured,
        loginUrl: process.env.WINWIN_APP_URL || "https://winwin.swiss"
      }
    }
  });
});

// server/index.ts
process.on("uncaughtException", (err) => {
  try {
    console.error("\u{1F534} [UNCAUGHT EXCEPTION] (server survived):", err?.message || err);
  } catch {
  }
  try {
    console.error(err?.stack?.split("\n").slice(0, 4).join("\n"));
  } catch {
  }
});
process.on("unhandledRejection", (reason) => {
  try {
    console.error("\u{1F7E1} [UNHANDLED REJECTION] (server survived):", reason?.message || reason);
  } catch {
  }
});
process.on("SIGTERM", () => {
  console.log("\u{1F6D1} SIGTERM \u2014 graceful shutdown");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("\u{1F6D1} SIGINT  \u2014 graceful shutdown");
  process.exit(0);
});
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = express();
var PORT = process.env.PORT || 5e3;
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", ts: Date.now(), service: "swissrh" });
});
app.use("/api/auth", authRouter);
app.use("/api/monitoring", requireAdmin, monitoringRouter);
app.use("/api/employees", requireAuth, employeesRouter);
app.use("/api/salary", requireAuth, salaryRouter);
app.use("/api/salary", requireAuth, pdfRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/company", requireAuth, companyRouter);
app.use("/api/exports", requireAuth, exportRouter);
app.use("/api/gdpr", requireAuth, gdprRouter);
app.use("/api/auth", ssoRouter);
if (process.env.NODE_ENV === "production") {
  app.use("/assets", express.static(path.join(__dirname, "client/assets"), {
    maxAge: "1y",
    immutable: true
  }));
  app.use(express.static(path.join(__dirname, "client"), { maxAge: "1h" }));
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.sendFile(path.join(__dirname, "client/index.html"));
  });
}
app.use((err, req, res, _next) => {
  console.error(`\u274C [GLOBAL ERROR] ${req?.method} ${req?.path}:`, err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Erreur serveur interne",
      details: process.env.NODE_ENV !== "production" ? err?.message : void 0
    });
  }
});
async function start() {
  console.log("\u{1F4CB} SWISSRH \u2014 ENV check:");
  console.log("  DATABASE_URL:", process.env.DATABASE_URL ? `SET (${process.env.DATABASE_URL.slice(0, 30)}...)` : "NOT SET \u274C");
  console.log("  JWT_SECRET:", process.env.JWT_SECRET ? "SET \u2705" : "NOT SET \u26A0\uFE0F");
  console.log("  NODE_ENV:", process.env.NODE_ENV);
  if (process.env.DATABASE_URL) {
    try {
      const missingEnv = [];
      if (!process.env.JWT_SECRET_KEY) missingEnv.push("JWT_SECRET_KEY");
      if (!process.env.ENCRYPTION_KEY) missingEnv.push("ENCRYPTION_KEY");
      if (!process.env.DATABASE_URL) missingEnv.push("DATABASE_URL");
      if (missingEnv.length && process.env.NODE_ENV === "production") {
        console.error("\u{1F534} [STARTUP] Variables manquantes en PROD:", missingEnv.join(", "));
        process.exit(1);
      } else if (missingEnv.length) {
        console.warn("\u26A0\uFE0F  [STARTUP] Variables manquantes (dev mode):", missingEnv.join(", "));
      }
      await migrateOnStart();
      await migrateSecurityPatches();
      await migrateSso();
      await migrateSectorDextra();
      console.log("\u2705 Migrations OK");
    } catch (e) {
      console.error("\u{1F4A5} Migration error:", e.message);
    }
    try {
      await startupCheck();
      startPeriodicMonitoring();
    } catch (e) {
      console.error("\u26A0\uFE0F  Crash monitor init error:", e.message);
    }
  }
  startPoolKeepalive();
  app.listen(PORT, () => {
    console.log(`\u{1F680} SWISSRH running on port ${PORT}`);
  });
}
start();
if (process.env.NODE_ENV !== "production") {
  app.post("/api/admin/seed-demo", async (_req, res) => {
    try {
      const { seedDemo: seedDemo2 } = await Promise.resolve().then(() => (init_seed_demo(), seed_demo_exports));
      const result = await seedDemo2();
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
