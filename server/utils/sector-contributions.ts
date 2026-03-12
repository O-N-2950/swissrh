/**
 * SWISSRH — Cotisations sectorielles & CCT suisses
 * =====================================================================
 * Couvre tous les secteurs avec cotisations spécifiques 2025 :
 *
 *  1. Construction (CNF/SBV) — FAR, Parifonds, SUVA majoré
 *  2. Hôtellerie-Restauration (L-GAV) — HESTA/LPP, Fonds formation, REKA
 *  3. Industrie/MEM — Fonds formation branche
 *  4. Nettoyage (CCT) — Fonds formation nettoyage
 *  5. Coiffure (CCT) — Fonds formation coiffure
 *  6. Transport/Logistique — FAR transport, caisse propre
 *  7. Agriculture — Alloc. fam. agricoles (taux cantonaux)
 *  8. Commerce/Retail — standard + 13e CCT
 *  9. Santé/Social — caisses institutionnelles
 * 10. Bureau/Services — standard (référence)
 *
 * + Impôt à la source : barèmes A/B/C/D/H par canton (2025)
 * + 13e salaire : provisionnement mensuel ou versement décembre
 * + REKA : bons vacances (restauration + touristique)
 * + Frais professionnels : forfaits CCT par secteur
 * =====================================================================
 */

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export type SectorKey =
  | 'construction'
  | 'restaurant'
  | 'industry_mem'
  | 'cleaning'
  | 'hairdressing'
  | 'transport'
  | 'agriculture'
  | 'retail'
  | 'health_social'
  | 'office';

export interface SectorContribRates {
  // FAR — Retraite anticipée (employeur uniquement sauf mention)
  far?: {
    label: string;
    er_rate: number;   // part employeur
    emp_rate?: number; // part employé (souvent 0)
    base: 'gross' | 'capped'; // base de calcul
    ceiling_monthly?: number;
    notes?: string;
  };

  // Fonds de formation professionnelle
  formation?: {
    label: string;
    er_rate: number;
    emp_rate?: number;
    base: 'gross' | 'capped';
    ceiling_monthly?: number;
    notes?: string;
  };

  // Fonds / caisse sectorielle LPP (remplace ou complète LPP standard)
  sectoral_lpp?: {
    label: string; // ex: HESTA, Previs, Profond
    er_rate: number;
    emp_rate: number;
    notes?: string;
  };

  // REKA — Bons vacances (commun hôtellerie/tourisme)
  reka?: {
    label: string;
    er_rate: number;
    emp_rate: number; // souvent partagé 50/50
    ceiling_monthly?: number;
    optional?: boolean;
    notes?: string;
  };

  // Fonds garantie / sécurité industrie
  security_fund?: {
    label: string;
    er_rate: number;
    emp_rate?: number;
  };

  // SUVA taux spécial (surcharge secteur à risque)
  suva_surcharge?: {
    label: string;
    extra_np_rate: number; // supplément sur taux NP standard
    extra_p_rate: number;  // supplément sur taux P standard
    notes?: string;
  };

  // Allocations familiales cantonales (taux différents de la norme)
  fam_alloc?: {
    label: string;
    er_rate: number; // remplace taux standard 1.4%
    notes?: string;
  };

  // Assurance intempéries / RHT sectorielle
  intemperies?: {
    label: string;
    er_rate: number;
    notes?: string;
  };

  // Frais professionnels forfaitaires CCT (déductibles IS)
  expense_forfait?: {
    label: string;
    monthly_eff: number; // frais effectifs forfait CHF/mois
    monthly_rep: number; // frais représentation forfait CHF/mois
    notes?: string;
  };

  // 13e salaire obligatoire par CCT
  thirteenth_mandatory?: boolean;

  // Heures supplémentaires : règles CCT spécifiques
  overtime_rules?: {
    threshold_weekly: number; // seuil déclenchement heures sup
    rate: number;             // majoration (ex: 0.25 = +25%)
    max_weekly: number;       // max légal hebdomadaire
    notes?: string;
  };

  // Majoration spécifique nuit/dimanche CCT (si différente de LTr)
  dextra?: {
    night_rate: number;     // LTr Art.17b = 0.25 | CCT restauration = 0.20
    sunday_rate: number;    // LTr Art.19 = 0.50 (universel)
    holiday_rate: number;   // supplément jour férié sur le salaire
    night_start_hour: number; // heure début nuit (ex: 22 pour restauration, 23 LTr)
    night_end_hour: number;   // heure fin nuit (ex: 6 pour restauration, 6 LTr)
    notes?: string;
  };

  // Salaire minimum CCT (mensuel, 100% activité)
  minimum_wage?: {
    monthly_min: number;
    hourly_min?: number;
    notes?: string;
  };
}

