import {
  calculateSectorContribs, calculateIS, calculate13th,
  getSectorProfile, type SectorKey, type ISBarem, type ThirteenthMode,
} from './sector-contributions.js';

export { calculateSectorContribs, calculateIS, calculate13th, getSectorProfile };
export type { SectorKey, ISBarem, ThirteenthMode };

/**
 * SWISSRH — Moteur de calcul de salaire suisse COMPLET
 * =====================================================================
 * Taux 2025 (Swissdec 5.0)
 *
 * Couvre TOUT :
 *   AVS/AI/APG, AC, ACE (solidarité), LPP (tranches d'âge),
 *   LAA NP + LAA P, LAAC (complémentaire sur >plafond),
 *   IJM, allocations familiales, impôt à la source,
 *   13e salaire, RHT, APG maternité/paternité/militaire,
 *   salaires horaires + toutes majorations légales,
 *   vacances pro-rata, décompte de sortie
 * =====================================================================
 */

// ── CONSTANTES 2025 ──────────────────────────────────────────────────────

export const CH_2025 = {
  // AVS/AI/APG — taux 2025 (identiques employé + employeur)
  avs_rate:     0.053,    // 5.3%
  ai_rate:      0.007,    // 0.7%
  apg_rate:     0.00225,  // 0.225%

  // AC (chômage) — 1.1% chacun sur salaire ≤ 148'200/an
  ac_rate:      0.011,
  ac_ceiling_year:    148_200,
  ac_ceiling_monthly: 12_350,  // 148'200 / 12

  // ACE — cotisation de solidarité sur salaire > 148'200/an (employé ONLY, pas employeur)
  // CO Art. 5 LACI — 0.5% sur la part excédentaire jusqu'à 296'400/an (2× plafond)
  ace_rate:     0.005,    // 0.5%
  ace_ceiling_monthly: 24_700,  // 296'400 / 12 (pas de cotisation au-delà)

  // LPP — taux globaux par tranche d'âge (employé + employeur = taux ci-dessous)
  lpp: {
    min_age:      25,
    max_age:      64, // femmes / 65 hommes — retraite ordinaire
    rates: [
      { from: 25, to: 34, rate: 0.07  },  // 3.5% emp + 3.5% er
      { from: 35, to: 44, rate: 0.10  },  // 5% + 5%
      { from: 45, to: 54, rate: 0.15  },  // 7.5% + 7.5%
      { from: 55, to: 65, rate: 0.18  },  // 9% + 9%
    ],
    coordination_year:    25_725,   // déduction de coordination 2025
    coordination_monthly: 2_143.75, // 25'725 / 12
    entry_threshold_year: 22_050,   // seuil d'entrée LPP annuel
    entry_threshold_monthly: 1_837.50,
    max_insured_year:     88_200,   // salaire LPP maximal assuré 2025
  },

  // LAA — SUVA
  laa_np_rate:  0.013,  // Non-professionnelle (NBUV) — EMPLOYÉ uniquement
  laa_p_rate:   0.008,  // Professionnelle (BUV) — EMPLOYEUR uniquement
  laa_ceiling_year:    148_200,
  laa_ceiling_monthly: 12_350,

  // LAAC — complémentaire (sur salaire > plafond LAA)
  laac: {
    ceiling_monthly: 12_350,
    default_emp_rate: 0.005,   // indicatif — selon police
    default_er_rate:  0.005,
  },

  // IJM — Indemnité journalière maladie
  ijm_rate:     0.0075,  // 0.75% chacun (total 1.5%)

  // Allocations familiales (varie par canton — taux indicatif JU)
  fam_alloc_rate:   0.014,  // employeur uniquement

  // APG — Allocations pour perte de gain
  apg: {
    maternity_weeks:       14,    // 14 semaines (98 jours)
    paternity_weeks:       2,     // 2 semaines (14 jours)
    rate:                  0.80,  // 80% du revenu
    max_daily_rate:        196,   // CHF/jour max 2025
    max_annual_earnings:   88_200, // revenu déterminant max
  },

  // Maintien de salaire CO Art. 324a — Echelle bernoise (maladie)
  salary_maintenance: [
    { months_employed: 1,   weeks: 3  },
    { months_employed: 12,  weeks: 8  },
    { months_employed: 24,  weeks: 13 },
    { months_employed: 60,  weeks: 18 },
    { months_employed: 120, weeks: 26 },
  ],

  // 13e salaire — 1/12 du salaire annuel brut
  thirteenth_factor: 1/12,  // provisionné chaque mois = 8.33%

  // Majorations légales
  overtime_rate: 0.25,  // HS: +25% (CO Art. 321c)
  night_rate:    0.25,  // Nuit 23h–06h: +25% (LTr Art. 17b)
  sunday_rate:   0.50,  // Dimanche: +50% (LTr Art. 19)

  // Indemnités vacances (employés horaires — % sur brut)
  vacation_indemnity: {
    4: 8.33  / 100,
    5: 10.64 / 100,
    6: 13.04 / 100,
  } as Record<number, number>,

  // Saisie sur salaire — minimum vital LP Art. 93
  // Montant de base 2025 pour personne seule (varie selon canton)
  seizure_minimum_monthly: 1_200,  // indicatif — à ajuster selon décision officielle

} as const;

