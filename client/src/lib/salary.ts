export const CH_2025 = {
  avs: 0.053, ai: 0.007, apg: 0.00225,
  ac: 0.011, ac_cap: 12350,
  ace: 0.005, ace_cap: 24700,
  laa_np: 0.013, laa_p: 0.008, laa_cap: 12350,
  laac_cap: 12350, laac_default: 0.005,
  ijm: 0.0075, fam: 0.014,
  lpp_coord: 2143.75, lpp_entry: 1837.50,
  lpp: [
    { from: 25, to: 34, r: 0.07 },
    { from: 35, to: 44, r: 0.10 },
    { from: 45, to: 54, r: 0.15 },
    { from: 55, to: 99, r: 0.18 },
  ],
};

export function getLppRate(age: number) {
  if (age < 25) return 0;
  return CH_2025.lpp.find(b => age >= b.from && age <= b.to)?.r ?? 0;
}

export function calcSalary(gross: number, age: number, opts: { hasLaac?: boolean; laacRate?: number; hasIjm?: boolean } = {}) {
  const { hasLaac = false, laacRate = 0.005, hasIjm = true } = opts;
  const r = CH_2025;

  const acBase   = Math.min(gross, r.ac_cap);
  const aceBase  = gross > r.ac_cap ? Math.min(gross, r.ace_cap) - r.ac_cap : 0;
  const lppRate  = getLppRate(age);
  const lppBase  = gross >= r.lpp_entry ? Math.max(0, gross - r.lpp_coord) : 0;
  const laacBase = hasLaac && gross > r.laac_cap ? gross - r.laac_cap : 0;
  const laaBase  = Math.min(gross, r.laa_cap);

  const avs   = gross   * r.avs;
  const ai    = gross   * r.ai;
  const apg   = gross   * r.apg;
  const ac    = acBase  * r.ac;
  const ace   = aceBase * r.ace;
  const lpp   = lppBase * (lppRate / 2);
  const laaNp = laaBase * r.laa_np;
  const laac  = laacBase * laacRate;
  const ijm   = hasIjm ? gross * r.ijm : 0;

  const totalDed = avs + ai + apg + ac + ace + lpp + laaNp + laac + ijm;
  const net = gross - totalDed;

  const avsEr = avs, aiEr = ai, apgEr = apg, acEr = ac;
  const lppEr = lpp;
  const laaPEr = laaBase * r.laa_p;
  const laacEr = laacBase * laacRate;
  const ijmEr  = hasIjm ? gross * r.ijm : 0;
  const famEr  = gross * r.fam;

  const totalEr  = avsEr + aiEr + apgEr + acEr + lppEr + laaPEr + laacEr + ijmEr + famEr;
  const totalCost = gross + totalEr;

  return {
    gross, acBase, aceBase, lppBase, laacBase, laaBase,
    avs, ai, apg, ac, ace, lpp, lppRate: lppRate/2,
    laaNp, laac, ijm, totalDed, net,
    avsEr, aiEr, apgEr, acEr, lppEr, laaPEr, laacEr, ijmEr, famEr,
    totalEr, totalCost,
  };
}

export const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('fr-CH', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

export const fmtCHF = (n: number) =>
  `CHF ${fmt(n)}`;

export function centToHMM(c: number) {
  const h = Math.floor(c);
  const m = Math.round((c - h) * 60);
  return `${h}h${String(m).padStart(2, '0')}`;
}
