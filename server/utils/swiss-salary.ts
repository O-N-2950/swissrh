/**
 * SWISSRH — Moteur de calcul de salaire suisse
 * ============================================================
 * Taux officiels 2025 (Swissdec 5.0)
 * Couvre : AVS/AI/APG, AC, LPP (par tranches d'âge),
 *          LAA NP + LAA P, LAAC (complémentaire),
 *          IJM, allocations familiales,
 *          salaires horaires avec toutes les majorations
 *
 * LAAC — LAA Complémentaire :
 *   S'applique sur la part de salaire DÉPASSANT le plafond LAA
 *   (148'200 CHF/an = 12'350 CHF/mois).
 *   Taux variable selon police employeur (typiquement 0.5%–2%).
 *   Peut être 100% employeur ou partagé selon contrat.
 * ============================================================
 */

export const RATES_2025 = {
  avs:  0.053,
  ai:   0.007,
  apg:  0.00225,

  ac:   0.011,
  ac_threshold_monthly: 12_350,  // 148'200 / 12

  lpp: {
    min_age: 25,
    rates: [
      { from: 25, to: 34, rate: 0.07  },
      { from: 35, to: 44, rate: 0.10  },
      { from: 45, to: 54, rate: 0.15  },
      { from: 55, to: 99, rate: 0.18  },
    ],
    coordination_monthly:      2_143.75,  // 25'725 / 12
    entry_threshold_monthly:   1_837.50,  // 22'050 / 12
  },

  laa_np: 0.013,   // NBUV — employé uniquement
  laa_p:  0.008,   // BUV  — employeur uniquement

  // LAAC — LAA Complémentaire (sur salaire > plafond LAA 12'350/mois)
  laac: {
    ceiling_monthly:  12_350,   // = plafond LAA
    employee_rate:    0.005,    // 0.5% — taux indicatif, surcharger selon police
    employer_rate:    0.005,    // 0.5% — idem
  },

  ijm:       0.0075,  // 0.75% chacun employé/employeur
  fam_alloc: 0.014,   // allocations familiales — employeur uniquement

  overtime_rate: 0.25,  // CO Art. 321c
  night_rate:    0.25,  // LTr Art. 17b (23h–06h)
  sunday_rate:   0.50,  // LTr Art. 19
  holiday_rate:  1.00,

  vacation: {
    4: 8.33  / 100,
    5: 10.64 / 100,
    6: 13.04 / 100,
  } as Record<number, number>,
};

export interface SalaryInput {
  grossMonthly:      number;
  age:               number;
  activityRate?:     number;

  hasLpp?:           boolean;
  hasLaa?:           boolean;
  hasLaac?:          boolean;   // LAAC activée (si salaire > plafond LAA)
  laacEmployeeRate?: number;    // taux employé LAAC (défaut 0.5%)
  laacEmployerRate?: number;    // taux employeur LAAC (défaut 0.5%)
  hasIjm?:           boolean;
  familyAllowance?:  number;

  isHourly?:         boolean;
  hourlyRate?:       number;
  hoursNormal?:      number;
  hoursExtra25?:     number;
  hoursNight?:       number;
  hoursSunday?:      number;
  hoursHoliday?:     number;
  vacationWeeks?:    number;
  bonus?:            number;
}

export interface SalaryResult {
  // Brut
  grossBase:       number;
  grossHours:      number;
  grossExtra25:    number;
  grossNight:      number;
  grossSunday:     number;
  grossHoliday:    number;
  grossVacation:   number;
  grossBonus:      number;
  grossTotal:      number;

  // Déductions employé
  avs:             number;
  ai:              number;
  apg:             number;
  ac:              number;
  lpp:             number;
  lppRate:         number;
  laaNp:           number;
  laac:            number;   // LAAC part employé
  laacBase:        number;   // montant soumis LAAC
  ijm:             number;
  familyAllowance: number;
  totalDeductions: number;

  // Net
  netSalary: number;

  // Charges patronales
  avsEr:      number;
  aiEr:       number;
  apgEr:      number;
  acEr:       number;
  lppEr:      number;
  laaPEr:     number;
  laacEr:     number;   // LAAC part employeur
  ijmEr:      number;
  famAllocEr: number;
  totalEmployer: number;

  totalCost: number;

  // Méta
  lppBase:           number;
  acBase:            number;
  isAboveLaaCeiling: boolean;
}

export function getLppRate(age: number): number {
  if (age < RATES_2025.lpp.min_age) return 0;
  for (const b of RATES_2025.lpp.rates) {
    if (age >= b.from && age <= b.to) return b.rate;
  }
  return 0;
}