// ── TYPES ────────────────────────────────────────────────────────────────

export interface EmployeeProfile {
  age: number;
  activityRate: number;         // 10–100%
  weeklyHours: number;
  vacationWeeks: number;        // 4 | 5 | 6
  canton: string;               // canton de travail
  // Assurances
  hasLpp: boolean;
  hasLaa: boolean;
  hasLaac: boolean;
  laacEmpRate?: number;
  laacErRate?: number;
  hasIjm: boolean;
  // Impôt à la source
  withholdingTax: boolean;
  isBareme?: ISBarem;
  isNbChildren?: number;
  whtRate?: number;
  // Contrat
  hasThirteenth: boolean;
  thirteenthMode?: ThirteenthMode;
  // Type de salaire
  salaryType: 'monthly' | 'hourly';
  // Secteur
  sector?: SectorKey;
  dextraNightRate?: number;
  dextraSundayRate?: number;
}

export interface MonthlyPayInput {
  profile: EmployeeProfile;

  // Salaire mensuel (pour salaried)
  grossMonthly?: number;

  // Heures (pour horaire)
  hourlyRate?: number;
  hoursNormal?: number;
  hoursExtra25?: number;        // +25% HS
  hoursNight?: number;          // +25% nuit
  hoursSunday?: number;         // +50% dim
  hoursHoliday?: number;        // fériés

  // Éléments variables
  bonus?: number;               // prime
  thirteenthSalary?: number;    // 13e versé ce mois (décembre ou mois configuré)
  familyAllowance?: number;     // allocations familiales (crédit)
  salaryAdvance?: number;       // avance à déduire
  wageGarnishment?: number;     // saisie sur salaire
  expenseReimbursement?: number; // frais (non soumis charges)

  // Absences déduites
  absenceDays?: number;         // jours non payés
  workingDaysInMonth?: number;  // jours ouvrables du mois (pour calcul pro-rata)

  // RHT
  rhtLostHours?: number;        // heures perdues RHT
  rhtIndemnityRate?: number;    // taux indemnisation RHT (défaut 80%)
}

export interface PayslipResult {
  // ── Éléments bruts
  grossBase:          number;  // salaire de base mensuel
  grossHours:         number;
  grossExtra25:       number;
  grossNight:         number;
  grossSunday:        number;
  grossHoliday:       number;
  grossVacIndemnity:  number;  // indemnité vacances (horaire)
  grossThirteenth:    number;  // 13e salaire
  grossBonus:         number;
  grossRhtIndemnity:  number;  // indemnité RHT (Kurzarbeit)
  grossTotal:         number;  // TOTAL BRUT soumis aux charges

  expenseReimbursement: number; // hors charges — aparaît séparément sur fiche

  // ── Bases de calcul
  acBase:    number;   // brut plafonné AC (max 12'350/m)
  aceBase:   number;   // part > plafond AC (pour ACE)
  lppBase:   number;   // brut après déduction coordination
  laacBase:  number;   // part > plafond LAA (pour LAAC)

