/**
 * SWISSRH — Migrations PATCH 006–015
 * =====================================================================
 * Tous les éléments manquants pour une appli RH suisse complète :
 *   006 — LAAC + ACE colonnes dans payslips + companies
 *   007 — vacation_balances (solde vacances par employé/année)
 *   008 — absence_requests (demandes + workflow approbation)
 *   009 — public_holidays (26 cantons, années courantes)
 *   010 — salary_advances (avances sur salaire)
 *   011 — expense_reports (notes de frais)
 *   012 — withholding_tax (impôt à la source — permis B/G/L)
 *   013 — salary_certificates (Lohnausweis annuel Swissdec)
 *   014 — employee_documents (contrats, attestations, certificats)
 *   015 — rht_periods (chômage partiel / réduction horaire travail)
 * =====================================================================
 */
import { getSQL } from './pool.js';

export async function migratePatch2(): Promise<void> {
  const sql = getSQL();
  console.log('[MIGRATE P2] Running patches 006–015...');

  // ── PATCH 006 — LAAC + ACE dans payslips & companies ─────────────────
  // LAAC manquait complètement dans la DB malgré le moteur de calcul
  // ACE = cotisation de solidarité 0.5% sur salaire > 148'200/an (employé only)
  await sql`ALTER TABLE payslips
    ADD COLUMN IF NOT EXISTS laac_employee     DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS laac_employer     DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS laac_base         DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS laac_rate_emp     DECIMAL(5,4)  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS laac_rate_er      DECIMAL(5,4)  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ace_employee      DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ace_base          DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS thirteenth_salary DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS salary_advance    DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wage_garnishment  DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expense_reimburse DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS withholding_tax   DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wht_rate          DECIMAL(5,4)  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wht_canton        VARCHAR(2)    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS wht_code          VARCHAR(5)    DEFAULT NULL
  `;

  await sql`ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS laac_active        BOOLEAN       DEFAULT false,
    ADD COLUMN IF NOT EXISTS laac_emp_rate      DECIMAL(5,4)  DEFAULT 0.005,
    ADD COLUMN IF NOT EXISTS laac_er_rate       DECIMAL(5,4)  DEFAULT 0.005,
    ADD COLUMN IF NOT EXISTS has_thirteenth     BOOLEAN       DEFAULT false,
    ADD COLUMN IF NOT EXISTS thirteenth_month   INTEGER       DEFAULT 12,
    ADD COLUMN IF NOT EXISTS collective_agreement VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS industry_code      VARCHAR(10)   DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS noga_code          VARCHAR(10)   DEFAULT NULL
  `;

  await sql`ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS has_laac           BOOLEAN       DEFAULT false,
    ADD COLUMN IF NOT EXISTS laac_emp_rate      DECIMAL(5,4)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS laac_er_rate       DECIMAL(5,4)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS withholding_tax    BOOLEAN       DEFAULT false,
    ADD COLUMN IF NOT EXISTS wht_canton         VARCHAR(2)    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS wht_code           VARCHAR(5)    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS has_thirteenth     BOOLEAN       DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS iban               VARCHAR(34)   DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS bank_clearing      VARCHAR(10)   DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS marital_status     VARCHAR(20)   DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS children_count     INTEGER       DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nationality        VARCHAR(5)    DEFAULT 'CH',
    ADD COLUMN IF NOT EXISTS entry_ch_date      DATE          DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tax_municipality   VARCHAR(100)  DEFAULT NULL
  `;

  // ── PATCH 007 — vacation_balances ─────────────────────────────────────
  // Solde vacances calculé et stocké par employé + année
  // Séparation droit acquis / pris / restant / report
  await sql`
    CREATE TABLE IF NOT EXISTS vacation_balances (
      id                  SERIAL PRIMARY KEY,
      employee_id         INTEGER REFERENCES employees(id) NOT NULL,
      company_id          INTEGER REFERENCES companies(id) NOT NULL,
      year                INTEGER NOT NULL,

      -- Droit annuel (jours ouvrables)
      entitlement_days    DECIMAL(5,1) NOT NULL,   -- ex: 25 jours (5 sem × 5j)
      entitlement_hours   DECIMAL(7,2) NOT NULL,   -- ex: 210h (25j × 8.4h)

      -- Pro-rata si entrée/sortie en cours d'année
      prorata_factor      DECIMAL(5,4) DEFAULT 1.0, -- 1.0 = année complète
      prorata_days        DECIMAL(5,1),              -- droit effectif après pro-rata

      -- Mouvements
      carried_forward     DECIMAL(5,1) DEFAULT 0,   -- report depuis année précédente
      taken_days          DECIMAL(5,1) DEFAULT 0,   -- pris dans l'année
      planned_days        DECIMAL(5,1) DEFAULT 0,   -- planifiés (approbation pending)
      compensated_days    DECIMAL(5,1) DEFAULT 0,   -- indemnisés en CHF (fin contrat only!)

      -- Solde
      balance_days        DECIMAL(5,1),   -- = prorata + report - pris - compensés
      balance_hours       DECIMAL(7,2),

      -- Alertes
      max_carry_forward   DECIMAL(5,1) DEFAULT 5,   -- max jours reportables (légal = limité)
      alert_expiry_date   DATE,                      -- date limite report (souvent 31.03 N+1)

      last_calculated_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE(employee_id, year)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_vacation_bal_emp ON vacation_balances(employee_id, year)`;

  // ── PATCH 008 — absence_requests ──────────────────────────────────────
  -- Couvre tous les types d'absences LTr + CO + LAA + APG
  await sql`
    CREATE TABLE IF NOT EXISTS absence_requests (
      id                  SERIAL PRIMARY KEY,
      employee_id         INTEGER REFERENCES employees(id) NOT NULL,
      company_id          INTEGER REFERENCES companies(id) NOT NULL,

      -- Type d'absence
      absence_type        VARCHAR(30) NOT NULL,
      -- vacation      — Vacances planifiées (CO 329a)
      -- sick          — Maladie (avec/sans certificat)
      -- accident_np   — Accident non-professionnel (LAA NP / NBUV)
      -- accident_p    — Accident professionnel (LAA P / BUV)
      -- maternity     — Maternité (APG 14 sem, 80%, max 196/j)
      -- paternity     — Paternité (APG 2 sem depuis 2021)
      -- adoption      — Adoption (APG)
      -- military      — Service militaire / civil / prot. civile (APG)
      -- unpaid        — Congé sans solde
      -- partial_work  — Réduction horaire (RHT / chômage partiel)
      -- family        — Événement familial (mariage/naissance/décès CO 329.3)
      -- other         — Autre

      -- Période
      start_date          DATE NOT NULL,
      end_date            DATE NOT NULL,
      start_half          BOOLEAN DEFAULT false,  -- demi-journée début
      end_half            BOOLEAN DEFAULT false,  -- demi-journée fin
      working_days        DECIMAL(5,1),           -- calculé auto (hors fériés)
      working_hours       DECIMAL(7,2),

      -- Statut workflow
      status              VARCHAR(20) DEFAULT 'pending',
      -- pending | approved | rejected | cancelled | auto_approved

      -- Indemnisation
      is_paid             BOOLEAN DEFAULT true,
      pay_rate            DECIMAL(5,4) DEFAULT 1.0, -- 1.0=100%, 0.8=80% (APG), 0=non payé
      indemnity_source    VARCHAR(20) DEFAULT 'employer',
      -- employer | ijm | laa | apg | rht | none

      -- Données médicales / légales
      certificate_required BOOLEAN DEFAULT false,
      certificate_received BOOLEAN DEFAULT false,
      certificate_date    DATE,
      certificate_url     TEXT,   -- document uploadé

      -- APG spécifique
      apg_start_date      DATE,   -- 1er jour APG (peut différer du début absence)
      apg_daily_rate      DECIMAL(8,2),   -- max 196 CHF/j en 2025
      apg_total           DECIMAL(10,2),

      -- LAA spécifique
      laa_case_number     VARCHAR(50),
      laa_daily_rate      DECIMAL(8,2),

      -- Délai de carence (CO Art. 324a — maintien salaire)
      -- Echelle bernoise: 1 mois → 3 sem, 2e an → 1 mois, etc.
      waiting_days        INTEGER DEFAULT 0,
      employer_obligation_days INTEGER DEFAULT 0, -- obligation maintien salaire

      -- Notes et approbation
      reason              TEXT,
      notes               TEXT,
      requested_by        INTEGER REFERENCES users(id),
      approved_by         INTEGER REFERENCES users(id),
      approved_at         TIMESTAMP,
      rejection_reason    TEXT,

      -- Lien paie
      payslip_id          INTEGER REFERENCES payslips(id),

      created_at          TIMESTAMP DEFAULT NOW(),
      updated_at          TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_absences_emp   ON absence_requests(employee_id, start_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_absences_co    ON absence_requests(company_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_absences_dates ON absence_requests(start_date, end_date)`;

  // ── PATCH 009 — public_holidays ───────────────────────────────────────
  -- Jours fériés par canton — 26 cantons suisses
  -- Chaque canton a ses propres fériés en plus des fériés fédéraux
  await sql`
    CREATE TABLE IF NOT EXISTS public_holidays (
      id          SERIAL PRIMARY KEY,
      canton      VARCHAR(2) NOT NULL,   -- 'CH' = tous, 'JU', 'ZH', 'BE', etc.
      holiday_date DATE NOT NULL,
      name        VARCHAR(100) NOT NULL,
      name_de     VARCHAR(100),
      name_fr     VARCHAR(100),
      name_it     VARCHAR(100),
      is_federal  BOOLEAN DEFAULT false, -- férié fédéral (1er août, Noël, etc.)
      is_paid     BOOLEAN DEFAULT true,
      year        INTEGER NOT NULL,
      UNIQUE(canton, holiday_date)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_holidays_canton ON public_holidays(canton, year)`;

  // ── PATCH 010 — salary_advances ───────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS salary_advances (
      id              SERIAL PRIMARY KEY,
      employee_id     INTEGER REFERENCES employees(id) NOT NULL,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      amount          DECIMAL(10,2) NOT NULL,
      advance_date    DATE NOT NULL,
      repayment_month INTEGER,   -- mois de remboursement (1-12)
      repayment_year  INTEGER,
      repaid_at       TIMESTAMP,
      repaid_in_payslip INTEGER REFERENCES payslips(id),
      status          VARCHAR(20) DEFAULT 'pending', -- pending | deducted | cancelled
      notes           TEXT,
      created_by      INTEGER REFERENCES users(id),
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── PATCH 011 — expense_reports (notes de frais) ─────────────────────
  -- Frais remboursés = NON soumis aux charges sociales (règle fiscale CH)
  await sql`
    CREATE TABLE IF NOT EXISTS expense_reports (
      id              SERIAL PRIMARY KEY,
      employee_id     INTEGER REFERENCES employees(id) NOT NULL,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      period_year     INTEGER NOT NULL,
      period_month    INTEGER NOT NULL,
      status          VARCHAR(20) DEFAULT 'draft', -- draft | submitted | approved | paid | rejected

      -- Types de frais (non exhaustif)
      km_private      DECIMAL(8,1) DEFAULT 0,   -- km voiture privée
      km_rate         DECIMAL(5,4) DEFAULT 0.70, -- 0.70 CHF/km (taux AFC 2025)
      km_amount       DECIMAL(10,2) DEFAULT 0,

      meals_days      DECIMAL(5,1) DEFAULT 0,   -- repas d'affaires
      meal_rate       DECIMAL(6,2) DEFAULT 35.00, -- CHF/repas (forfait AFC)
      meals_amount    DECIMAL(10,2) DEFAULT 0,

      overnight_days  INTEGER DEFAULT 0,
      overnight_rate  DECIMAL(6,2) DEFAULT 100.00,
      overnight_amount DECIMAL(10,2) DEFAULT 0,

      other_amount    DECIMAL(10,2) DEFAULT 0,
      total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,

      -- Pièces justificatives
      receipts_url    TEXT[],

      approved_by     INTEGER REFERENCES users(id),
      approved_at     TIMESTAMP,
      paid_in_payslip INTEGER REFERENCES payslips(id),
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  // ── PATCH 012 — withholding_tax_codes ─────────────────────────────────
  -- Impôt à la source — permis B, G, L (étrangers non résidents)
  -- Barèmes cantonaux: A (célibataire), B (marié), C (marié 2 revenus), etc.
  await sql`
    CREATE TABLE IF NOT EXISTS withholding_tax_rates (
      id          SERIAL PRIMARY KEY,
      canton      VARCHAR(2) NOT NULL,
      code        VARCHAR(5) NOT NULL,   -- A0, A1, A2... B0, B1... C0...
      description VARCHAR(100),
      year        INTEGER NOT NULL,
      -- Barème simplifié (en réalité table par tranches de salaire)
      -- Pour MVP: taux moyen approximatif — à remplacer par table complète
      rate_approx DECIMAL(6,4),
      UNIQUE(canton, code, year)
    )
  `;

  -- Table des tranches IS par canton (structure complète Swissdec)
  await sql`
    CREATE TABLE IF NOT EXISTS withholding_tax_brackets (
      id              SERIAL PRIMARY KEY,
      canton          VARCHAR(2) NOT NULL,
      code            VARCHAR(5) NOT NULL,
      year            INTEGER NOT NULL,
      income_from     DECIMAL(10,2) NOT NULL,
      income_to       DECIMAL(10,2),
      tax_amount      DECIMAL(10,2) NOT NULL,  -- montant fixe
      tax_rate        DECIMAL(6,4)  NOT NULL,  -- taux marginal
      UNIQUE(canton, code, year, income_from)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_wht_lookup ON withholding_tax_brackets(canton, code, year, income_from)`;

  -- Suivi IS mensuel par employé
  await sql`
    CREATE TABLE IF NOT EXISTS withholding_tax_declarations (
      id              SERIAL PRIMARY KEY,
      employee_id     INTEGER REFERENCES employees(id) NOT NULL,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      period_year     INTEGER NOT NULL,
      period_month    INTEGER NOT NULL,
      taxable_income  DECIMAL(12,2) NOT NULL,
      wht_canton      VARCHAR(2) NOT NULL,
      wht_code        VARCHAR(5) NOT NULL,
      wht_amount      DECIMAL(10,2) NOT NULL,
      wht_rate        DECIMAL(6,4)  NOT NULL,
      status          VARCHAR(20) DEFAULT 'pending', -- pending | declared | paid
      declared_at     TIMESTAMP,
      payslip_id      INTEGER REFERENCES payslips(id),
      created_at      TIMESTAMP DEFAULT NOW(),
      UNIQUE(employee_id, period_year, period_month)
    )
  `;

  -- ── PATCH 013 — salary_certificates (Lohnausweis) ────────────────────
  -- Certificat de salaire annuel — document légal Swissdec
  -- 15 cases officielles (AFC / ESTV)
  await sql`
    CREATE TABLE IF NOT EXISTS salary_certificates (
      id                  SERIAL PRIMARY KEY,
      employee_id         INTEGER REFERENCES employees(id) NOT NULL,
      company_id          INTEGER REFERENCES companies(id) NOT NULL,
      year                INTEGER NOT NULL,

      -- Case 1 — Salaire brut total
      case1_gross         DECIMAL(12,2) DEFAULT 0,

      -- Case 2 — Prestations salariales accessoires (commissions, pourboires, etc.)
      case2_benefits      DECIMAL(12,2) DEFAULT 0,

      -- Case 3 — Indemnités journalières APG/LAA/LAAC/IJM
      case3_indemnities   DECIMAL(12,2) DEFAULT 0,

      -- Case 4 — Capital versé lors de la cessation des rapports de travail
      case4_capital       DECIMAL(12,2) DEFAULT 0,

      -- Case 5 — Participation de l'employeur aux frais de transport / logement
      case5_employer_transport DECIMAL(12,2) DEFAULT 0,
      case5_employer_housing   DECIMAL(12,2) DEFAULT 0,

      -- Case 6 — Frais effectifs (montant remboursé non imposable)
      case6_expenses      DECIMAL(12,2) DEFAULT 0,

      -- Case 7 — Autres avantages en nature
      case7_in_kind       DECIMAL(12,2) DEFAULT 0,

      -- Case 8 — Participations de collaborateur (actions, options)
      case8_participation DECIMAL(12,2) DEFAULT 0,

      -- Case 9 — Cotisations AVS/AI/APG/AC payées par l'employé
      case9_avs_ai_apg    DECIMAL(12,2) DEFAULT 0,

      -- Case 10 — Cotisations LPP payées par l'employé
      case10_lpp          DECIMAL(12,2) DEFAULT 0,

      -- Case 11 — Autres déductions légales (LAA NP, LAAC, IJM)
      case11_other_deduc  DECIMAL(12,2) DEFAULT 0,

      -- Case 12 — Impôt à la source retenu
      case12_wht          DECIMAL(12,2) DEFAULT 0,

      -- Case 13 — Remarques (cases coché: repas, logement, voiture, frais)
      case13_free_meals   BOOLEAN DEFAULT false,
      case13_free_housing BOOLEAN DEFAULT false,
      case13_car_private  BOOLEAN DEFAULT false,

      -- Case 14 — Activité partielle (taux d'occupation)
      case14_activity_rate DECIMAL(5,2) DEFAULT 100,

      -- Case 15 — Période d'activité (si < 12 mois)
      case15_period_from  DATE,
      case15_period_to    DATE,

      -- Méta
      pdf_url             TEXT,
      generated_at        TIMESTAMP,
      sent_to_employee    TIMESTAMP,
      sent_to_tax_auth    TIMESTAMP,
      xml_url             TEXT,   -- Export Swissdec ELM
      status              VARCHAR(20) DEFAULT 'draft',

      created_at          TIMESTAMP DEFAULT NOW(),
      UNIQUE(employee_id, year)
    )
  `;

  -- ── PATCH 014 — employee_documents ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id              SERIAL PRIMARY KEY,
      employee_id     INTEGER REFERENCES employees(id) NOT NULL,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      doc_type        VARCHAR(50) NOT NULL,
      -- contract         — Contrat de travail (CO Art. 320)
      -- amendment        — Avenant au contrat
      -- work_certificate — Attestation de travail (CO Art. 330a simple)
      -- reference_letter — Certificat de travail (CO Art. 330a complet)
      -- warning          — Avertissement
      -- salary_letter    — Lettre de confirmation salaire
      -- termination      — Lettre de licenciement
      -- permit_copy      — Copie permis de séjour
      -- avs_card         — Carte AVS
      -- other            — Autre
      title           VARCHAR(200),
      file_url        TEXT,
      file_name       VARCHAR(200),
      valid_from      DATE,
      valid_until     DATE,
      signed_at       DATE,
      notes           TEXT,
      created_by      INTEGER REFERENCES users(id),
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_docs_emp ON employee_documents(employee_id)`;

  -- ── PATCH 015 — rht_periods (Réduction horaire / chômage partiel) ─────
  await sql`
    CREATE TABLE IF NOT EXISTS rht_periods (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      start_date      DATE NOT NULL,
      end_date        DATE NOT NULL,
      status          VARCHAR(20) DEFAULT 'active',
      max_reduction   DECIMAL(5,2) DEFAULT 85,  -- % max réduction autorisée
      seco_reference  VARCHAR(50),              -- réf. SECO/ORP
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rht_employee_months (
      id              SERIAL PRIMARY KEY,
      rht_period_id   INTEGER REFERENCES rht_periods(id) NOT NULL,
      employee_id     INTEGER REFERENCES employees(id) NOT NULL,
      company_id      INTEGER REFERENCES companies(id) NOT NULL,
      period_year     INTEGER NOT NULL,
      period_month    INTEGER NOT NULL,
      normal_hours    DECIMAL(7,2) NOT NULL,   -- heures contractuelles
      worked_hours    DECIMAL(7,2) NOT NULL,   -- heures effectivement travaillées
      lost_hours      DECIMAL(7,2) NOT NULL,   -- heures perdues (normales - travaillées)
      rht_rate        DECIMAL(5,2),            -- % réduction
      indemnity_rate  DECIMAL(5,4) DEFAULT 0.80, -- 80% du salaire (chômage partiel)
      indemnity_amount DECIMAL(10,2),
      payslip_id      INTEGER REFERENCES payslips(id),
      UNIQUE(rht_period_id, employee_id, period_year, period_month)
    )
  `;

  -- ── Additional indexes ─────────────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_absences_type    ON absence_requests(company_id, absence_type, start_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_wht_decl_emp     ON withholding_tax_declarations(employee_id, period_year)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sal_cert_emp     ON salary_certificates(employee_id, year)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_advances_emp     ON salary_advances(employee_id, status)`;

  console.log('[MIGRATE P2] ✅ Patches 006–015 complete');
}
