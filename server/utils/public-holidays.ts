/**
 * SWISSRH — Jours fériés suisses par canton
 * =====================================================================
 * Couvre les 26 cantons + fériés fédéraux
 * Source: Chancellerie fédérale + lois cantonales 2025
 *
 * Structure : canton CH = fériés applicables partout (1er août)
 * Chaque canton liste SES fériés propres en plus
 * =====================================================================
 */

export interface PublicHoliday {
  date: string;      // YYYY-MM-DD
  name_fr: string;
  name_de: string;
  cantons: string[]; // ['CH'] = tous, ou liste cantons
  is_federal: boolean;
  is_paid: boolean;
}

function d(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// Calcul Pâques (algorithme de Meeus/Jones/Butcher)
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d2 = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d2 - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generateHolidays(year: number): PublicHoliday[] {
  const e = easter(year);
  const holidays: PublicHoliday[] = [];

  // ── FÉRIÉS FÉDÉRAUX & QUASI-UNIVERSELS ──────────────────────────────

  holidays.push(
    { date: d(year,1,1),  name_fr: "Nouvel An",             name_de: "Neujahr",
      cantons: ['CH'], is_federal: true, is_paid: true },

    { date: d(year,8,1),  name_fr: "Fête nationale",        name_de: "Bundesfeier",
      cantons: ['CH'], is_federal: true, is_paid: true },

    { date: d(year,12,25), name_fr: "Noël",                 name_de: "Weihnachten",
      cantons: ['CH'], is_federal: false, is_paid: true },

    // Vendredi Saint — non fédéral mais très répandu
    { date: fmt(addDays(e,-2)), name_fr: "Vendredi Saint",  name_de: "Karfreitag",
      cantons: ['ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','FR','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG','VD','VS','NE','GE','JU'],
      is_federal: false, is_paid: true },

    // Lundi de Pâques
    { date: fmt(addDays(e,1)),  name_fr: "Lundi de Pâques",  name_de: "Ostermontag",
      cantons: ['ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG','VD','NE','GE','JU'],
      is_federal: false, is_paid: true },

    // Ascension
    { date: fmt(addDays(e,39)), name_fr: "Ascension",        name_de: "Auffahrt",
      cantons: ['CH'], is_federal: false, is_paid: true },

    // Lundi de Pentecôte
    { date: fmt(addDays(e,50)), name_fr: "Lundi de Pentecôte", name_de: "Pfingstmontag",
      cantons: ['ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG','VD','NE','GE','JU'],
      is_federal: false, is_paid: true },
  );

  // ── FÉRIÉS PAR CANTON ────────────────────────────────────────────────

  // JU — Canton du Jura (tous les fériés)
  holidays.push(
    { date: d(year,1,2),   name_fr: "St-Berchtold",          name_de: "Berchtoldstag",     cantons:['JU','BE','VD','NE','GE','FR'], is_federal:false, is_paid:true },
    { date: d(year,3,19),  name_fr: "St-Joseph",              name_de: "Josef",             cantons:['JU'], is_federal:false, is_paid:true },
    { date: d(year,5,1),   name_fr: "Fête du travail",        name_de: "Tag der Arbeit",    cantons:['JU','SO','BS','BL','SH','TG'], is_federal:false, is_paid:true },
    { date: fmt(addDays(e,60)), name_fr: "Fête-Dieu",         name_de: "Fronleichnam",      cantons:['JU','LU','UR','SZ','OW','NW','ZG','FR','SO','AI','AG','TG','TI','VS'], is_federal:false, is_paid:true },
    { date: d(year,8,15),  name_fr: "Assomption",             name_de: "Mariä Himmelfahrt", cantons:['JU','LU','UR','SZ','OW','NW','ZG','FR','AI','AG','VS','TI'], is_federal:false, is_paid:true },
    { date: d(year,11,1),  name_fr: "Toussaint",              name_de: "Allerheiligen",     cantons:['JU','LU','UR','SZ','OW','NW','ZG','FR','SO','AI','SG','AG','TG','VS','TI'], is_federal:false, is_paid:true },
    { date: d(year,12,8),  name_fr: "Immaculée Conception",   name_de: "Mariä Empfängnis",  cantons:['JU','LU','SZ','OW','NW','ZG','FR','AI','AG','TI','VS'], is_federal:false, is_paid:true },
    { date: d(year,12,26), name_fr: "St-Étienne",             name_de: "Stephanstag",       cantons:['JU','ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG'], is_federal:false, is_paid:true },
  );

  // GE — Genève
  holidays.push(
    { date: d(year,1,2),   name_fr: "Restauration de la République", name_de: "Restauration",   cantons:['GE'], is_federal:false, is_paid:true },
    { date: d(year,9,5),   name_fr: "Jeûne genevois",         name_de: "Genfer Bettag",    cantons:['GE'], is_federal:false, is_paid:true },
    { date: d(year,12,12), name_fr: "Fête de l'Escalade",     name_de: "Escalade",         cantons:['GE'], is_federal:false, is_paid:false }, // traditionnelle mais pas légale
  );

  // VD — Vaud
  holidays.push(
    { date: d(year,1,2),   name_fr: "St-Berchtold",           name_de: "Berchtoldstag",    cantons:['VD'], is_federal:false, is_paid:true },
    { date: d(year,9,22),  name_fr: "Lundi du Jeûne fédéral", name_de: "Eidg. Bettag",     cantons:['VD'], is_federal:false, is_paid:true }, // 3e lundi de septembre
  );

  // NE — Neuchâtel
  holidays.push(
    { date: d(year,1,2),   name_fr: "St-Berchtold",           name_de: "Berchtoldstag",    cantons:['NE'], is_federal:false, is_paid:true },
    { date: d(year,3,1),   name_fr: "Instauration de la République", name_de: "Unabhängigkeitstag", cantons:['NE'], is_federal:false, is_paid:true },
  );

  // ZH — Zurich
  holidays.push(
    { date: d(year,1,2),   name_fr: "Berchtoldstag",          name_de: "Berchtoldstag",    cantons:['ZH'], is_federal:false, is_paid:true },
    { date: d(year,5,1),   name_fr: "Fête du travail",        name_de: "Tag der Arbeit",   cantons:['ZH'], is_federal:false, is_paid:true },
  );

  // BS / BL — Bâle
  holidays.push(
    { date: d(year,1,2),   name_fr: "Berchtoldstag",          name_de: "Berchtoldstag",    cantons:['BS','BL'], is_federal:false, is_paid:true },
    { date: d(year,5,1),   name_fr: "Fête du travail",        name_de: "Tag der Arbeit",   cantons:['BS','BL'], is_federal:false, is_paid:true },
    { date: d(year,12,26), name_fr: "St-Étienne",             name_de: "Stephanstag",      cantons:['BS','BL'], is_federal:false, is_paid:true },
  );

  // BE — Berne
  holidays.push(
    { date: d(year,1,2),   name_fr: "Berchtoldstag",          name_de: "Berchtoldstag",    cantons:['BE'], is_federal:false, is_paid:true },
    { date: d(year,12,26), name_fr: "St-Étienne",             name_de: "Stephanstag",      cantons:['BE'], is_federal:false, is_paid:true },
  );

  // TI — Tessin
  holidays.push(
    { date: d(year,1,6),   name_fr: "Épiphanie",              name_de: "Dreikönige",       cantons:['TI'], is_federal:false, is_paid:true },
    { date: d(year,3,19),  name_fr: "St-Joseph",              name_de: "Josef",            cantons:['TI'], is_federal:false, is_paid:true },
    { date: d(year,6,29),  name_fr: "St-Pierre et St-Paul",   name_de: "Peter und Paul",   cantons:['TI'], is_federal:false, is_paid:true },
    { date: d(year,11,2),  name_fr: "Jour des morts",         name_de: "Allerseelen",      cantons:['TI'], is_federal:false, is_paid:true },
    { date: d(year,12,8),  name_fr: "Immaculée Conception",   name_de: "Mariä Empfängnis", cantons:['TI'], is_federal:false, is_paid:true },
    { date: d(year,12,26), name_fr: "St-Étienne",             name_de: "Stephanstag",      cantons:['TI'], is_federal:false, is_paid:true },
  );

  // Déduplique par date/canton
  const seen = new Set<string>();
  return holidays.filter(h => {
    for (const c of h.cantons) {
      const key = `${c}:${h.date}`;
      if (!seen.has(key)) { seen.add(key); return true; }
    }
    return false;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// Retourne les fériés pour UN canton donné + fériés CH
export function getHolidaysForCanton(year: number, canton: string): PublicHoliday[] {
  const all = generateHolidays(year);
  return all.filter(h => h.cantons.includes('CH') || h.cantons.includes(canton));
}

// Vérifie si une date est un jour férié dans un canton
export function isPublicHoliday(date: Date, canton: string, year?: number): boolean {
  const y = year ?? date.getFullYear();
  const holidays = getHolidaysForCanton(y, canton);
  const iso = date.toISOString().slice(0, 10);
  return holidays.some(h => h.date === iso);
}

// Seed SQL — insert holidays for a year into DB
export function buildHolidayInserts(year: number): Array<{
  canton: string; holiday_date: string; name: string;
  name_fr: string; name_de: string; is_federal: boolean; is_paid: boolean; year: number;
}> {
  const all = generateHolidays(year);
  const rows = [];
  for (const h of all) {
    for (const canton of h.cantons) {
      rows.push({
        canton,
        holiday_date: h.date,
        name: h.name_fr,
        name_fr: h.name_fr,
        name_de: h.name_de,
        is_federal: h.is_federal,
        is_paid: h.is_paid,
        year,
      });
    }
  }
  return rows;
}