  // ── Déductions employé
  avs:        number;  // 5.3%
  ai:         number;  // 0.7%
  apg:        number;  // 0.225%
  ac:         number;  // 1.1% (plafonné)
  ace:        number;  // 0.5% solidarité (sur dépassement)
  lpp:        number;  // part employé LPP
  lppRate:    number;  // taux effectif part employé
  laaNp:      number;  // 1.3% NBUV
  laac:       number;  // LAAC part employé
  ijm:        number;  // 0.75% IJM
  withholdingTax: number; // impôt à la source
  whtRate:    number;
  salaryAdvance:    number;
  wageGarnishment:  number;
  familyAllowance:  number; // positif = crédit sur fiche
  totalDeductions:  number;

  // ── Net
  netSalary: number;  // brut - déductions + allocations fam - avances - saisies

  // ── Charges patronales
  avsEr:        number;
  aiEr:         number;
  apgEr:        number;
  acEr:         number;
  // ACE = 0 côté employeur (cotisation de solidarité employé uniquement)
  lppEr:        number;
  laaPEr:       number;  // 0.8% LAA prof.
  laacEr:       number;  // LAAC part employeur
  ijmEr:        number;
  famAllocEr:   number;  // 1.4% allocations fam.
  totalEmployer: number;

  // ── Coût total employeur
  totalCost: number;  // brut + charges patronales (hors frais)

  // ── Cotisations sectorielles (FAR, Parifonds, REKA, HESTA, etc.)
  sectorContribEmp:   number;  // total suppléments déductions employé
  sectorContribEr:    number;  // total suppléments charges patronales
  sectorLines_emp:    Array<{ label: string; amount: number; rate?: number }>;
  sectorLines_er:     Array<{ label: string; amount: number; rate?: number }>;

  // ── 13e salaire
  thirteenth_provision: number;   // provision mensuelle
  thirteenth_payable:   number;   // montant versé ce mois

  // ── Diagnostics
  isAboveAcCeiling:   boolean;
  isAboveAceCeiling:  boolean;
  isAboveLaaCeiling:  boolean;
  hasLppDeduction:    boolean;
  sectorKey:          string;
}

// ── LPP ──────────────────────────────────────────────────────────────────

export function getLppRate(age: number): number {
  if (age < CH_2025.lpp.min_age || age > CH_2025.lpp.max_age) return 0;
  for (const b of CH_2025.lpp.rates) {
    if (age >= b.from && age <= b.to) return b.rate;
  }
  return 0;
}

// ── ACE — Cotisation de solidarité ───────────────────────────────────────
// Uniquement sur la tranche ENTRE plafond AC (12'350) et 2× plafond (24'700)
export function calculateAce(grossMonthly: number): { base: number; amount: number } {
  if (grossMonthly <= CH_2025.ac_ceiling_monthly) return { base: 0, amount: 0 };
  const base = Math.min(grossMonthly, CH_2025.ace_ceiling_monthly) - CH_2025.ac_ceiling_monthly;
  return { base: Math.max(0, base), amount: Math.max(0, base) * CH_2025.ace_rate };
}

// ── APG — Calcul indemnité ────────────────────────────────────────────────
export function calculateApg(
  dailySalary: number,
  type: 'maternity' | 'paternity' | 'military',
  days: number,
): { dailyRate: number; totalAmount: number; cappedAt: number } {
  const maxDaily = CH_2025.apg.max_daily_rate;
  const computed = dailySalary * CH_2025.apg.rate;
  const dailyRate = Math.min(computed, maxDaily);
  return {
    dailyRate,
    totalAmount: dailyRate * days,
    cappedAt: maxDaily,
  };
}

// ── MAINTIEN SALAIRE CO 324a — Echelle bernoise ───────────────────────────
export function getSalaryMaintenanceWeeks(monthsEmployed: number): number {
  let weeks = 3;
  for (const tier of CH_2025.salary_maintenance) {
    if (monthsEmployed >= tier.months_employed) weeks = tier.weeks;
  }
  return weeks;
}

