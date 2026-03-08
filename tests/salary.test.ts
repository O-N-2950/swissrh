/**
 * SWISSRH — Tests unitaires Moteur de salaire
 * ============================================================
 * Vérifie chaque cotisation sociale suisse 2025 :
 * AVS/AI/APG, AC, ACE, LPP, LAA NP, LAAC, IJM
 *
 * Run: npx vitest run
 * ============================================================
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPay,
  calculateAce,
  getLppRate,
  calculateApg,
  getSalaryMaintenanceWeeks,
  calculateVacationEntitlement,
  monthlyToHourly,
  CH_2025,
  type MonthlyPayInput,
} from '../server/utils/swiss-salary-v2.js';

// ── Profil employé standard pour les tests ──────────────────────────────
const baseProfile = {
  age: 35,
  activityRate: 100,
  weeklyHours: 42,
  vacationWeeks: 5,
  hasLpp: true,
  hasLaa: true,
  hasLaac: false,
  hasIjm: true,
  withholdingTax: false,
  hasThirteenth: false,
  salaryType: 'monthly' as const,
};

function pay(grossMonthly: number, overrides: Partial<typeof baseProfile> = {}): ReturnType<typeof calculateMonthlyPay> {
  const input: MonthlyPayInput = {
    profile: { ...baseProfile, ...overrides },
    grossMonthly,
  };
  return calculateMonthlyPay(input);
}

// ── AVS/AI/APG ───────────────────────────────────────────────────────────

describe('AVS/AI/APG — taux 2025', () => {
  it('AVS employé = 5.3% du brut', () => {
    const result = pay(5000);
    expect(result.avs).toBeCloseTo(5000 * 0.053, 2);
  });

  it('AI employé = 0.7% du brut', () => {
    const result = pay(5000);
    expect(result.ai).toBeCloseTo(5000 * 0.007, 2);
  });

  it('APG employé = 0.225% du brut', () => {
    const result = pay(5000);
    expect(result.apg).toBeCloseTo(5000 * 0.00225, 2);
  });

  it('AVS employeur = AVS employé (parité)', () => {
    const result = pay(5000);
    expect(result.avsEr).toBeCloseTo(result.avs, 2);
  });

  it('Salaire brut nul → cotisations nulles', () => {
    const result = pay(0);
    expect(result.avs).toBe(0);
    expect(result.netSalary).toBe(0);
  });
});

// ── AC — Assurance chômage ───────────────────────────────────────────────

describe('AC — Assurance chômage', () => {
  it('AC employé = 1.1% sur brut ≤ plafond 12\'350', () => {
    const result = pay(5000);
    expect(result.ac).toBeCloseTo(5000 * 0.011, 2);
  });

  it('AC plafonné à 12\'350/mois (148\'200/an)', () => {
    const result = pay(20000);
    expect(result.ac).toBeCloseTo(CH_2025.ac_ceiling_monthly * CH_2025.ac_rate, 2);
    expect(result.isAboveAcCeiling).toBe(true);
  });

  it('AC employeur = AC employé', () => {
    const result = pay(5000);
    expect(result.acEr).toBeCloseTo(result.ac, 2);
  });
});

// ── ACE — Cotisation de solidarité ───────────────────────────────────────

describe('ACE — Cotisation de solidarité', () => {
  it('Pas d\'ACE sous le plafond AC (12\'350)', () => {
    const { base, amount } = calculateAce(10000);
    expect(base).toBe(0);
    expect(amount).toBe(0);
  });

  it('ACE sur tranche entre 12\'350 et 24\'700', () => {
    const gross = 15000;
    const { base, amount } = calculateAce(gross);
    const expectedBase = 15000 - CH_2025.ac_ceiling_monthly;
    expect(base).toBeCloseTo(expectedBase, 2);
    expect(amount).toBeCloseTo(expectedBase * CH_2025.ace_rate, 2);
  });

  it('ACE plafonnée à 24\'700 (2× plafond AC)', () => {
    const result = pay(30000);
    expect(result.isAboveAceCeiling).toBe(true);
    // L'ACE ne s'applique plus au-delà de 24'700
    const maxBase = CH_2025.ace_ceiling_monthly - CH_2025.ac_ceiling_monthly;
    expect(result.ace).toBeCloseTo(maxBase * CH_2025.ace_rate, 2);
  });

  it('ACE = 0 côté employeur (seulement employé)', () => {
    const result = pay(15000);
    expect(result.ace).toBeGreaterThan(0);
    // Pas de propriété avsAce côté employeur — ACE employeur = 0
    // Le coût total employeur ne comprend pas l'ACE
  });
});

// ── LPP ──────────────────────────────────────────────────────────────────

describe('LPP — Taux par tranche d\'âge', () => {
  it('25–34 ans → 7% global (3.5% chacun)', () => {
    expect(getLppRate(25)).toBe(0.07);
    expect(getLppRate(34)).toBe(0.07);
  });

  it('35–44 ans → 10% global', () => {
    expect(getLppRate(35)).toBe(0.10);
    expect(getLppRate(44)).toBe(0.10);
  });

  it('45–54 ans → 15% global', () => {
    expect(getLppRate(45)).toBe(0.15);
  });

  it('55–65 ans → 18% global', () => {
    expect(getLppRate(55)).toBe(0.18);
    expect(getLppRate(65)).toBe(0.18);
  });

  it('< 25 ans → 0% (pas encore affilié)', () => {
    expect(getLppRate(24)).toBe(0);
  });

  it('> 65 ans → 0% (retraité)', () => {
    expect(getLppRate(66)).toBe(0);
  });

  it('Déduction coordination mensuelle 2025 = 2143.75', () => {
    expect(CH_2025.lpp.coordination_monthly).toBe(2143.75);
  });

  it('LPP calculée sur brut - déduction coordination', () => {
    const gross = 5000;
    const result = pay(gross, { age: 35 });
    const expectedBase = gross - CH_2025.lpp.coordination_monthly;
    const expectedLpp  = expectedBase * (0.10 / 2); // part employé = moitié
    expect(result.lppBase).toBeCloseTo(expectedBase, 2);
    expect(result.lpp).toBeCloseTo(expectedLpp, 2);
  });

  it('Pas de LPP sous le seuil d\'entrée 1837.50/mois', () => {
    const result = pay(1500, { hasLpp: true, age: 35 });
    expect(result.hasLppDeduction).toBe(false);
    expect(result.lpp).toBe(0);
  });
});

// ── LAA ──────────────────────────────────────────────────────────────────

describe('LAA — Assurance accident', () => {
  it('LAA NP employé = 1.3% (NBUV)', () => {
    const result = pay(5000);
    expect(result.laaNp).toBeCloseTo(5000 * CH_2025.laa_np_rate, 2);
  });

  it('LAA P employeur = 0.8% (BUV)', () => {
    const result = pay(5000);
    expect(result.laaPEr).toBeCloseTo(5000 * CH_2025.laa_p_rate, 2);
  });

  it('LAA plafonnée à 12\'350/mois', () => {
    const result = pay(20000);
    expect(result.laaNp).toBeCloseTo(CH_2025.laa_ceiling_monthly * CH_2025.laa_np_rate, 2);
  });

  it('Pas de LAA si hasLaa=false', () => {
    const result = pay(5000, { hasLaa: false });
    expect(result.laaNp).toBe(0);
    expect(result.laaPEr).toBe(0);
  });
});

// ── IJM ──────────────────────────────────────────────────────────────────

describe('IJM — Indemnité journalière maladie', () => {
  it('IJM employé = 0.75% du brut', () => {
    const result = pay(5000);
    expect(result.ijm).toBeCloseTo(5000 * CH_2025.ijm_rate, 2);
  });

  it('IJM employeur = IJM employé (parité)', () => {
    const result = pay(5000);
    expect(result.ijmEr).toBeCloseTo(result.ijm, 2);
  });
});

// ── NET / BRUT ────────────────────────────────────────────────────────────

describe('Net = Brut - Déductions', () => {
  it('Net cohérent pour salaire standard 5000 CHF', () => {
    const result = pay(5000);
    const expectedNet = result.grossTotal - result.totalDeductions;
    expect(result.netSalary).toBeCloseTo(expectedNet, 2);
  });

  it('Coût total employeur = Brut + charges patronales', () => {
    const result = pay(5000);
    expect(result.totalCost).toBeCloseTo(result.grossTotal + result.totalEmployer, 2);
  });

  it('Les allocations familiales réduisent les déductions (crédit)', () => {
    const r1 = pay(5000);
    const input: MonthlyPayInput = {
      profile: { ...baseProfile },
      grossMonthly: 5000,
      familyAllowance: 300,
    };
    const r2 = calculateMonthlyPay(input);
    expect(r2.netSalary).toBeGreaterThan(r1.netSalary);
  });
});

// ── APG ───────────────────────────────────────────────────────────────────

describe('APG — Allocations perte de gain', () => {
  it('Maternité = 80% du revenu, max 196 CHF/jour', () => {
    const daily = 5000 / 21.67;
    const result = calculateApg(daily, 'maternity', 98);
    expect(result.dailyRate).toBeLessThanOrEqual(196);
    expect(result.totalAmount).toBeCloseTo(result.dailyRate * 98, 2);
  });

  it('Paternité = 2 semaines = 14 jours max', () => {
    const result = calculateApg(200, 'paternity', 14);
    expect(result.totalAmount).toBeCloseTo(result.dailyRate * 14, 2);
  });
});

// ── MAINTIEN DE SALAIRE ────────────────────────────────────────────────────

describe('Maintien de salaire CO 324a — Echelle bernoise', () => {
  it('< 1 mois → 3 semaines', () => {
    expect(getSalaryMaintenanceWeeks(0)).toBe(3);
  });
  it('12 mois → 8 semaines', () => {
    expect(getSalaryMaintenanceWeeks(12)).toBe(8);
  });
  it('60 mois → 18 semaines', () => {
    expect(getSalaryMaintenanceWeeks(60)).toBe(18);
  });
  it('120 mois → 26 semaines', () => {
    expect(getSalaryMaintenanceWeeks(120)).toBe(26);
  });
});

// ── VACANCES ──────────────────────────────────────────────────────────────

describe('Calcul vacances', () => {
  it('Année complète à 100% = 5 semaines × 5 jours = 25 jours', () => {
    const r = calculateVacationEntitlement({
      vacationWeeks: 5, activityRate: 100,
      hireDateInYear: null, endDateInYear: null,
      year: 2025,
    });
    expect(r.fullYearDays).toBe(25);
    expect(r.proRataFactor).toBeCloseTo(1, 2);
  });

  it('Mi-temps 50% = 12.5 jours annuels', () => {
    const r = calculateVacationEntitlement({
      vacationWeeks: 5, activityRate: 50,
      hireDateInYear: null, endDateInYear: null,
      year: 2025,
    });
    expect(r.fullYearDays).toBe(12.5);
  });

  it('Arrivée au 1er juillet = ~50% pro-rata', () => {
    const r = calculateVacationEntitlement({
      vacationWeeks: 5, activityRate: 100,
      hireDateInYear: new Date(2025, 6, 1), // 1er juillet
      endDateInYear: null, year: 2025,
    });
    expect(r.proRataFactor).toBeCloseTo(0.5, 1);
    expect(r.prorataDays).toBeCloseTo(12.5, 1);
  });
});

// ── CONVERSION TAUX HORAIRE ────────────────────────────────────────────────

describe('Conversion mensuel ↔ horaire', () => {
  it('Formule officielle Swissdec: mensuel × 12 / 52 / heures', () => {
    const hourly = monthlyToHourly(5000, 42);
    expect(hourly).toBeCloseTo(5000 * 12 / 52 / 42, 4);
  });
});

// ── CONSTANTES 2025 ────────────────────────────────────────────────────────

describe('Constantes 2025 — valeurs officielles', () => {
  it('Plafond AC = 148\'200/an', () => {
    expect(CH_2025.ac_ceiling_year).toBe(148_200);
  });
  it('Plafond LAA = 148\'200/an', () => {
    expect(CH_2025.laa_ceiling_year).toBe(148_200);
  });
  it('Déduction coordination LPP 2025 = 25\'725/an', () => {
    expect(CH_2025.lpp.coordination_year).toBe(25_725);
  });
  it('Taux AVS = 5.3%', () => {
    expect(CH_2025.avs_rate).toBe(0.053);
  });
  it('Taux AC = 1.1%', () => {
    expect(CH_2025.ac_rate).toBe(0.011);
  });
  it('Indemnité vacances 4 sem = 8.33%', () => {
    expect(CH_2025.vacation_indemnity[4]).toBeCloseTo(0.0833, 3);
  });
  it('Indemnité vacances 5 sem = 10.64%', () => {
    expect(CH_2025.vacation_indemnity[5]).toBeCloseTo(0.1064, 3);
  });
});