export interface SectorProfile {
  key: SectorKey;
  label: string;
  icon: string;
  color: string;
  cct?: string;         // Nom CCT applicable
  cct_link?: string;    // Référence légale
  contrib: SectorContribRates;
  defaults: {
    weekly_hours: number;
    vacation_weeks: number;
    has_thirteenth: boolean;
    salary_type: 'monthly' | 'hourly';
    laa_np_rate_override?: number; // si SUVA spécial
    laa_p_rate_override?: number;
  };
  legal_alerts: string[]; // rappels légaux affichés dans l'UI
}

// ─────────────────────────────────────────────────────────────────────
// PROFILS SECTORIELS COMPLETS 2025
// ─────────────────────────────────────────────────────────────────────

export const SECTOR_PROFILES: Record<SectorKey, SectorProfile> = {

  // ── BUREAU / SERVICES (référence standard) ───────────────────────
  office: {
    key: 'office',
    label: 'Bureau / Services',
    icon: '💼',
    color: '#27AE60',
    cct: 'Pas de CCT spécifique (CO + LTr)',
    contrib: {
      // Pas de cotisations sectorielles supplémentaires
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50,
        night_start_hour: 23, night_end_hour: 6,
        notes: 'LTr Art.17b / Art.19',
      },
      overtime_rules: { threshold_weekly: 45, rate: 0.25, max_weekly: 50, notes: 'CO Art.321c' },
    },
    defaults: { weekly_hours: 42, vacation_weeks: 5, has_thirteenth: false, salary_type: 'monthly' },
    legal_alerts: ['Durée max légale 45h/sem (LTr Art.9)', 'HS compensables en temps libre (CO Art.321c)'],
  },

  // ── CONSTRUCTION (CNF — Convention nationale) ────────────────────
  construction: {
    key: 'construction',
    label: 'Construction / Artisanat',
    icon: '🏗',
    color: '#E67E22',
    cct: 'Convention nationale (CN) du secteur principal de la construction',
    contrib: {
      far: {
        label: 'FAR — Retraite anticipée à 60 ans',
        er_rate: 0.015,   // 1.5% employeur (taux moyen 2025)
        emp_rate: 0.0,    // employé ne cotise pas au FAR
        base: 'capped',
        ceiling_monthly: 12_350,
        notes: 'Art. 35 CN — obligatoire pour ouvriers construction (UNIA/SYNA)',
      },
      formation: {
        label: 'Parifonds Construction (formation)',
        er_rate: 0.0030,  // 0.30% employeur
        emp_rate: 0.0030, // 0.30% employé
        base: 'gross',
        ceiling_monthly: 12_350,
      },
      suva_surcharge: {
        label: 'SUVA Construction (tarif spécial)',
        extra_np_rate: 0.012, // NP : env. +1.2% vs standard (taux selon classe de risque SUVA)
        extra_p_rate: 0.010,  // P  : env. +1.0% — varie selon la prime convenue
        notes: 'Taux indicatifs — à ajuster selon police SUVA de l\'entreprise',
      },
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 1.00,
        night_start_hour: 23, night_end_hour: 6,
        notes: 'CN Art.16 — fériés payés double',
      },
      overtime_rules: {
        threshold_weekly: 41.5, rate: 0.25, max_weekly: 50,
        notes: 'CN Art.14 — durée normale 41.5h/sem, HS +25%',
      },
      minimum_wage: {
        monthly_min: 5_500,  // approximatif — varie selon qualification et région
        hourly_min: 31.20,
        notes: 'CN 2025 — niveau II (ouvrier qualifié)',
      },
      thirteenth_mandatory: true,
      expense_forfait: {
        label: 'Frais déplacement chantier',
        monthly_eff: 200,   // CHF/mois frais effectifs
        monthly_rep: 50,    // CHF/mois représentation
        notes: 'CN Art.21 — indemnités de déplacement et transport',
      },
    },
    defaults: {
      weekly_hours: 41.5, vacation_weeks: 5, has_thirteenth: true, salary_type: 'hourly',
      laa_np_rate_override: 0.025, // SUVA construction ~2.5% (indicatif)
      laa_p_rate_override:  0.018,
    },
    legal_alerts: [
      'FAR : retraite anticipée à 60 ans — cotisation obligatoire CN',
      'Parifonds : 0.30% emp + 0.30% er sur chaque salaire',
      'SUVA construction : taux NP majoré (vérifier police)',
      '13e salaire obligatoire CN',
      'Intempéries : RHT possible (LACI Art.32)',
      'Durée normale : 41h30 / sem',
    ],
  },

  // ── HÔTELLERIE-RESTAURATION (L-GAV) ─────────────────────────────
  restaurant: {
    key: 'restaurant',
    label: 'Hôtellerie / Restauration',
    icon: '🍽',
    color: '#C0392B',
    cct: 'L-GAV — Convention collective nationale de travail (CCNT)',
    contrib: {
      formation: {
        label: 'Fonds de formation L-GAV',
        er_rate: 0.0070,  // 0.70% employeur
        emp_rate: 0.0030, // 0.30% employé
        base: 'gross',
      },
      reka: {
        label: 'REKA — Bons vacances',
        er_rate: 0.010,   // 1% employeur
        emp_rate: 0.010,  // 1% employé (versé en bons REKA à 80%)
        ceiling_monthly: 12_350,
        optional: false,  // obligatoire L-GAV
        notes: 'Art. 14 L-GAV — employeur verse 1% + employé 1% → bons REKA valeur nominale',
      },
      sectoral_lpp: {
        label: 'Caisse LPP sectorielle (HESTA ou Previs)',
        er_rate: 0.005,   // supplément caisse de secteur au-delà LPP obligatoire
        emp_rate: 0.005,
        notes: 'Variable selon caisse affiliation — HESTA, Previs, etc.',
      },
      dextra: {
        night_rate: 0.20,   // CCT Art.11 : +20% (00h–07h) — différent de LTr !
        sunday_rate: 0.50,  // CCT Art.10 : +50% dimanche
        holiday_rate: 1.00, // Double salaire jours fériés
        night_start_hour: 0, night_end_hour: 7,
        notes: 'L-GAV Art.10/11 — nuit 00h-07h +20%, dimanche +50%, fériés x2',
      },
      overtime_rules: {
        threshold_weekly: 42, rate: 0.25, max_weekly: 50,
        notes: 'L-GAV Art.12 — HS au-delà de 42h +25%',
      },
      minimum_wage: {
        monthly_min: 3_931, // Niveau IV (sans qualification) 2025
        hourly_min: 22.50,
        notes: 'L-GAV 2025 — Niveau IV. Niveau I (chef de cuisine) ≈ 5\'200/m',
      },
      thirteenth_mandatory: true,
      expense_forfait: {
        label: 'Frais professionnels restauration',
        monthly_eff: 100,
        monthly_rep: 0,
        notes: 'L-GAV Art.22 — repas de service (valeur repas ≈ CHF 3.50/repas)',
      },
    },
    defaults: {
      weekly_hours: 42, vacation_weeks: 4, has_thirteenth: true, salary_type: 'hourly',
    },
    legal_alerts: [
      'CCNT obligatoire — contrôle paritaire régulier',
      '13e salaire : versé en juillet (50%) + décembre (50%) selon L-GAV',
      'REKA obligatoire : 1% er + 1% emp',
      'Fonds formation : 0.70% er + 0.30% emp',
      'Nuit (00h–07h) : +20% (≠ LTr standard +25%)',
      'Repos quotidien minimum 11h consécutives (L-GAV Art.9)',
      'Pourboires déclarés à l\'AVS si remis par l\'employeur',
    ],
  },

  // ── INDUSTRIE / MEM (machines, électro, métal) ──────────────────
  industry_mem: {
    key: 'industry_mem',
    label: 'Industrie / MEM',
    icon: '⚙️',
    color: '#2C3E50',
    cct: 'CCT MEM — Machines, équipements électriques, métaux',
    contrib: {
      formation: {
        label: 'Fonds formation CCT MEM',
        er_rate: 0.0020, // 0.20% employeur
        emp_rate: 0.0000,
        base: 'gross',
      },
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50,
        night_start_hour: 23, night_end_hour: 6,
        notes: 'CCT MEM + LTr standard',
      },
      overtime_rules: {
        threshold_weekly: 40, rate: 0.25, max_weekly: 45,
        notes: 'CCT MEM — 40h standard, HS +25%',
      },
      minimum_wage: {
        monthly_min: 4_400,
        notes: 'CCT MEM 2025 — niveau ouvrier qualifié région CH-romande',
      },
      thirteenth_mandatory: true,
    },
    defaults: { weekly_hours: 40, vacation_weeks: 5, has_thirteenth: true, salary_type: 'monthly' },
    legal_alerts: [
      '13e salaire obligatoire CCT MEM',
      'Fonds formation : 0.20% er',
      'Durée normale 40h/sem — HS dès 40h01',
      'Affiliation caisse pension agréée CCT (Asepro, Profond, etc.)',
    ],
  },

  // ── NETTOYAGE (CCT) ──────────────────────────────────────────────
  cleaning: {
    key: 'cleaning',
    label: 'Nettoyage / Entretien',
    icon: '🧹',
    color: '#16A085',
    cct: 'CCT nettoyage et services industriels',
    contrib: {
      formation: {
        label: 'Fonds de formation CCT nettoyage',
        er_rate: 0.0060, // 0.60% employeur
        emp_rate: 0.0020, // 0.20% employé
        base: 'gross',
      },
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 1.00,
        night_start_hour: 20, night_end_hour: 6, // nuit plus large : 20h–06h CCT nettoyage
        notes: 'CCT nettoyage — nuit dès 20h (+25%), dimanche +50%, fériés x2',
      },
      overtime_rules: {
        threshold_weekly: 42, rate: 0.25, max_weekly: 50,
        notes: 'CCT nettoyage — heures hors travail de nuit fréquentes',
      },
      minimum_wage: {
        monthly_min: 3_700, hourly_min: 21.00,
        notes: 'CCT nettoyage 2025 — avec certificat de formation',
      },
      thirteenth_mandatory: false,
    },
    defaults: { weekly_hours: 42, vacation_weeks: 5, has_thirteenth: false, salary_type: 'hourly' },
    legal_alerts: [
      'Nuit définie dès 20h (CCT) — différent de LTr (23h)',
      'Fonds formation : 0.60% er + 0.20% emp',
      'Contrôles travail au noir renforcés dans ce secteur',
      'Permis de travail : vérification systématique (frontaliers fréquents)',
    ],
  },

  // ── COIFFURE (CCT) ───────────────────────────────────────────────
  hairdressing: {
    key: 'hairdressing',
    label: 'Coiffure / Esthétique',
    icon: '✂️',
    color: '#8E44AD',
    cct: 'CCT coiffure suisse',
    contrib: {
      formation: {
        label: 'Fonds formation CCT coiffure',
        er_rate: 0.0040,
        emp_rate: 0.0010,
        base: 'gross',
      },
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50,
        night_start_hour: 23, night_end_hour: 6,
      },
      overtime_rules: {
        threshold_weekly: 40, rate: 0.25, max_weekly: 45,
      },
      minimum_wage: {
        monthly_min: 3_600, hourly_min: 20.50,
        notes: 'CCT coiffure 2025 — après apprentissage',
      },
    },
    defaults: { weekly_hours: 40, vacation_weeks: 5, has_thirteenth: false, salary_type: 'hourly' },
    legal_alerts: [
      'Fonds formation : 0.40% er + 0.10% emp',
      'Pourboires : imposables et soumis AVS si remis via employeur',
    ],
  },

  // ── TRANSPORT / LOGISTIQUE ───────────────────────────────────────
  transport: {
    key: 'transport',
    label: 'Transport / Logistique',
    icon: '🚛',
    color: '#D35400',
    cct: 'CCT du transport routier de marchandises',
    contrib: {
      far: {
        label: 'FAR Transport — Retraite anticipée (chauffeurs)',
        er_rate: 0.0130, // indicatif ~1.3% employeur
        emp_rate: 0.0000,
        base: 'capped',
        ceiling_monthly: 12_350,
        notes: 'Caisse de retraite anticipée branche transport — ASTAG',
      },
      formation: {
        label: 'Fonds de formation transport (ASTAG)',
        er_rate: 0.0015,
        emp_rate: 0.0000,
        base: 'gross',
      },
      expense_forfait: {
        label: 'Frais déplacement chauffeur',
        monthly_eff: 350,
        monthly_rep: 100,
        notes: 'CCT — indemnités km, nuitées, repas en déplacement',
      },
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50,
        night_start_hour: 23, night_end_hour: 6,
        notes: 'CCT transport + LTr',
      },
      overtime_rules: {
        threshold_weekly: 45, rate: 0.25, max_weekly: 50,
        notes: 'OTR2 — temps de conduite max 9h/jour, 56h/sem',
      },
      minimum_wage: {
        monthly_min: 4_200, hourly_min: 23.50,
        notes: 'CCT transport routier 2025',
      },
      thirteenth_mandatory: true,
    },
    defaults: { weekly_hours: 45, vacation_weeks: 5, has_thirteenth: true, salary_type: 'monthly' },
    legal_alerts: [
      'OTR2 : temps de conduite 9h/j max, pause 45min toutes 4h30',
      'Tachygraphe numérique obligatoire',
      'FAR transport : cotisation er sur salaire',
      'Frais déplacement : indemnités non soumises charges si forfait CCT',
      '13e salaire obligatoire CCT',
    ],
  },

  // ── AGRICULTURE ─────────────────────────────────────────────────
  agriculture: {
    key: 'agriculture',
    label: 'Agriculture / Viticulture',
    icon: '🌾',
    color: '#2ECC71',
    cct: 'CT pour les travailleurs agricoles + CCT cantonales',
    contrib: {
      fam_alloc: {
        label: 'Allocations familiales agricoles (LAFam)',
        er_rate: 0.018, // taux agricole généralement plus élevé que l'industrie (indicatif)
        notes: 'Taux cantonaux variables — géré via caisse cantonale agricole spécifique',
      },
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50,
        night_start_hour: 23, night_end_hour: 6,
      },
      overtime_rules: {
        threshold_weekly: 48, rate: 0.25, max_weekly: 55,
        notes: 'LTr Art.27 — agriculture : durée max 48h + HS +25%',
      },
      minimum_wage: {
        monthly_min: 3_600,
        notes: 'CT travailleurs agricoles 2025 — varie selon canton',
      },
    },
    defaults: { weekly_hours: 48, vacation_weeks: 4, has_thirteenth: false, salary_type: 'monthly' },
    legal_alerts: [
      'Allocations fam. agricoles : caisse cantonale spécifique (≠ CAF industrielle)',
      'Saisonniers : permis L — durée max 9 mois / an',
      'Logement fourni : valeur locative soumise AVS si déduction sur salaire',
      'Durée légale 48h/sem (dérogation LTr pour agriculture)',
      'Vendanges : contrat CDD saisonnier — procédure simplifiée admise',
    ],
  },

  // ── COMMERCE / RETAIL ────────────────────────────────────────────
  retail: {
    key: 'retail',
    label: 'Commerce / Vente',
    icon: '🛍',
    color: '#2980B9',
    cct: 'USH — Commerce de détail (CCT cantonales)',
    contrib: {
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50,
        night_start_hour: 23, night_end_hour: 6,
        notes: 'LTr + éventuelles CCT cantonales retail',
      },
      overtime_rules: {
        threshold_weekly: 42, rate: 0.25, max_weekly: 45,
      },
      minimum_wage: {
        monthly_min: 3_400, hourly_min: 19.50,
        notes: 'Pas de CCT nationale — salaires minimum cantonaux (GE, NE, TI, JU)',
      },
      thirteenth_mandatory: false,
    },
    defaults: { weekly_hours: 42, vacation_weeks: 5, has_thirteenth: false, salary_type: 'monthly' },
    legal_alerts: [
      'Repos dominical : dérogation nécessaire pour commerces (LTr Art.18)',
      'Dimanche : supplément +50% obligatoire',
      'Vérifier CCT cantonale applicable (GE, VD, BE ont des CCT retail)',
      'Salaire minimum cantonal : GE 24.32/h · NE 21.09/h · TI 19.00/h · JU en cours',
    ],
  },

  // ── SANTÉ / SOCIAL ───────────────────────────────────────────────
  health_social: {
    key: 'health_social',
    label: 'Santé / Social / EMS',
    icon: '🏥',
    color: '#E74C3C',
    cct: 'CCT cantonales santé + CCT SBK (soins infirmiers)',
    contrib: {
      formation: {
        label: 'Fonds formation santé',
        er_rate: 0.0025,
        emp_rate: 0.0000,
        base: 'gross',
        notes: 'Variable selon cantons et institutions',
      },
      dextra: {
        night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 1.00,
        night_start_hour: 22, night_end_hour: 6, // nuit dès 22h (CCT santé)
        notes: 'CCT santé — nuit dès 22h, fériés x2, dimanches +50%',
      },
      overtime_rules: {
        threshold_weekly: 42, rate: 0.25, max_weekly: 50,
        notes: 'Présences longues fréquentes — vérifier CCT institutionnelle',
      },
      minimum_wage: {
        monthly_min: 4_500,
        notes: 'CCT santé — infirmière ASA ≈ 5\'200/m, aide-soignant ≈ 4\'200/m',
      },
      thirteenth_mandatory: true,
    },
    defaults: { weekly_hours: 42, vacation_weeks: 5, has_thirteenth: true, salary_type: 'monthly' },
    legal_alerts: [
      '13e salaire obligatoire CCT santé',
      'Nuit dès 22h (≠ LTr standard 23h)',
      'Fériés payés double (établissements 24h/24)',
      'Repos compensatoire pour weekend travaillé',
      'Cas de force majeure : sur-temps compensé ou payé selon CCT',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────
// CALCUL DES COTISATIONS SECTORIELLES
// ─────────────────────────────────────────────────────────────────────

export interface SectorContribResult {
  // Cotisations calculées (CHF)
  far_emp: number;
  far_er: number;
  formation_emp: number;
  formation_er: number;
  sectoral_lpp_emp: number;
  sectoral_lpp_er: number;
  reka_emp: number;
  reka_er: number;
  security_fund_emp: number;
  security_fund_er: number;
  suva_extra_np: number;   // supplément NP SUVA (à l'employé)
  suva_extra_p: number;    // supplément P SUVA (à l'employeur)
  fam_alloc_er_delta: number; // delta vs taux standard 1.4%

  // Totaux
  total_emp_extra: number; // suppléments déductions employé
  total_er_extra: number;  // suppléments charges patronales

  // Détails lignes pour bulletin de salaire
  lines_emp: Array<{ label: string; amount: number; rate?: number }>;
  lines_er: Array<{ label: string; amount: number; rate?: number }>;
}

export function calculateSectorContribs(
  grossMonthly: number,
  sector: SectorProfile,
  grossCapped: number = Math.min(grossMonthly, 12_350), // base plafonnée
): SectorContribResult {
  const c = sector.contrib;
  const lines_emp: Array<{ label: string; amount: number; rate?: number }> = [];
  const lines_er: Array<{ label: string; amount: number; rate?: number }> = [];

  // FAR
  const far_er = c.far
    ? (c.far.base === 'capped' ? grossCapped : grossMonthly) * c.far.er_rate
    : 0;
  const far_emp = c.far && c.far.emp_rate
    ? (c.far.base === 'capped' ? grossCapped : grossMonthly) * c.far.emp_rate
    : 0;
  if (far_emp > 0) lines_emp.push({ label: c.far!.label, amount: far_emp, rate: c.far!.emp_rate });
  if (far_er > 0)  lines_er.push({ label: c.far!.label, amount: far_er,  rate: c.far!.er_rate });

  // Formation
  const form_base = c.formation?.ceiling_monthly
    ? Math.min(grossMonthly, c.formation.ceiling_monthly)
    : grossMonthly;
  const formation_emp = c.formation?.emp_rate ? form_base * c.formation.emp_rate : 0;
  const formation_er  = c.formation           ? form_base * c.formation.er_rate  : 0;
  if (formation_emp > 0) lines_emp.push({ label: c.formation!.label, amount: formation_emp, rate: c.formation!.emp_rate });
  if (formation_er > 0)  lines_er.push({ label: c.formation!.label, amount: formation_er,  rate: c.formation!.er_rate });

  // Caisse LPP sectorielle
  const sectoral_lpp_emp = c.sectoral_lpp ? grossMonthly * c.sectoral_lpp.emp_rate : 0;
  const sectoral_lpp_er  = c.sectoral_lpp ? grossMonthly * c.sectoral_lpp.er_rate  : 0;
  if (sectoral_lpp_emp > 0) lines_emp.push({ label: c.sectoral_lpp!.label, amount: sectoral_lpp_emp, rate: c.sectoral_lpp!.emp_rate });
  if (sectoral_lpp_er > 0)  lines_er.push({ label: c.sectoral_lpp!.label, amount: sectoral_lpp_er,  rate: c.sectoral_lpp!.er_rate });

  // REKA
  const reka_base = c.reka?.ceiling_monthly
    ? Math.min(grossMonthly, c.reka.ceiling_monthly)
    : grossMonthly;
  const reka_emp = c.reka ? reka_base * c.reka.emp_rate : 0;
  const reka_er  = c.reka ? reka_base * c.reka.er_rate  : 0;
  if (reka_emp > 0) lines_emp.push({ label: c.reka!.label + ' (employé)', amount: reka_emp, rate: c.reka!.emp_rate });
  if (reka_er > 0)  lines_er.push({ label: c.reka!.label + ' (employeur)', amount: reka_er, rate: c.reka!.er_rate });

  // Fonds garantie
  const security_fund_emp = c.security_fund?.emp_rate ? grossMonthly * c.security_fund.emp_rate : 0;
  const security_fund_er  = c.security_fund ? grossMonthly * c.security_fund.er_rate : 0;
  if (security_fund_emp > 0) lines_emp.push({ label: c.security_fund!.label, amount: security_fund_emp });
  if (security_fund_er > 0)  lines_er.push({ label: c.security_fund!.label, amount: security_fund_er });

  // Surcharge SUVA
  const suva_extra_np = c.suva_surcharge
    ? Math.min(grossMonthly, 12_350) * c.suva_surcharge.extra_np_rate
    : 0;
  const suva_extra_p  = c.suva_surcharge
    ? Math.min(grossMonthly, 12_350) * c.suva_surcharge.extra_p_rate
    : 0;
  if (suva_extra_np > 0) lines_emp.push({ label: c.suva_surcharge!.label + ' NP', amount: suva_extra_np });
  if (suva_extra_p > 0)  lines_er.push({ label: c.suva_surcharge!.label + ' P',   amount: suva_extra_p });

  // Allocations familiales delta
  const STD_FAM_ALLOC = 0.014;
  const fam_alloc_er_delta = c.fam_alloc
    ? grossMonthly * (c.fam_alloc.er_rate - STD_FAM_ALLOC)
    : 0;
  if (fam_alloc_er_delta > 0.01) {
    lines_er.push({ label: c.fam_alloc!.label + ' (supplément)', amount: fam_alloc_er_delta });
  }

  const total_emp_extra = far_emp + formation_emp + sectoral_lpp_emp + reka_emp + security_fund_emp + suva_extra_np;
  const total_er_extra  = far_er  + formation_er  + sectoral_lpp_er  + reka_er  + security_fund_er  + suva_extra_p + fam_alloc_er_delta;

  return {
    far_emp, far_er,
    formation_emp, formation_er,
    sectoral_lpp_emp, sectoral_lpp_er,
    reka_emp, reka_er,
    security_fund_emp, security_fund_er,
    suva_extra_np, suva_extra_p,
    fam_alloc_er_delta,
    total_emp_extra, total_er_extra,
    lines_emp, lines_er,
  };
}

// ─────────────────────────────────────────────────────────────────────
// IMPÔT À LA SOURCE — Barèmes simplifiés par canton (2025)
// ─────────────────────────────────────────────────────────────────────
//
// Barème A = célibataire sans enfant / B = marié·e 1 revenu /
// C = marié·e 2 revenus / D = célibataire avec enfants /
// H = ménage monoparental
//
// NB : Les barèmes officiels sont des tables de montant fixe + %
// sur la tranche. On utilise ici des taux effectifs moyens par
// tranche de revenu (approximation — pour calcul exact utiliser
// les tables DFI officielles ou connecteur Swissdec).
// ─────────────────────────────────────────────────────────────────────

export type ISBarem = 'A' | 'B' | 'C' | 'D' | 'H';

// Taux effectif moyen IS selon barème et tranche revenu mensuel (2025, indicatif)
// Format : [seuil_mensuel, taux_effectif_A, B, C, D, H]
const IS_RATES_BY_CANTON: Record<string, Array<[number, number, number, number, number, number]>> = {
  // [revenu_mensuel, A, B, C, D, H]
  ZH: [
    [2000,  0.046, 0.000, 0.000, 0.020, 0.010],
    [3000,  0.086, 0.040, 0.040, 0.060, 0.050],
    [4000,  0.108, 0.060, 0.058, 0.082, 0.072],
    [5000,  0.122, 0.080, 0.076, 0.098, 0.088],
    [6000,  0.133, 0.095, 0.090, 0.110, 0.100],
    [8000,  0.148, 0.112, 0.106, 0.124, 0.114],
    [10000, 0.158, 0.124, 0.117, 0.134, 0.124],
    [15000, 0.172, 0.140, 0.131, 0.148, 0.138],
    [99999, 0.185, 0.155, 0.145, 0.162, 0.152],
  ],
  BE: [
    [2000,  0.042, 0.000, 0.000, 0.018, 0.008],
    [3000,  0.082, 0.038, 0.037, 0.057, 0.047],
    [4000,  0.104, 0.058, 0.056, 0.079, 0.069],
    [5000,  0.118, 0.076, 0.073, 0.094, 0.084],
    [6000,  0.130, 0.091, 0.087, 0.107, 0.097],
    [8000,  0.145, 0.108, 0.103, 0.121, 0.111],
    [10000, 0.155, 0.120, 0.114, 0.131, 0.121],
    [15000, 0.169, 0.136, 0.128, 0.145, 0.135],
    [99999, 0.182, 0.151, 0.142, 0.158, 0.148],
  ],
  GE: [
    [2000,  0.052, 0.000, 0.000, 0.024, 0.014],
    [3000,  0.093, 0.044, 0.042, 0.065, 0.055],
    [4000,  0.116, 0.065, 0.062, 0.088, 0.078],
    [5000,  0.131, 0.084, 0.080, 0.104, 0.094],
    [6000,  0.143, 0.099, 0.094, 0.116, 0.106],
    [8000,  0.158, 0.116, 0.110, 0.130, 0.120],
    [10000, 0.168, 0.128, 0.121, 0.140, 0.130],
    [15000, 0.181, 0.143, 0.135, 0.153, 0.143],
    [99999, 0.193, 0.158, 0.148, 0.166, 0.156],
  ],
  VD: [
    [2000,  0.048, 0.000, 0.000, 0.021, 0.011],
    [3000,  0.088, 0.042, 0.040, 0.062, 0.052],
    [4000,  0.110, 0.062, 0.059, 0.084, 0.074],
    [5000,  0.124, 0.080, 0.076, 0.099, 0.089],
    [6000,  0.136, 0.095, 0.090, 0.112, 0.102],
    [8000,  0.151, 0.112, 0.106, 0.126, 0.116],
    [10000, 0.161, 0.124, 0.117, 0.136, 0.126],
    [15000, 0.175, 0.139, 0.131, 0.150, 0.140],
    [99999, 0.188, 0.154, 0.144, 0.162, 0.152],
  ],
  JU: [
    [2000,  0.044, 0.000, 0.000, 0.019, 0.009],
    [3000,  0.084, 0.040, 0.038, 0.059, 0.049],
    [4000,  0.106, 0.060, 0.057, 0.081, 0.071],
    [5000,  0.120, 0.078, 0.074, 0.096, 0.086],
    [6000,  0.132, 0.093, 0.088, 0.109, 0.099],
    [8000,  0.147, 0.110, 0.104, 0.123, 0.113],
    [10000, 0.157, 0.122, 0.115, 0.133, 0.123],
    [15000, 0.171, 0.137, 0.129, 0.147, 0.137],
    [99999, 0.184, 0.152, 0.142, 0.160, 0.150],
  ],
  // Autres cantons : taux BE utilisés comme référence (approx.)
};

// Fallback pour cantons non renseignés → taux BE
const IS_FALLBACK = IS_RATES_BY_CANTON['BE'];

export function calculateIS(
  grossMonthly: number,
  canton: string,
  bareme: ISBarem,
  nbChildren: number = 0,
): { rate: number; amount: number; bareme: ISBarem; notes: string } {
  const table = IS_RATES_BY_CANTON[canton.toUpperCase()] ?? IS_FALLBACK;
  const bIdx = { A: 1, B: 2, C: 3, D: 4, H: 5 }[bareme] as number;

  // Trouver la tranche
  let rate = table[table.length - 1][bIdx];
  for (const row of table) {
    if (grossMonthly <= row[0]) { rate = row[bIdx]; break; }
  }

  // Réduction enfants (barèmes D et H déjà intégrés — B avec enfants : -0.5% par enfant supplémentaire)
  if (bareme === 'B' && nbChildren > 0) {
    rate = Math.max(0, rate - nbChildren * 0.005);
  }

  const amount = grossMonthly * rate;

  return {
    rate,
    amount: Math.round(amount * 100) / 100,
    bareme,
    notes: `Barème ${bareme} · ${canton} · taux effectif ${(rate * 100).toFixed(1)}% (indicatif — vérifier table officielle DFI)`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 13E SALAIRE — Calcul et provisionnement
// ─────────────────────────────────────────────────────────────────────

export type ThirteenthMode = 'monthly_provision' | 'december' | 'july_december';

export function calculate13th(
  grossMonthly: number,
  mode: ThirteenthMode,
  currentMonth: number, // 1–12
  isSector: SectorKey,
): {
  provision_monthly: number;    // montant à provisionner chaque mois
  payable_this_month: number;   // montant à verser ce mois (0 ou full)
  cumulated_provision: number;  // estimation provision accumulée sur l'année
} {
  const annual13th = grossMonthly; // 13e = 1 salaire mensuel
  const monthly_provision = annual13th / 12;

  let payable_this_month = 0;
  if (mode === 'monthly_provision') {
    payable_this_month = monthly_provision;
  } else if (mode === 'december' && currentMonth === 12) {
    payable_this_month = annual13th;
  } else if (mode === 'july_december') {
    // L-GAV : 50% juillet + 50% décembre
    if (currentMonth === 7 || currentMonth === 12) payable_this_month = annual13th / 2;
  }

  return {
    provision_monthly: monthly_provision,
    payable_this_month,
    cumulated_provision: monthly_provision * currentMonth,
  };
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS EXPORTS
// ─────────────────────────────────────────────────────────────────────

export function getSectorProfile(key: string): SectorProfile {
  return SECTOR_PROFILES[key as SectorKey] ?? SECTOR_PROFILES.office;
}

export function getSectorDextraRates(key: string) {
  return SECTOR_PROFILES[key as SectorKey]?.contrib.dextra ?? SECTOR_PROFILES.office.contrib.dextra!;
}

export function getSectorMinWage(key: string) {
  return SECTOR_PROFILES[key as SectorKey]?.contrib.minimum_wage ?? null;
}

export function getAllSectors(): Array<{ key: SectorKey; label: string; icon: string }> {
  return Object.values(SECTOR_PROFILES).map(s => ({ key: s.key, label: s.label, icon: s.icon }));
}
