/**
 * SWISSRH — Moteur de calcul de salaire suisse
 * ============================================================
 * Taux officiels 2025 (Swissdec 5.0)
 * Couvre : AVS/AI/APG, AC, LPP (par tranches d'âge),
 *          LAA (NP + P), IJM, allocations familiales,
 *          salaires horaires avec toutes les majorations
 * ============================================================
 */

// ── TAUX 2025 ────────────────────────────────────────────────────────────

export const RATES_2025 = {
  // Employé + Employeur (taux identiques)
  avs:  0.053,   // AVS/AHV
  ai:   0.007,   // AI/IV
  apg:  0.00225, // APG/EO

  ac:   0.011,   // AC/ALV — sur salaire jusqu'à 148'200/an (12'350/mois)
  ac_threshold_monthly: 12_350,

  // LPP — par tranche d'âge, part EMPLOYÉ (employeur = même montant)
  lpp: {
    min_age: 25,
    rates: [
      { from: 25, to: 34, rate: 0.07  },
      { from: 35, to: 44, rate: 0.10  },
      { from: 45, to: 54, rate: 0.15  },
      { from: 55, to: 99, rate: 0.18  },
    ],
    // Déduction de coordination mensuelle 2025 (25'725/12 ≈ 2'143.75)
    coordination_monthly: 2_143.75,
    // Seuil d'entrée LPP mensuel (22'050/12)
    entry_threshold_monthly: 1_837.50,
  },

  laa_np:  0.013,  // LAA non-professionnelle (NBUV) — employé uniquement
  laa_p:   0.008,  // LAA professionnelle — employeur uniquement

  ijm:     0.0075, // IJM partagé 50/50 employé/employeur = 0.75% chacun

  fam_alloc: 0.014, // Allocations familiales — employeur uniquement

  // Majorations légales
  overtime_rate:  0.25, // CO Art. 321c
  night_rate:     0.25, // LTr Art. 17b (23h-06h)
  sunday_rate:    0.50, // LTr Art. 19
  holiday_rate:   1.00, // 1er août, Noël, etc.

  // Indemnités vacances (% du brut)
  vacation: {
    4: 8.33 / 100,   // 4 semaines
    5: 10.64 / 100,  // 5 semaines (standard CH)
    6: 13.04 / 100,  // 6 semaines
  } as Record<number, number>,
};

// ── TYPES ────────────────────────────────────────────────────────────────

export interface SalaryInput {
  grossMonthly: number;         // Salaire brut mensuel
  age: number;
  activityRate?: number;        // % ex: 100, 80, 60
  hasLpp?: boolean;
  hasLaa?: boolean;
  hasIjm?: boolean;
  familyAllowance?: number;     // CHF/mois (allocations fam. = positif)

  // Heures (si salarié horaire)
  isHourly?: boolean;
  hourlyRate?: number;          // CHF/h
  hoursNormal?: number;         // centièmes
  hoursExtra25?: number;        // +25%
  hoursNight?: number;          // +25%
  hoursSunday?: number;         // +50%
  hoursHoliday?: number;        // jours fériés
  vacationWeeks?: number;       // 4 | 5 | 6
  bonus?: number;
}

export interface SalaryResult {
  // Brut
  grossBase: number;            // Salaire de base
  grossHours: number;           // Montant heures normales (horaire)
  grossExtra25: number;
  grossNight: number;
  grossSunday: number;
  grossHoliday: number;
  grossVacation: number;        // Indemnité vacances
  grossBonus: number;
  grossTotal: number;           // Total brut (base de calcul déductions)

  // Déductions employé
  avs: number;
  ai: number;
  apg: number;
  ac: number;
  lpp: number;
  lppRate: number;              // Taux LPP effectif
  laaNp: number;
  ijm: number;
  familyAllowance: number;      // positif = ajout
  totalDeductions: number;

  // Net
  netSalary: number;

  // Charges patronales
  avsEr: number;
  aiEr: number;
  apgEr: number;
  acEr: number;
  lppEr: number;
  laaPEr: number;
  ijmEr: number;
  famAllocEr: number;
  totalEmployer: number;

  // Total
  totalCost: number;            // brut + charges patronales

  // Méta
  lppBase: number;              // Base LPP (après déduction coordination)
  acBase: number;               // Base AC (plafonnée)
}

// ── CALCUL LPP ───────────────────────────────────────────────────────────

export function getLppRate(age: number): number {
  if (age < RATES_2025.lpp.min_age) return 0;
  for (const bracket of RATES_2025.lpp.rates) {
    if (age >= bracket.from && age <= bracket.to) return bracket.rate;
  }
  return 0;
}

// ── CALCUL PRINCIPAL ─────────────────────────────────────────────────────