// ── VACANCES — Calcul pro-rata ────────────────────────────────────────────
export function calculateVacationEntitlement(params: {
  vacationWeeks: number;        // semaines contractuelles
  activityRate: number;         // % activité
  hireDateInYear: Date | null;  // null si présent toute l'année
  endDateInYear: Date | null;   // null si encore présent
  year: number;
  workingDaysPerWeek?: number;  // défaut 5
}): {
  fullYearDays: number;   // droit si année complète
  prorataDays: number;    // droit effectif pro-rata
  proRataFactor: number;  // 0.0–1.0
  workingDays: number;    // jours ouvrables (base calcul)
} {
  const wd = params.workingDaysPerWeek ?? 5;
  const fullYearDays = params.vacationWeeks * wd * (params.activityRate / 100);

  // Calcul pro-rata
  let firstDay = new Date(params.year, 0, 1);
  let lastDay  = new Date(params.year, 11, 31);
  if (params.hireDateInYear) firstDay = new Date(Math.max(firstDay.getTime(), params.hireDateInYear.getTime()));
  if (params.endDateInYear)  lastDay  = new Date(Math.min(lastDay.getTime(),  params.endDateInYear.getTime()));

  const totalDaysInYear = 365 + (isLeapYear(params.year) ? 1 : 0);
  const workedDays = Math.max(0, (lastDay.getTime() - firstDay.getTime()) / 86_400_000 + 1);
  const proRataFactor = Math.min(1, workedDays / totalDaysInYear);

  const prorataDays = Math.round(fullYearDays * proRataFactor * 2) / 2; // arrondi 0.5j

  return {
    fullYearDays,
    prorataDays,
    proRataFactor,
    workingDays: Math.round(workedDays),
  };
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// ── DÉCOMPTE DE SORTIE ────────────────────────────────────────────────────
export function calculateExitSettlement(params: {
  grossMonthly: number;
  vacationDaysRemaining: number;
  workingDaysPerMonth?: number;  // défaut 21.67
  hasThirteenth: boolean;
  monthsWorkedThisYear: number;  // pour 13e au pro-rata
}): {
  vacationCompensation: number;  // indemnisation jours vacances restants
  thirteenthProrata: number;     // 13e au pro-rata
  totalExit: number;
} {
  const dpm = params.workingDaysPerMonth ?? 21.67;
  const dailyRate = params.grossMonthly / dpm;
  const vacationCompensation = dailyRate * params.vacationDaysRemaining;
  const thirteenthProrata = params.hasThirteenth
    ? (params.grossMonthly * params.monthsWorkedThisYear) / 12
    : 0;
  return {
    vacationCompensation,
    thirteenthProrata,
    totalExit: vacationCompensation + thirteenthProrata,
  };
}

// ── CALCUL PRINCIPAL MENSUEL ──────────────────────────────────────────────

export function calculateMonthlyPay(input: MonthlyPayInput): PayslipResult {
  const { profile } = input;
  const r = CH_2025;

  // ── Brut de base ─────────────────────────────────────────────────────

  let grossBase = 0, grossHours = 0, grossExtra25 = 0, grossNight = 0;
  let grossSunday = 0, grossHoliday = 0, grossVacIndemnity = 0, grossRhtIndemnity = 0;

  if (profile.salaryType === 'hourly' && input.hourlyRate) {
    const hr = input.hourlyRate;
    grossHours    = (input.hoursNormal  || 0) * hr;
    grossExtra25  = (input.hoursExtra25 || 0) * hr * (1 + r.overtime_rate);
    grossNight    = (input.hoursNight   || 0) * hr * (1 + r.night_rate);
    grossSunday   = (input.hoursSunday  || 0) * hr * (1 + r.sunday_rate);
    grossHoliday  = (input.hoursHoliday || 0) * hr;

    const vacRate = r.vacation_indemnity[profile.vacationWeeks] ?? r.vacation_indemnity[5];
    const baseForVac = grossHours + grossExtra25 + grossNight + grossSunday + grossHoliday + (input.bonus || 0);
    grossVacIndemnity = baseForVac * vacRate;
  } else if (input.grossMonthly) {
    grossBase = input.grossMonthly * (profile.activityRate / 100);

    // Déduction absences non payées (pro-rata jours)
    if (input.absenceDays && input.workingDaysInMonth) {
      const dailyRate = grossBase / input.workingDaysInMonth;
      grossBase = Math.max(0, grossBase - dailyRate * input.absenceDays);
    }
  }

  // Indemnité RHT (80% des heures perdues)
  if (input.rhtLostHours && input.hourlyRate) {
    const rhtRate = input.rhtIndemnityRate ?? 0.80;
    grossRhtIndemnity = input.rhtLostHours * input.hourlyRate * rhtRate;
  }

  const grossBonus       = input.bonus || 0;
  const grossThirteenth  = input.thirteenthSalary || 0;
  const expenseReimburse = input.expenseReimbursement || 0; // hors charges sociales

  // Total brut soumis aux charges
  const grossTotal = grossBase + grossHours + grossExtra25 + grossNight
                   + grossSunday + grossHoliday + grossVacIndemnity
                   + grossRhtIndemnity + grossBonus + grossThirteenth;

  // ── Bases de calcul ──────────────────────────────────────────────────
  const acBase  = Math.min(grossTotal, r.ac_ceiling_monthly);
  const aceCalc = calculateAce(grossTotal);
  const aceBase = aceCalc.base;

  const hasLppDeduction = profile.hasLpp && grossTotal >= r.lpp.entry_threshold_monthly;
  const lppRate = profile.hasLpp ? getLppRate(profile.age) : 0;
  const lppBase = hasLppDeduction ? Math.max(0, grossTotal - r.lpp.coordination_monthly) : 0;

  const isAboveLaaCeiling = profile.hasLaac && grossTotal > r.laac.ceiling_monthly;
  const laacBase = isAboveLaaCeiling ? grossTotal - r.laac.ceiling_monthly : 0;

  // ── Déductions employé ────────────────────────────────────────────────
  const avs   = grossTotal * r.avs_rate;
  const ai    = grossTotal * r.ai_rate;
  const apg   = grossTotal * r.apg_rate;
  const ac    = acBase     * r.ac_rate;
  const ace   = aceCalc.amount;  // employé seulement
  const lpp   = lppBase * (lppRate / 2);
  const laaNp = profile.hasLaa  ? Math.min(grossTotal, r.laa_ceiling_monthly) * r.laa_np_rate : 0;
  const laac  = laacBase * (profile.laacEmpRate ?? r.laac.default_emp_rate);
  const ijm   = profile.hasIjm  ? grossTotal * r.ijm_rate : 0;
  const wht   = profile.withholdingTax ? grossTotal * (profile.whtRate ?? 0) : 0;

  const familyAllowance  = input.familyAllowance  || 0;
  const salaryAdvance    = input.salaryAdvance    || 0;
  const wageGarnishment  = input.wageGarnishment  || 0;

  const totalDeductions  = avs + ai + apg + ac + ace + lpp + laaNp + laac + ijm + wht
                         - familyAllowance + salaryAdvance + wageGarnishment;

  const netSalary = grossTotal - totalDeductions + expenseReimburse;

  // ── Charges patronales ────────────────────────────────────────────────
  const avsEr      = grossTotal * r.avs_rate;
  const aiEr       = grossTotal * r.ai_rate;
  const apgEr      = grossTotal * r.apg_rate;
  const acEr       = acBase     * r.ac_rate;
  // ACE = 0 côté employeur
  const lppEr      = lpp;  // part employeur = part employé
  const laaPEr     = profile.hasLaa  ? Math.min(grossTotal, r.laa_ceiling_monthly) * r.laa_p_rate : 0;
  const laacEr     = laacBase * (profile.laacErRate ?? r.laac.default_er_rate);
  const ijmEr      = profile.hasIjm  ? grossTotal * r.ijm_rate : 0;
  // Allocations familiales (taux sectoriel si défini)
  const sectorProfileObj = profile.sector ? getSectorProfile(profile.sector) : null;
  const famAllocRate = sectorProfileObj?.contrib.fam_alloc?.er_rate ?? r.fam_alloc_rate;
  const famAllocEr   = grossTotal * famAllocRate;

  const totalEmployer = avsEr + aiEr + apgEr + acEr + lppEr + laaPEr + laacEr + ijmEr + famAllocEr;

  // ── Cotisations sectorielles ──────────────────────────────────────
  const sectorContrib = sectorProfileObj
    ? calculateSectorContribs(grossTotal, sectorProfileObj, acBase)
    : { total_emp_extra: 0, total_er_extra: 0, lines_emp: [], lines_er: [] };

  // IS auto-calculé si barème fourni (overrride whtRate)
  let finalWht = wht;
  if (profile.withholdingTax && profile.isBareme && !profile.whtRate) {
    const isCalc = calculateIS(grossTotal, profile.canton ?? 'JU', profile.isBareme, profile.isNbChildren ?? 0);
    finalWht = isCalc.amount;
  }

  // 13e salaire
  const now13 = new Date();
  const t13 = profile.hasThirteenth
    ? calculate13th(grossTotal, profile.thirteenthMode ?? 'monthly_provision', now13.getMonth() + 1, profile.sector ?? 'office')
    : { provision_monthly: 0, payable_this_month: 0, cumulated_provision: 0 };

  const totalCost = grossTotal + totalEmployer + sectorContrib.total_er_extra;

  return {
    grossBase, grossHours, grossExtra25, grossNight, grossSunday,
    grossHoliday, grossVacIndemnity, grossThirteenth, grossBonus, grossRhtIndemnity,
    grossTotal, expenseReimbursement: expenseReimburse,
    acBase, aceBase, lppBase, laacBase,
    avs, ai, apg, ac, ace, lpp, lppRate: lppRate / 2, laaNp, laac, ijm,
    withholdingTax: finalWht, whtRate: profile.whtRate ?? 0,
    salaryAdvance, wageGarnishment, familyAllowance, totalDeductions,
    netSalary: grossTotal - totalDeductions - sectorContrib.total_emp_extra + expenseReimburse,
    avsEr, aiEr, apgEr, acEr, lppEr, laaPEr, laacEr, ijmEr, famAllocEr,
    totalEmployer, totalCost,
    sectorContribEmp:  sectorContrib.total_emp_extra,
    sectorContribEr:   sectorContrib.total_er_extra,
    sectorLines_emp:   sectorContrib.lines_emp,
    sectorLines_er:    sectorContrib.lines_er,
    thirteenth_provision: t13.provision_monthly,
    thirteenth_payable:   t13.payable_this_month,
    isAboveAcCeiling:  grossTotal > r.ac_ceiling_monthly,
    isAboveAceCeiling: grossTotal > r.ace_ceiling_monthly,
    isAboveLaaCeiling,
    hasLppDeduction,
    sectorKey: profile.sector ?? 'office',
  };
}

// ── LOHNAUSWEIS — 15 cases Swissdec ──────────────────────────────────────

export function buildLohnausweis(payslips: PayslipResult[], meta: {
  hasCarPrivate?: boolean;
  hasFreeMeals?: boolean;
  hasFreeHousing?: boolean;
  activityRate: number;
  periodFrom: Date;
  periodTo: Date;
}) {
  const sum = (fn: (p: PayslipResult) => number) =>
    payslips.reduce((acc, p) => acc + fn(p), 0);

  return {
    case1_gross:          sum(p => p.grossTotal),
    case2_benefits:       0, // commissions, pourboires — à compléter
    case3_indemnities:    0, // APG/LAA/IJM versées — à compléter
    case4_capital:        0, // capital fin de contrat
    case5_transport:      0, // prise en charge transport employeur
    case6_expenses:       sum(p => p.expenseReimbursement),
    case7_in_kind:        0, // avantages en nature
    case8_participation:  0, // actions/options collaborateur
    case9_avs_ai_apg:     sum(p => p.avs + p.ai + p.apg),
    case10_lpp:           sum(p => p.lpp),
    case11_other_deduc:   sum(p => p.laaNp + p.laac + p.ijm),
    case12_wht:           sum(p => p.withholdingTax),
    case13_car:           meta.hasCarPrivate  ?? false,
    case13_meals:         meta.hasFreeMeals   ?? false,
    case13_housing:       meta.hasFreeHousing ?? false,
    case14_activity_rate: meta.activityRate,
    case15_period_from:   meta.periodFrom,
    case15_period_to:     meta.periodTo,
  };
}

// ── CONVERSION CENTIÈMES ──────────────────────────────────────────────────

export function centToHMM(c: number) {
  const h = Math.floor(c);
  const m = Math.round((c - h) * 60);
  return { hours: h, minutes: m, str: `${h}h${String(m).padStart(2, '0')}` };
}
export function hmmToCent(h: number, m: number): number { return h + m / 60; }
export function parseTimeInput(val: string): number | null {
  if (!val?.trim()) return null;
  const v = val.trim();
  if (/^\d+[.,]\d+$/.test(v)) return parseFloat(v.replace(',', '.'));
  if (/^\d+:\d{1,2}$/.test(v)) { const [h, m] = v.split(':'); return hmmToCent(+h, +m); }
  if (/^\d+$/.test(v)) return +v;
  return null;
}

// ── TAUX HORAIRE ──────────────────────────────────────────────────────────
export function monthlyToHourly(monthly: number, weeklyH: number, weeks = 52) {
  return monthly * 12 / weeks / weeklyH; // formule officielle Swissdec
}
export function hourlyToMonthly(hourly: number, weeklyH: number, wpm = 4.33) {
  return hourly * weeklyH * wpm;
}

// ── JOURS OUVRABLES PAR MOIS ──────────────────────────────────────────────
export function workingDaysInMonth(
  year: number,
  month: number, // 0-indexed
  canton: string,
  holidays: Array<{ holiday_date: string }>,
): number {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  let count = 0;
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // week-end
    const iso = d.toISOString().slice(0, 10);
    const isHoliday = holidays.some(h => h.holiday_date.slice(0, 10) === iso);
    if (!isHoliday) count++;
  }
  return count;
}

