/**
 * SWISSRH — Moteur juridique Licenciement & Suspension CO 336c
 * =====================================================================
 * Couvre TOUT le cycle de fin de contrat en droit suisse :
 *
 *   1. Calcul du délai de congé (CO 335c) selon ancienneté
 *   2. Calcul de la date de terme initial (fin de mois ou calendaire)
 *   3. Détection d'un arrêt maladie pendant le délai de congé
 *   4. Suspension automatique du délai (CO 336c al. 1 let. b)
 *   5. Plafond légal de suspension selon ancienneté (30 / 90 / 180 j)
 *   6. Recalcul du nouveau terme après suspension
 *   7. Gestion post-contrat : IJM → 730j → AI
 *   8. Calcul vacances dues à la sortie
 * =====================================================================
 */

// ─── Types ───────────────────────────────────────────────────────────────

export interface TerminationInput {
  hireDate:          Date;    // Date d'engagement
  dismissalDate:     Date;    // Date de remise du congé (lettre)
  endOfMonthNotice:  boolean; // Contrat prévoit fin de mois ? (CO 335c al. 1)
  sickLeaves?:       SickLeave[]; // Arrêts maladie survenus pendant le délai
}

export interface SickLeave {
  startDate: Date;
  endDate:   Date;  // Fin de l'arrêt (dernier jour d'incapacité)
}

export interface TerminationResult {
  // Ancienneté
  monthsEmployed:       number;
  yearsEmployed:        number;

  // Délai de congé légal (CO 335c)
  noticePeriodMonths:   number;   // 1, 2 ou 3 mois

  // Termes
  initialEndDate:       Date;     // Sans suspension
  effectiveEndDate:     Date;     // Après suspension(s)
  extendedByDays:       number;   // Jours ajoutés par les suspensions

  // Suspension CO 336c
  maxSuspensionDays:    number;   // Plafond légal (30 / 90 / 180)
  totalSuspendedDays:   number;   // Jours effectivement suspendus
  suspensions:          SuspensionDetail[];

  // Alertes
  alerts:               Alert[];

  // IJM & suite
  ijmMaxDays:           number;   // 730 jours depuis début incapacité
  ijmEndDate:           Date | null; // Date max de prise en charge IJM

  // Explications légales
  legalBasis:           string[];
}

export interface SuspensionDetail {
  sickLeaveStart:       Date;
  sickLeaveEnd:         Date;
  suspendedDays:        number;   // Jours comptés dans la suspension
  cappedAt:             number;   // Après plafonnement
  noticePausedFrom:     Date;
  noticeResumesAt:      Date;
}

export interface Alert {
  type:    'info' | 'warning' | 'danger';
  code:    string;
  message: string;
}

// ─── Constantes CO 335c ──────────────────────────────────────────────────

/**
 * Délais de congé légaux — CO Art. 335c al. 1
 * (pendant la période d'essai : 7 jours — non géré ici car licenciement post-essai)
 */
export const NOTICE_PERIODS = [
  { fromMonths: 0,  toMonths: 12,  noticePeriodMonths: 1 }, // 1ère année
  { fromMonths: 12, toMonths: 120, noticePeriodMonths: 2 }, // 2ème–9ème
  { fromMonths: 120, toMonths: Infinity, noticePeriodMonths: 3 }, // dès 10ème
] as const;

/**
 * Plafonds légaux de suspension — CO Art. 336c al. 1 let. b
 * (incapacité de travail due à la maladie ou à l'accident)
 */
export const SUSPENSION_CAPS = [
  { fromMonths: 0,  toMonths: 12,  maxDays: 30  }, // 1ère année de service
  { fromMonths: 12, toMonths: 60,  maxDays: 90  }, // 2ème–5ème année
  { fromMonths: 60, toMonths: Infinity, maxDays: 180 }, // dès 6ème année
] as const;

// ─── Fonctions utilitaires ────────────────────────────────────────────────