export function calculateSalary(input: SalaryInput): SalaryResult {
  const {
    age,
    activityRate     = 100,
    hasLpp           = true,
    hasLaa           = true,
    hasLaac          = false,
    laacEmployeeRate = RATES_2025.laac.employee_rate,
    laacEmployerRate = RATES_2025.laac.employer_rate,
    hasIjm           = true,
    familyAllowance  = 0,
    isHourly         = false,
    hourlyRate       = 0,
    hoursNormal      = 0,
    hoursExtra25     = 0,
    hoursNight       = 0,
    hoursSunday      = 0,
    hoursHoliday     = 0,
    vacationWeeks    = 5,
    bonus            = 0,
  } = input;

  const r = RATES_2025;

  // Brut
  let grossBase = 0, grossHours = 0, grossExtra25 = 0, grossNight = 0;
  let grossSunday = 0, grossHoliday = 0, grossVacation = 0;

  if (isHourly && hourlyRate > 0) {
    grossHours    = hoursNormal  * hourlyRate;
    grossExtra25  = hoursExtra25 * hourlyRate * (1 + r.overtime_rate);
    grossNight    = hoursNight   * hourlyRate * (1 + r.night_rate);
    grossSunday   = hoursSunday  * hourlyRate * (1 + r.sunday_rate);
    grossHoliday  = hoursHoliday * hourlyRate;
    const vacRate = r.vacation[vacationWeeks] ?? r.vacation[5];
    grossVacation = (grossHours + grossExtra25 + grossNight + grossSunday + grossHoliday + bonus) * vacRate;
  } else {
    grossBase = input.grossMonthly * (activityRate / 100);
  }

  const grossBonus = bonus;
  const grossTotal = grossBase + grossHours + grossExtra25 + grossNight
                   + grossSunday + grossHoliday + grossVacation + grossBonus;

  // AC (plafonnée)
  const acBase = Math.min(grossTotal, r.ac_threshold_monthly);

  // LPP
  const lppRate = hasLpp ? getLppRate(age) : 0;
  const lppBase = hasLpp && grossTotal >= r.lpp.entry_threshold_monthly
    ? Math.max(0, grossTotal - r.lpp.coordination_monthly) : 0;
  const lpp = lppBase * (lppRate / 2);

  // LAAC — uniquement sur la part > plafond LAA (12'350/mois)
  const isAboveLaaCeiling = grossTotal > r.laac.ceiling_monthly;
  const laacBase = hasLaac && isAboveLaaCeiling
    ? grossTotal - r.laac.ceiling_monthly : 0;
  const laac   = laacBase * laacEmployeeRate;
  const laacEr = laacBase * laacEmployerRate;

  // Déductions employé
  const avs   = grossTotal * r.avs;
  const ai    = grossTotal * r.ai;
  const apg   = grossTotal * r.apg;
  const ac    = acBase     * r.ac;
  const laaNp = hasLaa ? grossTotal * r.laa_np : 0;
  const ijm   = hasIjm ? grossTotal * r.ijm    : 0;

  const totalDeductions = avs + ai + apg + ac + lpp + laaNp + laac + ijm - familyAllowance;
  const netSalary = grossTotal - totalDeductions;

  // Charges patronales
  const avsEr      = grossTotal * r.avs;
  const aiEr       = grossTotal * r.ai;
  const apgEr      = grossTotal * r.apg;
  const acEr       = acBase     * r.ac;
  const lppEr      = lpp;
  const laaPEr     = hasLaa ? grossTotal * r.laa_p : 0;
  const ijmEr      = hasIjm ? grossTotal * r.ijm   : 0;
  const famAllocEr = grossTotal * r.fam_alloc;

  const totalEmployer = avsEr + aiEr + apgEr + acEr + lppEr + laaPEr + laacEr + ijmEr + famAllocEr;
  const totalCost     = grossTotal + totalEmployer;

  return {
    grossBase, grossHours, grossExtra25, grossNight,
    grossSunday, grossHoliday, grossVacation, grossBonus, grossTotal,
    avs, ai, apg, ac, lpp, lppRate: lppRate / 2,
    laaNp, laac, laacBase, ijm, familyAllowance, totalDeductions,
    netSalary,
    avsEr, aiEr, apgEr, acEr, lppEr, laaPEr, laacEr, ijmEr, famAllocEr,
    totalEmployer, totalCost,
    lppBase, acBase, isAboveLaaCeiling,
  };
}

// Conversion centièmes
export function centToHMM(c: number): { hours: number; minutes: number; str: string } {
  const hours = Math.floor(c);
  const minutes = Math.round((c - hours) * 60);
  return { hours, minutes, str: `${hours}h${String(minutes).padStart(2, '0')}` };
}
export function hmmToCent(h: number, m: number): number { return h + m / 60; }
export function parseTimeInput(val: string): number | null {
  if (!val?.trim()) return null;
  val = val.trim();
  if (/^\d+[.,]\d+$/.test(val)) return parseFloat(val.replace(',', '.'));
  if (/^\d+:\d{1,2}$/.test(val)) { const [h,m]=val.split(':'); return hmmToCent(+h,+m); }
  if (/^\d+$/.test(val)) return +val;
  return null;
}

// Taux horaire
export function monthlyToHourly(monthly: number, weeklyH: number, weeks=52): number {
  return monthly * 12 / weeks / weeklyH;
}
export function hourlyToMonthly(hourly: number, weeklyH: number, wpm=4.33): number {
  return hourly * weeklyH * wpm;
}

export const VACATION_RATES: Record<number,number> = { 4:8.33/100, 5:10.64/100, 6:13.04/100 };
export function vacationIndemnity(gross: number, weeks: number): number {
  return gross * (VACATION_RATES[weeks] ?? VACATION_RATES[5]);
}