/**
 * getHolidaysForCanton — retourne les jours fériés d'un canton pour une année
 * Utilisé dans absences.ts pour calculer les jours ouvrables
 */
export function getHolidaysForCanton(canton: string, year: number): { date: string; name: string }[] {
  const ch = (m: number, d: number, name: string) => ({
    date: `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
    name,
  });
  // Calcul Pâques (algorithme de Butcher)
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d2 = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g2 = Math.floor((b-f+1)/3), h = (19*a+b-d2-g2+15) % 30;
  const i2 = Math.floor(c/4), k = c % 4;
  const l = (32+2*e+2*i2-h-k) % 7;
  const m2 = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m2+114)/31);
  const day   = ((h+l-7*m2+114) % 31) + 1;
  const easter = new Date(year, month-1, day);
  const easterFmt = (offset: number) => {
    const d3 = new Date(easter); d3.setDate(d3.getDate() + offset);
    return `${year}-${String(d3.getMonth()+1).padStart(2,'0')}-${String(d3.getDate()).padStart(2,'0')}`;
  };

  // Fériés nationaux
  const national = [
    ch(1,1,'Nouvel an'), ch(8,1,'Fête nationale'),
    { date: easterFmt(-2), name: 'Vendredi saint' },
    { date: easterFmt(1),  name: 'Lundi de Pâques' },
    { date: easterFmt(39), name: 'Ascension' },
    { date: easterFmt(50), name: 'Lundi de Pentecôte' },
    ch(12,25,'Noël'), ch(12,26,'St-Étienne / 2e jour Noël'),
  ];
  // Fériés cantonaux
  const cantonal: Record<string, ReturnType<typeof ch>[]> = {
    JU: [ch(1,2,'2e janvier'), ch(3,19,'St-Joseph'), ch(5,1,'Fête du Travail'), ch(6,23,'Fête-Dieu'), ch(8,15,'Assomption'), ch(11,1,'Toussaint'), ch(12,8,'Immaculée Conception')],
    BE: [ch(1,2,'2e janvier')],
    FR: [ch(1,2,'2e janvier'), ch(3,19,'St-Joseph'), ch(5,1,'Fête du Travail'), ch(8,15,'Assomption'), ch(11,1,'Toussaint'), ch(12,8,'Immaculée Conception')],
    GE: [ch(12,31,'Restauration de la République')],
    VD: [ch(1,2,'Berchtoldstag')],
    VS: [ch(3,19,'St-Joseph'), ch(8,15,'Assomption'), ch(11,1,'Toussaint'), ch(12,8,'Immaculée Conception')],
    NE: [ch(3,1,'Fête de la République')],
    ZH: [ch(1,2,'Berchtoldstag'), ch(5,1,'Tag der Arbeit')],
    BS: [ch(1,2,'Berchtoldstag'), ch(5,1,'Tag der Arbeit')],
    SG: [ch(1,2,'Berchtoldstag')],
  };
  return [...national, ...(cantonal[canton.toUpperCase()] || [])];
}