/** Nombre de mois complets entre deux dates */
function monthsDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12
    + (to.getMonth() - from.getMonth())
    + (to.getDate() >= from.getDate() ? 0 : -1);
}

/** Ajouter N mois à une date */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Dernier jour du mois d'une date */
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Ajouter N jours calendaires */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Nombre de jours calendaires entre deux dates (inclusif) */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

/** Retourne le plafond de suspension selon les mois travaillés */
function getSuspensionCap(monthsEmployed: number): number {
  for (const tier of SUSPENSION_CAPS) {
    if (monthsEmployed >= tier.fromMonths && monthsEmployed < tier.toMonths) {
      return tier.maxDays;
    }
  }
  return 180;
}

/** Retourne le délai de congé en mois selon ancienneté */
function getNoticePeriod(monthsEmployed: number): number {
  for (const tier of NOTICE_PERIODS) {
    if (monthsEmployed >= tier.fromMonths && monthsEmployed < tier.toMonths) {
      return tier.noticePeriodMonths;
    }
  }
  return 3;
}

// ─── Moteur principal CO 336c ─────────────────────────────────────────────

/**
 * Calcule la date de fin de contrat effective en tenant compte
 * des suspensions CO 336c (maladie pendant le délai de congé).
 */
export function calculateTermination(input: TerminationInput): TerminationResult {
  const { hireDate, dismissalDate, endOfMonthNotice, sickLeaves = [] } = input;

  const monthsEmployed  = monthsDiff(hireDate, dismissalDate);
  const yearsEmployed   = Math.floor(monthsEmployed / 12);
  const noticePeriodMonths = getNoticePeriod(monthsEmployed);
  const maxSuspensionDays  = getSuspensionCap(monthsEmployed);

  // ── 1. Terme initial (sans maladie) ────────────────────────────────────
  // Le délai court dès la notification (jour suivant le congé)
  const noticeStart = addDays(dismissalDate, 1);
  const rawEndDate  = addMonths(dismissalDate, noticePeriodMonths);
  const initialEndDate = endOfMonthNotice ? endOfMonth(rawEndDate) : rawEndDate;

  // ── 2. Suspensions CO 336c ─────────────────────────────────────────────
  const alerts: Alert[] = [];
  const suspensions: SuspensionDetail[] = [];
  let totalSuspendedDays = 0;
  let currentEndDate = new Date(initialEndDate);
  let remainingSuspensionBudget = maxSuspensionDays;

  // Trier les arrêts par date de début
  const sortedLeaves = [...sickLeaves].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  for (const leave of sortedLeaves) {
    // L'arrêt doit chevaucher le délai de congé
    if (leave.endDate < noticeStart || leave.startDate > currentEndDate) {
      continue; // Hors délai → pas de suspension
    }

    // Intersection avec le délai de congé
    const overlapStart = leave.startDate < noticeStart ? noticeStart : leave.startDate;
    const overlapEnd   = leave.endDate > currentEndDate ? currentEndDate : leave.endDate;
    const rawDays      = daysBetween(overlapStart, overlapEnd);

    if (rawDays <= 0) continue;

    // Plafonnement
    const cappedDays = Math.min(rawDays, remainingSuspensionBudget);
    remainingSuspensionBudget -= cappedDays;
    totalSuspendedDays += cappedDays;

    // Le délai reprend le lendemain de la fin de l'arrêt
    const resumeDate = addDays(leave.endDate, 1);

    suspensions.push({
      sickLeaveStart:   leave.startDate,
      sickLeaveEnd:     leave.endDate,
      suspendedDays:    rawDays,
      cappedAt:         cappedDays,
      noticePausedFrom: overlapStart,
      noticeResumesAt:  resumeDate,
    });

    // Repousser la date de fin
    const newEnd = addDays(currentEndDate, cappedDays);
    currentEndDate = endOfMonthNotice ? endOfMonth(newEnd) : newEnd;

    // Alertes
    if (cappedDays < rawDays) {
      alerts.push({
        type: 'warning',
        code: 'SUSPENSION_CAP_REACHED',
        message: `Plafond légal CO 336c atteint (${maxSuspensionDays} jours). `
          + `Le délai de congé reprend même si l'employé est encore malade.`,
      });
    }

    if (remainingSuspensionBudget === 0) break;
  }

  const effectiveEndDate = currentEndDate;
  const extendedByDays   = totalSuspendedDays;

  // ── 3. Calcul IJM post-contrat ─────────────────────────────────────────
  // L'IJM continue jusqu'à 730 jours depuis le DÉBUT de la 1ère incapacité
  let ijmEndDate: Date | null = null;
  if (sortedLeaves.length > 0) {
    const firstSickDay = sortedLeaves[0].startDate;
    ijmEndDate = addDays(firstSickDay, 729); // 730 jours inclusifs
  }

  // ── 4. Alertes supplémentaires ─────────────────────────────────────────
  if (extendedByDays > 0) {
    alerts.unshift({
      type: 'info',
      code: 'NOTICE_SUSPENDED',
      message: `Délai de congé suspendu ${extendedByDays} jour(s) — `
        + `Nouveau terme : ${effectiveEndDate.toLocaleDateString('fr-CH')}.`,
    });
  }

  if (ijmEndDate) {
    alerts.push({
      type: 'info',
      code: 'IJM_COVERAGE',
      message: `L'IJM (Helsana Business Salary) couvre jusqu'au `
        + `${ijmEndDate.toLocaleDateString('fr-CH')} (730 jours dès le 1er arrêt). `
        + `Dès le 31ème jour d'incapacité, 80% du salaire est versé par l'assurance.`,
    });
    alerts.push({
      type: 'info',
      code: 'AI_AFTER_IJM',
      message: `Après 730 jours, si l'incapacité persiste, une demande AI (invalidité) doit être initiée.`,
    });
  }

  // ── 5. Base légale ─────────────────────────────────────────────────────
  const legalBasis = [
    `CO Art. 335c — Délai de congé : ${noticePeriodMonths} mois (ancienneté : ${yearsEmployed} an(s))`,
    `CO Art. 336c — Suspension du délai de congé en cas de maladie`,
    `CO Art. 324a — Obligation de maintien de salaire (échelle bernoise)`,
    `LAA / LCA — IJM : 80% du salaire dès le 31ème jour, max 730 jours`,
  ];
  if (endOfMonthNotice) legalBasis.push('Terme contractuel : fin de mois');

  return {
    monthsEmployed,
    yearsEmployed,
    noticePeriodMonths,
    initialEndDate,
    effectiveEndDate,
    extendedByDays,
    maxSuspensionDays,
    totalSuspendedDays,
    suspensions,
    alerts,
    ijmMaxDays: 730,
    ijmEndDate,
    legalBasis,
  };
}

/**
 * Résumé texte pour affichage rapide (tableau de bord)
 */
export function terminationSummaryText(r: TerminationResult): string {
  const lines = [
    `📋 Ancienneté : ${r.yearsEmployed} an(s) ${r.monthsEmployed % 12} mois`,
    `⏱️  Délai de congé : ${r.noticePeriodMonths} mois`,
    `📅  Terme initial : ${r.initialEndDate.toLocaleDateString('fr-CH')}`,
  ];
  if (r.extendedByDays > 0) {
    lines.push(`⚠️  Suspension CO 336c : +${r.extendedByDays} jour(s)`);
    lines.push(`✅  Terme effectif : ${r.effectiveEndDate.toLocaleDateString('fr-CH')}`);
  } else {
    lines.push(`✅  Terme effectif : ${r.effectiveEndDate.toLocaleDateString('fr-CH')}`);
  }
  if (r.ijmEndDate) {
    lines.push(`🏥  IJM jusqu'au : ${r.ijmEndDate.toLocaleDateString('fr-CH')}`);
  }
  return lines.join('\n');
}