export function calculateSalary(input: SalaryInput): SalaryResult {
  const {
    age,
    activityRate = 100,
    hasLpp = true,
    hasLaa = true,
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
    bonus = 0,
  } = input;

  const r = RATES_2025;

  // ── Éléments bruts ───────────────────────────────────────────────────

  let grossBase = 0, grossHours = 0, grossExtra25 = 0, grossNight = 0;
  let grossSunday = 0, grossHoliday = 0, grossVacation = 0;

  if (isHourly && hourlyRate > 0) {
    grossHours   = hoursNormal  * hourlyRate;
    grossExtra25 = hoursExtra25 * hourlyRate * (1 + r.overtime_rate);
    grossNight   = hoursNight   * hourlyRate * (1 + r.night_rate);
    grossSunday  = hoursSunday  * hourlyRate * (1 + r.sunday_rate);
    grossHoliday = hoursHoliday * hourlyRate;
    // Indemnité vacances = % sur tous les éléments horaires
    const vacRate = r.vacation[vacationWeeks] || r.vacation[5];
    grossVacation = (grossHours + grossExtra25 + grossNight + grossSunday + grossHoliday + bonus) * vacRate;
    grossBase     = 0;
  } else {
    grossBase = input.grossMonthly * (activityRate / 100);
  }

  const grossBonus  = bonus;
  const grossTotal  = grossBase + grossHours + grossExtra25 + grossNight + grossSunday + grossHoliday + grossVacation + grossBonus;

  // ── Base plafonnée AC ─────────────────────────────────────────────────
  const acBase  = Math.min(grossTotal, r.ac_threshold_monthly);

  // ── LPP ───────────────────────────────────────────────────────────────
  const lppRate  = hasLpp ? getLppRate(age) : 0;
  const lppBase  = hasLpp && grossTotal >= r.lpp.entry_threshold_monthly
    ? Math.max(0, grossTotal - r.lpp.coordination_monthly)
    : 0;
  const lpp = lppBase * (lppRate / 2);  // Part employé = moitié du taux global

  // ── Déductions employé ────────────────────────────────────────────────
  const avs   = grossTotal * r.avs;
  const ai    = grossTotal * r.ai;
  const apg   = grossTotal * r.apg;
  const ac    = acBase     * r.ac;
  const laaNp = hasLaa ? grossTotal * r.laa_np : 0;
  const ijm   = hasIjm ? grossTotal * r.ijm    : 0;

  const totalDeductions = avs + ai + apg + ac + lpp + laaNp + ijm - familyAllowance;
  const netSalary = grossTotal - totalDeductions;

  // ── Charges patronales ────────────────────────────────────────────────
  const avsEr      = grossTotal * r.avs;
  const aiEr       = grossTotal * r.ai;
  const apgEr      = grossTotal * r.apg;
  const acEr       = acBase     * r.ac;
  const lppEr      = lpp;                             // = part employé
  const laaPEr     = hasLaa ? grossTotal * r.laa_p  : 0;
  const ijmEr      = hasIjm ? grossTotal * r.ijm    : 0;
  const famAllocEr = grossTotal * r.fam_alloc;

  const totalEmployer = avsEr + aiEr + apgEr + acEr + lppEr + laaPEr + ijmEr + famAllocEr;
  const totalCost     = grossTotal + totalEmployer;

  return {
    grossBase, grossHours, grossExtra25, grossNight, grossSunday,
    grossHoliday, grossVacation, grossBonus, grossTotal,
    avs, ai, apg, ac, lpp, lppRate: lppRate / 2, laaNp, ijm,
    familyAllowance,
    totalDeductions,
    netSalary,
    avsEr, aiEr, apgEr, acEr, lppEr, laaPEr, ijmEr, famAllocEr,
    totalEmployer,
    totalCost,
    lppBase,
    acBase,
  };
}

// ── CONVERSION CENTIÈMES ─────────────────────────────────────────────────

export function centToHMM(centesimals: number): { hours: number; minutes: number; str: string } {
  const hours = Math.floor(centesimals);
  const minutes = Math.round((centesimals - hours) * 60);
  return { hours, minutes, str: `${hours}h${String(minutes).padStart(2, '0')}` };
}

export function hmmToCent(hours: number, minutes: number): number {
  return hours + minutes / 60;
}

export function parseTimeInput(val: string): number | null {
  if (!val || val.trim() === '') return null;
  val = val.trim();
  // Centièmes: 8.50 ou 8,50
  if (/^\d+[.,]\d+$/.test(val)) return parseFloat(val.replace(',', '.'));
  // H:MM
  if (/^\d+:\d{1,2}$/.test(val)) {
    const [h, m] = val.split(':');
    return hmmToCent(parseInt(h), parseInt(m));
  }
  // Entier pur
  if (/^\d+$/.test(val)) return parseInt(val);
  return null;
}

// ── TAUX HORAIRE ─────────────────────────────────────────────────────────

export function monthlyToHourly(
  monthlySalary: number,
  weeklyHours: number,
  weeksPerYear = 52
): number {
  // Formule officielle suisse Swissdec
  return monthlySalary * 12 / weeksPerYear / weeklyHours;
}

export function hourlyToMonthly(
  hourlyRate: number,
  weeklyHours: number,
  weeksPerMonth = 4.33
): number {
  return hourlyRate * weeklyHours * weeksPerMonth;
}

// ── VACANCES ─────────────────────────────────────────────────────────────

export const VACATION_RATES: Record<number, number> = {
  4: 8.33 / 100,
  5: 10.64 / 100,
  6: 13.04 / 100,
};

export function vacationIndemnity(grossAmount: number, weeks: number): number {
  const rate = VACATION_RATES[weeks] || VACATION_RATES[5];
  return grossAmount * rate;
}
