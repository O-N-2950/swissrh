import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

/* ═══════════════════════════════════════════════
   SWISSRH — Design system WinWin V2
   #1a2332 · #3176A6 · #5BA4D9
   Outfit + JetBrains Mono
═══════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}

:root{
  --bg:#F3F5F9;--surf:#fff;--surf2:#EBF0F5;
  --t1:#1a2332;--t2:#5a6578;--tm:#94a3b8;
  --b1:rgba(0,0,0,.06);--b2:rgba(0,0,0,.10);
  --blue:#3176A6;--blued:rgba(49,118,166,.10);--blueh:#2566920;
  --green:#10b981;--greend:rgba(16,185,129,.10);
  --amber:#f59e0b;--amberd:rgba(245,158,11,.10);
  --red:#ef4444;--redd:rgba(239,68,68,.10);
  --purple:#8b5cf6;--purpled:rgba(139,92,246,.10);
  --swiss:#B32D26;
  --swiss2:#366389;
  --sb:#1a2332;--sbac:#5BA4D9;--sbm:rgba(255,255,255,.35);
  --r:12px;--rs:8px;
  --mono:'JetBrains Mono',monospace;
}

@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}

.au{animation:slideUp .45s cubic-bezier(.16,1,.3,1) both}
.stg>*{opacity:0;animation:slideUp .42s cubic-bezier(.16,1,.3,1) both}
.stg>*:nth-child(1){animation-delay:.03s}.stg>*:nth-child(2){animation-delay:.07s}
.stg>*:nth-child(3){animation-delay:.11s}.stg>*:nth-child(4){animation-delay:.15s}
.stg>*:nth-child(5){animation-delay:.19s}.stg>*:nth-child(6){animation-delay:.23s}

.card{background:var(--surf);border:1px solid var(--b2);border-radius:var(--r)}

.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--rs);
  font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:'Outfit',sans-serif;transition:all .2s}
.btn-p{background:var(--blue);color:#fff}
.btn-p:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-g{background:transparent;color:var(--t2);border:1px solid var(--b2)}
.btn-g:hover{background:var(--surf2)}
.btn-ok{background:var(--green);color:#fff;padding:5px 10px;font-size:11px}
.btn-ko{background:var(--red);color:#fff;padding:5px 10px;font-size:11px}

.inp{width:100%;background:var(--surf);border:1px solid var(--b2);border-radius:var(--rs);
  padding:9px 12px;color:var(--t1);font-family:'Outfit',sans-serif;font-size:13px;outline:none;transition:border .2s}
.inp:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--blued)}
select.inp{appearance:auto;cursor:pointer}

.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}

.badge{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  padding:2px 7px;border-radius:5px;white-space:nowrap;flex-shrink:0}

.row{border-bottom:1px solid var(--b1);transition:background .15s}
.row:hover{background:rgba(49,118,166,.04)}

.prog{height:5px;background:var(--surf2);border-radius:3px;overflow:hidden}
.prog-f{height:100%;border-radius:3px;transition:width .8s cubic-bezier(.16,1,.3,1)}

.tabs{display:flex;background:var(--surf);border:1px solid var(--b1);border-radius:9px;padding:3px;gap:2px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tab{padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;
  color:var(--tm);background:transparent;border:none;font-family:'Outfit',sans-serif;white-space:nowrap;transition:all .2s}
.tab.on{color:#fff;background:var(--blue)}

/* KPI accent bar */
.kpi{position:relative;overflow:hidden;transition:box-shadow .25s}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2.5px;
  background:var(--kc,var(--blue));opacity:0;transition:opacity .3s}
.kpi:hover::before{opacity:1}
.kpi:hover{box-shadow:0 4px 20px rgba(0,0,0,.07)}

/* Sidebar items */
.sbi{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:var(--rs);
  color:rgba(255,255,255,.5);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.sbi:hover{background:rgba(255,255,255,.06);color:#fff}
.sbi.on{background:rgba(49,118,166,.22);color:var(--sbac)}

/* Status */
.s-approved{background:rgba(16,185,129,.12);color:#059669}
.s-pending{background:rgba(245,158,11,.12);color:#d97706}
.s-rejected{background:rgba(239,68,68,.12);color:#dc2626}
.s-cancelled{background:var(--surf2);color:var(--tm)}
/* Permit */
.p-CH,.p-C{background:rgba(16,185,129,.12);color:#059669}
.p-B{background:rgba(245,158,11,.12);color:#d97706}
.p-G{background:rgba(49,118,166,.12);color:var(--blue)}
.p-L{background:rgba(139,92,246,.12);color:#7c3aed}
.p-F{background:rgba(239,68,68,.12);color:#dc2626}

/* Modal */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);
  z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
.modal{background:var(--surf);border-radius:16px;border:1px solid var(--b2);
  width:100%;max-width:520px;max-height:90vh;overflow-y:auto;animation:scaleIn .25s cubic-bezier(.16,1,.3,1)}

/* ───────────────────────────────────────
   RESPONSIVE GRID SYSTEM
   Tout passe en 1 colonne sous 640px,
   2 colonnes entre 640-900px
─────────────────────────────────────── */
.g4{display:grid;gap:12px;grid-template-columns:repeat(4,1fr)}
.g3{display:grid;gap:12px;grid-template-columns:repeat(3,1fr)}
.g2{display:grid;gap:12px;grid-template-columns:repeat(2,1fr)}
.g21{display:grid;gap:14px;grid-template-columns:2fr 1fr}
.g12{display:grid;gap:14px;grid-template-columns:1fr 2fr}
.gcalc{display:grid;gap:16px;grid-template-columns:290px 1fr;align-items:start}
.gabs{display:grid;gap:16px;grid-template-columns:1fr 260px;align-items:start}
.gtime{display:grid;gap:16px;grid-template-columns:260px 1fr;align-items:start}

@media(max-width:900px){
  .g4{grid-template-columns:repeat(2,1fr)}
  .g3{grid-template-columns:repeat(2,1fr)}
  .g21,.g12{grid-template-columns:1fr}
  .gcalc,.gabs,.gtime{grid-template-columns:1fr}
}
@media(max-width:520px){
  .g4{grid-template-columns:repeat(2,1fr)}
  .g3{grid-template-columns:1fr}
  .g2{grid-template-columns:1fr}
}
`;

/* ═══ HOOKS & HELPERS ═══════════════════════════════════ */

function useW() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

const fmt  = (n, d = 2) => new Intl.NumberFormat("fr-CH", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const fCHF = (n)        => `CHF\u00A0${fmt(n, 0)}`;

function hToHMM(h) {
  const neg = h < 0; const a = Math.abs(h);
  return `${neg ? "-" : ""}${Math.floor(a)}h${String(Math.round((a % 1) * 60)).padStart(2, "0")}`;
}

/* ═══ SALARY ENGINE ════════════════════════════════════ */

/* ═══ SWISSRH LOGO SVG ══════════════════════════════════
   Couleurs exactes extraites du logo officiel :
   Rouge  : #B32D26  |  Bleu : #366389
═══════════════════════════════════════════════════════ */

function SwissRHLogo({ height = 36, dark = false }) {
  const R = "#B32D26", B = "#366389", sub = dark ? "rgba(255,255,255,.45)" : "#8fa3b1";
  const h = height, w = h * 3.6;
  const s = h / 100; // scale factor

  return (
    <svg width={w} height={h} viewBox="0 0 360 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, display:"block" }}>
      {/* ── ÉCUSSON ── */}
      <path d="M14 8 L66 8 Q72 8 72 16 L72 58 Q72 82 40 96 Q8 82 8 58 L8 16 Q8 8 14 8 Z" fill={R}/>
      {/* Highlight */}
      <path d="M14 8 L66 8 Q72 8 72 16 L72 40 Q60 20 40 22 Q20 20 8 40 L8 16 Q8 8 14 8 Z" fill="rgba(255,255,255,.12)"/>
      {/* Croix suisse */}
      <rect x="33" y="26" width="14" height="40" rx="2.5" fill="white"/>
      <rect x="20" y="38" width="40" height="14" rx="2.5" fill="white"/>

      {/* ── SILHOUETTES (bleu, au-dessus de l'écusson) ── */}
      {/* Personne gauche */}
      <circle cx="43" cy="10" r="6" fill={B}/>
      <path d="M34 22 Q43 14 52 22 L54 44 L43 40 L32 44 Z" fill={B}/>
      {/* Personne droite (plus grande) */}
      <circle cx="58" cy="5" r="6" fill={B}/>
      <path d="M49 17 Q58 9 67 17 L69 39 L58 35 L47 39 Z" fill={B}/>

      {/* ── VAGUE BLEUE ── */}
      <path d="M6 70 Q20 58 38 66 Q52 72 66 60 Q78 50 90 56" stroke={B} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <path d="M4 80 Q20 68 40 76 Q56 84 72 70 Q84 60 94 66" stroke={B} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".5"/>

      {/* ── TEXTE SWISS ── */}
      <text x="108" y="66"
        fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="52" fill={R}
        letterSpacing="-1.5">SWISS</text>

      {/* ── TEXTE RH ── */}
      <text x="289" y="66"
        fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="52" fill={B}
        letterSpacing="-1">RH</text>

      {/* ── TEXTE .CH ── */}
      <text x="340" y="66"
        fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="52" fill={dark ? "rgba(255,255,255,.45)" : "#8fa3b1"}
        letterSpacing="-1">.CH</text>

      {/* ── SOUS-TITRE ── */}
      <text x="108" y="84"
        fontFamily="'Arial',sans-serif"
        fontWeight="400" fontSize="10.5" fill={sub}
        letterSpacing="2.2">RESSOURCES HUMAINES &amp; SOLUTIONS SUISSES</text>
    </svg>
  );
}

/* Icône seule (sidebar réduite, favicon) */
function SwissRHIcon({ size = 32 }) {
  const R = "#B32D26", B = "#366389";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, display:"block" }}>
      <path d="M10 8 L70 8 Q76 8 76 16 L76 50 Q76 70 40 78 Q4 70 4 50 L4 16 Q4 8 10 8 Z" fill={R}/>
      <path d="M10 8 L70 8 Q76 8 76 16 L76 35 Q62 18 40 20 Q18 18 4 35 L4 16 Q4 8 10 8 Z" fill="rgba(255,255,255,.13)"/>
      <rect x="32" y="22" width="16" height="38" rx="3" fill="white"/>
      <rect x="21" y="33" width="38" height="16" rx="3" fill="white"/>
      <circle cx="42" cy="8" r="6" fill={B}/>
      <path d="M33 18 Q42 11 51 18 L53 36 L42 33 L31 36 Z" fill={B}/>
      <circle cx="58" cy="3" r="5.5" fill={B}/>
      <path d="M50 13 Q58 7 66 13 L68 30 L58 27 L48 30 Z" fill={B}/>
    </svg>
  );
}

function calcSalary(gross, age, { hasLaac = false, laacRate = 0.005, hasIjm = true } = {}) {
  const AC_CAP = 12350, LAA_CAP = 12350;
  const lppR = age < 25 ? 0 : age < 35 ? .07 : age < 45 ? .10 : age < 55 ? .15 : .18;
  const lppBase  = gross >= 1837.5 ? Math.max(0, gross - 2143.75) : 0;
  const acBase   = Math.min(gross, AC_CAP);
  const aceBase  = Math.max(0, Math.min(gross, AC_CAP * 2) - AC_CAP);
  const laaBase  = Math.min(gross, LAA_CAP);
  const laacBase = hasLaac && gross > LAA_CAP ? gross - LAA_CAP : 0;

  const avs = gross * .053, ai = gross * .007, apg = gross * .00225;
  const ac  = acBase * .011, ace = aceBase * .005;
  const lpp = lppBase * (lppR / 2), laaNp = laaBase * .013;
  const laac = laacBase * laacRate, ijm = hasIjm ? gross * .0075 : 0;
  const totalDed = avs + ai + apg + ac + ace + lpp + laaNp + laac + ijm;

  const avsEr = avs, aiEr = ai, apgEr = apg, acEr = ac, lppEr = lpp;
  const laaPEr = laaBase * .008, laacEr = laacBase * laacRate;
  const ijmEr  = hasIjm ? gross * .0075 : 0, famEr = gross * .014;
  const totalEr = avsEr + aiEr + apgEr + acEr + lppEr + laaPEr + laacEr + ijmEr + famEr;

  return { gross, lppBase, acBase, aceBase, laaBase, laacBase,
    avs, ai, apg, ac, ace, lpp, lppR: lppR / 2, laaNp, laac, ijm,
    totalDed, net: gross - totalDed,
    avsEr, aiEr, apgEr, acEr, lppEr, laaPEr, laacEr, ijmEr, famEr,
    totalEr, totalCost: gross + totalEr };
}

/* ═══ MINI COMPONENTS ══════════════════════════════════ */

const StatusBadge = ({ s }) => {
  const m = { approved: ["Approuvé","s-approved"], pending: ["En attente","s-pending"],
               rejected: ["Refusé","s-rejected"], cancelled: ["Annulé","s-cancelled"] };
  const [l, c] = m[s] || [s, "s-cancelled"];
  return <span className={`badge ${c}`}>{l}</span>;
};

const ProgBar = ({ val, max, color = "var(--blue)", h = 5 }) => (
  <div className="prog" style={{ height: h }}>
    <div className="prog-f" style={{ width: `${max > 0 ? Math.min(100, val / max * 100) : 0}%`, background: color }} />
  </div>
);

const Toggle = ({ val, set, label, hint }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"10px 12px", background:"var(--surf2)", borderRadius:8 }}>
    <div>
      <div style={{ fontSize:12, fontWeight:600 }}>{label}</div>
      {hint && <div style={{ fontSize:10, color:"var(--tm)", marginTop:1 }}>{hint}</div>}
    </div>
    <div onClick={() => set(!val)} style={{ cursor:"pointer", flexShrink:0,
      width:38, height:21, borderRadius:11,
      background: val ? "var(--blue)" : "var(--b2)", position:"relative", transition:"background .2s" }}>
      <div style={{ position:"absolute", top:2.5, left: val ? 18 : 2.5, width:16, height:16,
        background:"#fff", borderRadius:"50%", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
  </div>
);

function Spinner({ size = 18 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0,
    border:"2px solid var(--b2)", borderTop:"2px solid var(--blue)", animation:"spin .7s linear infinite" }} />;
}

function SH({ children, extra }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
      <div style={{ fontWeight:700, fontSize:13 }}>{children}</div>
      {extra}
    </div>
  );
}

/* ═══ TOPBAR ════════════════════════════════════════════ */

function Topbar({ title, sub, actions, onMenu }) {
  const w = useW();
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding: w < 600 ? "12px 14px" : "14px 26px",
      borderBottom:"1px solid var(--b1)", background:"var(--surf)",
      position:"sticky", top:0, zIndex:10, gap:10, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {onMenu && (
          <button onClick={onMenu} className="btn btn-g" style={{ padding:"6px 10px", flexShrink:0 }}>☰</button>
        )}
        <div>
          <div style={{ fontWeight:800, fontSize: w < 480 ? 14 : 16, letterSpacing:"-.02em", lineHeight:1.2 }}>{title}</div>
          {sub && <div style={{ fontSize:10, color:"var(--tm)", marginTop:2 }}>{sub}</div>}
        </div>
      </div>
      {actions && (
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>{actions}</div>
      )}
    </div>
  );
}

/* ═══ KPI CARD ══════════════════════════════════════════ */

function useCountUp(target, ms = 650) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    let cur = 0; const step = target / (ms / 16);
    const t = setInterval(() => {
      cur = Math.min(cur + step, target); setV(Math.round(cur));
      if (cur >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

function KpiCard({ label, value, sub, color = "var(--blue)", icon, trend, delay = 0, isNum = false }) {
  const [vis, setVis] = useState(false);
  const w = useW();
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const anim = useCountUp(vis && typeof value === "number" ? value : 0);

  // Responsive font size for the big number
  const numSz = w < 420 ? 19 : w < 640 ? 22 : 26;

  const display = typeof value === "string" ? value
    : isNum   ? anim.toLocaleString("fr-CH")
    : fCHF(anim);

  return (
    <div className="card kpi" style={{ padding: w < 480 ? "14px 13px" : "18px 16px",
      "--kc": color, opacity: vis ? 1 : 0,
      animation: vis ? `slideUp .5s cubic-bezier(.16,1,.3,1) ${delay}ms both` : "none" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:6 }}>
        <div style={{ fontSize: w < 480 ? 9 : 10, fontWeight:700, letterSpacing:".05em",
          textTransform:"uppercase", color:"var(--tm)", lineHeight:1.3, flex:1 }}>
          {label}
        </div>
        <div style={{ width:30, height:30, borderRadius:7, background:`${color}1a`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color, flexShrink:0 }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="mono" style={{ fontSize:numSz, fontWeight:900,
        letterSpacing:"-.03em", lineHeight:1, color:"var(--t1)", wordBreak:"break-all" }}>
        {display}
      </div>

      {/* Trend + sub */}
      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
        {trend !== undefined && (
          <span style={{ fontSize:10, fontWeight:800,
            color: trend >= 0 ? "var(--green)" : "var(--red)" }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ fontSize:10, color:"var(--tm)", lineHeight:1.3 }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ═══ SIDEBAR ═══════════════════════════════════════════ */

const NAV = [
  { id:"dashboard", em:"⊞",  lb:"Dashboard"     },
  { id:"employees", em:"👥", lb:"Collaborateurs" },
  { id:"salary",    em:"🧮", lb:"Calculateur"    },
  { id:"payroll",   em:"💳", lb:"Paie"           },
  { id:"absences",  em:"🗓", lb:"Absences"       },
  { id:"vacations", em:"🏖", lb:"Vacances"       },
  { id:"time",      em:"⏱", lb:"Pointage"       },
  { id:"reports",   em:"📊", lb:"Rapports"       },
  { id:"documents", em:"📄", lb:"Documents"      },
  { id:"settings",  em:"⚙", lb:"Paramètres"     },
];

function Sidebar({ page, setPage, open, setOpen }) {
  const w = useW();
  const [col, setCol] = useState(false);
  const isMobile = w < 768;

  if (isMobile) {
    const TOP = NAV.slice(0, 5);
    return (
      <>
        {/* Drawer */}
        {open && (
          <div className="overlay" style={{ alignItems:"flex-start", justifyContent:"flex-start" }}
            onClick={() => setOpen(false)}>
            <div style={{ width:240, height:"100%", background:"var(--sb)", padding:"18px 9px", overflowY:"auto" }}
              onClick={e => e.stopPropagation()} className="au">
              {/* Logo */}
              <div style={{ padding:"4px 6px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", marginBottom:10 }}>
                <SwissRHLogo height={28} dark/>
              </div>
              {NAV.map(n => (
                <div key={n.id} className={`sbi${page === n.id ? " on" : ""}`}
                  onClick={() => { setPage(n.id); setOpen(false); }}>
                  <span style={{ fontSize:15 }}>{n.em}</span>
                  <span>{n.lb}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Bottom tab bar */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, height:58,
          background:"var(--sb)", borderTop:"1px solid rgba(255,255,255,.08)",
          display:"flex", paddingBottom:"env(safe-area-inset-bottom)" }}>
          {TOP.map(n => (
            <div key={n.id} onClick={() => setPage(n.id)} style={{ flex:1,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:2, cursor:"pointer", padding:"4px 2px",
              color: page === n.id ? "var(--sbac)" : "rgba(255,255,255,.35)", transition:"color .15s" }}>
              <span style={{ fontSize:19 }}>{n.em}</span>
              <span style={{ fontSize:8, fontWeight:700, letterSpacing:".01em" }}>{n.lb.slice(0,8)}</span>
            </div>
          ))}
          <div onClick={() => setOpen(true)} style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:2, cursor:"pointer",
            color:"rgba(255,255,255,.35)" }}>
            <span style={{ fontSize:19 }}>☰</span>
            <span style={{ fontSize:8, fontWeight:700 }}>Plus</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ width: col ? 54 : 210, background:"var(--sb)", height:"100vh",
      display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden",
      transition:"width .25s cubic-bezier(.16,1,.3,1)" }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", justifyContent: col ? "center" : undefined,
        padding: col ? "14px 0" : "12px 13px 12px",
        borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0, minHeight:60 }}>
        {col
          ? <SwissRHIcon size={30}/>
          : <SwissRHLogo height={32} dark/>
        }
      </div>
      {/* Nav */}
      <div style={{ flex:1, padding:"8px 7px", overflowY:"auto" }}>
        {NAV.map(n => (
          <div key={n.id} className={`sbi${page === n.id ? " on" : ""}`}
            onClick={() => setPage(n.id)} title={col ? n.lb : undefined}
            style={{ justifyContent: col ? "center" : undefined, padding: col ? "9px 0" : "8px 11px", gap: col ? 0 : 9 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{n.em}</span>
            {!col && <span style={{ fontSize:12.5 }}>{n.lb}</span>}
          </div>
        ))}
      </div>
      {/* Bottom */}
      <div style={{ padding:"8px 7px", borderTop:"1px solid rgba(255,255,255,.06)" }}>
        <div className="sbi" onClick={() => setCol(!col)}
          style={{ justifyContent: col ? "center" : undefined, padding: col ? "8px 0" : undefined, gap: col ? 0 : 9 }}>
          <span style={{ fontSize:13 }}>{col ? "→" : "←"}</span>
          {!col && <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>Réduire</span>}
        </div>
        <div className="sbi" style={{ justifyContent: col ? "center" : undefined, padding: col ? "8px 0" : undefined, gap: col ? 0 : 9 }}>
          <div style={{ width:26, height:26, borderRadius:"50%", background:"var(--sbac)", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"var(--sb)" }}>AD</div>
          {!col && <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>Admin</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.35)" }}>Déconnexion</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

/* ═══ DATA ══════════════════════════════════════════════ */

const EMPLOYEES = [
  { id:1, name:"Dupont Marc",    dept:"Production", ct:"CDI",    pm:"CH", sal:5800, rt:100, age:38, hire:"2019-03-01" },
  { id:2, name:"Müller Sophie",  dept:"Admin",      ct:"CDI",    pm:"B",  sal:4200, rt:80,  age:29, hire:"2021-06-15", exp:"2025-09-30" },
  { id:3, name:"García Carlos",  dept:"Logistique", ct:"CDD",    pm:"G",  sal:3900, rt:100, age:34, hire:"2024-01-01", exp:"2025-06-30" },
  { id:4, name:"Schneider Anna", dept:"RH",         ct:"CDI",    pm:"C",  sal:7200, rt:100, age:45, hire:"2015-11-01" },
  { id:5, name:"Rossi Pietro",   dept:"IT",         ct:"CDI",    pm:"B",  sal:8500, rt:100, age:41, hire:"2022-02-28", exp:"2026-02-28" },
  { id:6, name:"Favre Lucie",    dept:"Production", ct:"Horaire",pm:"CH", sal:28.5, rt:100, age:24, hire:"2023-08-01" },
  { id:7, name:"Weber Thomas",   dept:"Admin",      ct:"CDI",    pm:"CH", sal:6100, rt:60,  age:52, hire:"2010-04-01" },
  { id:8, name:"Nguyen Linh",    dept:"IT",         ct:"CDI",    pm:"L",  sal:9200, rt:100, age:31, hire:"2023-11-15", exp:"2025-11-15" },
];

const PAYROLL_DATA = ["Jan","Fév","Mar","Avr","Mai","Jun"].map((m, i) => ({
  m, brut: 38200 + Math.round(Math.sin(i * .9) * 800),
  net:     29300 + Math.round(Math.sin(i * .9) * 600),
}));

const PIE_DATA = [
  { name:"AVS/AI/APG", v:3200, c:"#3176A6" },
  { name:"LPP",        v:1800, c:"#8b5cf6" },
  { name:"AC/ACE",     v:430,  c:"#10b981" },
  { name:"LAA",        v:490,  c:"#f59e0b" },
  { name:"IJM",        v:290,  c:"#ef4444" },
];

const ABSENCES = [
  { id:1, emp:"Dupont Marc",    type:"Vacances",   start:"03 mars", end:"07 mars", days:5,  status:"approved" },
  { id:2, emp:"Müller Sophie",  type:"Maladie",    start:"10 fév",  end:"12 fév",  days:3,  status:"approved", cert:true },
  { id:3, emp:"García Carlos",  type:"Vacances",   start:"24 mars", end:"28 mars", days:5,  status:"pending" },
  { id:4, emp:"Schneider Anna", type:"Famille",    start:"20 fév",  end:"20 fév",  days:1,  status:"approved" },
  { id:5, emp:"Rossi Pietro",   type:"Accident NP",start:"15 jan",  end:"29 jan",  days:11, status:"approved", cert:true },
  { id:6, emp:"Favre Lucie",    type:"Vacances",   start:"14 avr",  end:"18 avr",  days:5,  status:"pending" },
];

const VAC = [
  { n:"Dupont Marc",    ent:25, taken:8,  bal:17 },
  { n:"Müller Sophie",  ent:20, taken:5,  bal:15 },
  { n:"García Carlos",  ent:25, taken:12, bal:13 },
  { n:"Schneider Anna", ent:30, taken:15, bal:15 },
  { n:"Rossi Pietro",   ent:25, taken:3,  bal:22 },
  { n:"Favre Lucie",    ent:25, taken:6,  bal:19 },
  { n:"Weber Thomas",   ent:25, taken:10, bal:15 },
  { n:"Nguyen Linh",    ent:25, taken:2,  bal:23 },
];

const TIME_W = [
  { d:"Lun 03", arr:"08:00", dep:"17:00", worked:8.25, ot:.25 },
  { d:"Mar 04", arr:"08:15", dep:"18:00", worked:9.00, ot:1.0 },
  { d:"Mer 05", arr:"07:45", dep:"17:00", worked:8.50, ot:.50 },
  { d:"Jeu 06", arr:"08:00", dep:"17:30", worked:8.83, ot:.83 },
  { d:"Ven 07", arr:"08:00", dep:"17:00", worked:8.25, ot:.25 },
];

/* ═══ PAGE: DASHBOARD ═══════════════════════════════════ */

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--surf)", border:"1px solid var(--b2)", borderRadius:8,
      padding:"8px 12px", fontFamily:"var(--mono)", fontSize:11 }}>
      <div style={{ fontWeight:700, marginBottom:4, fontFamily:"Outfit,sans-serif" }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.color }}>
          {p.name === "brut" ? "Brut" : "Net"}: CHF {fmt(p.value, 0)}
        </div>
      ))}
    </div>
  );
};

function Dashboard() {
  const w = useW();
  const p = w < 600 ? "14px 12px" : "20px 26px";
  const [hp, setHp] = useState(null);

  return (
    <div style={{ flex:1, overflowY:"auto", paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Dashboard RH" sub="Mars 2025 · 8 collaborateurs · JU"
        actions={<>
          <button className="btn btn-g" style={{ fontSize:11 }}>📤 Export</button>
          <button className="btn btn-p" style={{ fontSize:11 }}>▶ Lancer la paie</button>
        </>}
      />
      <div style={{ padding:p, display:"flex", flexDirection:"column", gap:14 }}>

        {/* ── KPIs ── */}
        <div className="g4 stg">
          <KpiCard label="Masse salariale brute" value={38200} sub="mars 2025"   color="var(--blue)"   icon="💰" trend={2.1} delay={0}/>
          <KpiCard label="Net total versé"        value={29300} sub="ce mois"    color="var(--green)"  icon="✅" trend={1.8} delay={60}/>
          <KpiCard label="Charges patronales"     value={8800}  sub="≈ 23% brut" color="var(--amber)"  icon="🏛" delay={120}/>
          <KpiCard label="Collaborateurs"         value={8}     sub="1 alerte permis" isNum color="var(--purple)" icon="👥" delay={180}/>
        </div>

        {/* ── Charts ── */}
        <div className="g21">
          <div className="card au" style={{ padding: w < 480 ? 14 : 18 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>📈 Masse salariale 2025</div>
            <div style={{ fontSize:10, color:"var(--tm)", marginBottom:12 }}>Brut vs Net — CHF/mois</div>
            <ResponsiveContainer width="100%" height={w < 480 ? 150 : 190}>
              <AreaChart data={PAYROLL_DATA} margin={{ left:-22, right:4 }}>
                <defs>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3176A6" stopOpacity=".18"/>
                    <stop offset="100%" stopColor="#3176A6" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity=".15"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fontSize:11, fill:"var(--tm)" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:"var(--tm)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="brut" stroke="#3176A6" strokeWidth={2} fill="url(#gB)"/>
                <Area type="monotone" dataKey="net"  stroke="#10b981" strokeWidth={2} fill="url(#gN)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card au" style={{ padding: w < 480 ? 14 : 18, animationDelay:".06s" }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>🧮 Déductions employé</div>
            <div style={{ fontSize:10, color:"var(--tm)", marginBottom:8 }}>Mars 2025</div>
            <ResponsiveContainer width="100%" height={w < 480 ? 110 : 130}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%"
                  innerRadius={w < 480 ? 28 : 34} outerRadius={w < 480 ? 46 : 56}
                  dataKey="v" paddingAngle={2}
                  onMouseEnter={(_,i) => setHp(i)} onMouseLeave={() => setHp(null)}>
                  {PIE_DATA.map((e, i) => (
                    <Cell key={i} fill={e.c} opacity={hp === null || hp === i ? 1 : .4}
                      strokeWidth={hp === i ? 2 : 0} stroke="var(--surf)"/>
                  ))}
                </Pie>
                <Tooltip formatter={v => [`CHF ${fmt(v, 0)}`]}
                  contentStyle={{ background:"var(--surf)", border:"1px solid var(--b2)", borderRadius:8, fontFamily:"var(--mono)", fontSize:11 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:4 }}>
              {PIE_DATA.map((d, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:d.c, flexShrink:0 }}/>
                    <span style={{ color:"var(--t2)" }}>{d.name}</span>
                  </div>
                  <span className="mono" style={{ fontWeight:700, fontSize:11 }}>CHF {fmt(d.v, 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="g3">
          {/* Alertes */}
          <div className="card au" style={{ padding: w < 480 ? 14 : 18, animationDelay:".10s" }}>
            <SH>🔔 Alertes <span className="badge s-rejected" style={{ marginLeft:5 }}>4</span></SH>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { i:"🪪", m:"Müller Sophie — Permis B expire dans 28j", c:"var(--amber)" },
                { i:"📋", m:"García Carlos — Congés en attente (5j)",   c:"var(--blue)" },
                { i:"🏥", m:"Rossi Pietro — Certificat manquant",        c:"var(--red)" },
                { i:"🏖", m:"Favre Lucie — Solde vacances > 20j",        c:"var(--amber)" },
              ].map((a, i) => (
                <div key={i} style={{ display:"flex", gap:8, padding:"8px 10px",
                  background:`${a.c}0d`, borderRadius:7, border:`1px solid ${a.c}22` }}>
                  <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>{a.i}</span>
                  <span style={{ fontSize:11, color:"var(--t2)", lineHeight:1.4 }}>{a.m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Absences récentes */}
          <div className="card au" style={{ padding: w < 480 ? 14 : 18, animationDelay:".15s" }}>
            <SH>🗓 Absences récentes</SH>
            {ABSENCES.slice(0, 4).map((a, i) => (
              <div key={i} className="row" style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"8px 4px", gap:8 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {a.emp.split(" ")[0]}
                  </div>
                  <div style={{ fontSize:10, color:"var(--tm)" }}>{a.type} · {a.days}j</div>
                </div>
                <StatusBadge s={a.status}/>
              </div>
            ))}
          </div>

          {/* Soldes */}
          <div className="card au" style={{ padding: w < 480 ? 14 : 18, animationDelay:".20s" }}>
            <SH>🏖 Soldes vacances</SH>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {VAC.slice(0, 5).map((v, i) => (
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                    <span style={{ fontWeight:600 }}>{v.n.split(" ")[0]}</span>
                    <span className="mono" style={{ color: v.bal < 5 ? "var(--red)" : "var(--blue)", fontWeight:700 }}>
                      {v.bal}j
                    </span>
                  </div>
                  <ProgBar val={v.taken} max={v.ent}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ PAGE: EMPLOYEES ═══════════════════════════════════ */

function Employees() {
  const w = useW();
  const [q, setQ]   = useState("");
  const [sel, setSel] = useState(null);
  const list = EMPLOYEES.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  const p = w < 600 ? "14px 12px" : "18px 26px";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Topbar title="Collaborateurs" sub={`${list.length} / ${EMPLOYEES.length} affiché(s)`}
        actions={<button className="btn btn-p" style={{ fontSize:11 }}>+ Nouveau</button>}/>
      <div style={{ flex:1, overflowY:"auto", padding:p, paddingBottom: w < 768 ? 80 : undefined }}>

        <div style={{ position:"relative", marginBottom:12 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--tm)" }}>🔍</span>
          <input className="inp" placeholder="Rechercher un collaborateur…" value={q}
            onChange={e => setQ(e.target.value)} style={{ paddingLeft:34 }}/>
        </div>

        {/* Mobile: cards */}
        {w < 700 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }} className="stg">
            {list.map(emp => (
              <div key={emp.id} className="card" style={{ padding:14, cursor:"pointer" }}
                onClick={() => setSel(sel?.id === emp.id ? null : emp)}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--blued)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:13, fontWeight:900, color:"var(--blue)", flexShrink:0 }}>
                    {emp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{emp.name}</div>
                    <div style={{ fontSize:11, color:"var(--tm)" }}>{emp.dept} · {emp.ct}</div>
                  </div>
                  <span className={`badge p-${emp.pm}`}>{emp.pm}</span>
                </div>
                <div className="g2" style={{ gap:8 }}>
                  <div style={{ background:"var(--surf2)", borderRadius:7, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--tm)", letterSpacing:".04em" }}>Salaire</div>
                    <div className="mono" style={{ fontSize: w < 380 ? 15 : 17, fontWeight:900, color:"var(--blue)", marginTop:3 }}>
                      {emp.ct === "Horaire" ? `${emp.sal}/h` : fmt(emp.sal, 0)}
                      <span style={{ fontSize:10, color:"var(--tm)", fontWeight:400 }}> CHF</span>
                    </div>
                  </div>
                  <div style={{ background:"var(--surf2)", borderRadius:7, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--tm)", letterSpacing:".04em" }}>Activité</div>
                    <div style={{ marginTop:6, marginBottom:3 }}><ProgBar val={emp.rt} max={100}/></div>
                    <div className="mono" style={{ fontSize:14, fontWeight:800, color:"var(--blue)" }}>{emp.rt}%</div>
                  </div>
                </div>
                {emp.exp && (
                  <div style={{ marginTop:8, padding:"6px 10px", background:"var(--amberd)",
                    borderRadius:6, fontSize:10, color:"var(--amber)", fontWeight:700 }}>
                    ⚠ Permis expire le {emp.exp}
                  </div>
                )}
                {sel?.id === emp.id && (
                  <div className="g2" style={{ marginTop:12, paddingTop:12, borderTop:"1px solid var(--b1)", gap:8 }}>
                    {[["Âge", `${emp.age} ans`], ["Embauché", emp.hire],
                      ["Statut", "Actif"], ["Département", emp.dept]].map(([k, v]) => (
                      <div key={k} style={{ background:"var(--blued)", padding:"8px 10px", borderRadius:7 }}>
                        <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--tm)", letterSpacing:".04em" }}>{k}</div>
                        <div style={{ fontSize:12, fontWeight:700, marginTop:3 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: table */
          <div className="card">
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 80px 120px 100px",
              gap:10, padding:"9px 16px", background:"var(--surf2)",
              borderBottom:"1px solid var(--b1)", borderRadius:"var(--r) var(--r) 0 0" }}>
              {["Collaborateur", "Département", "Contrat", "Permis", "Salaire CHF", "Activité"].map(h => (
                <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"var(--tm)" }}>{h}</div>
              ))}
            </div>
            {list.map((emp, i) => (
              <div key={emp.id} className="row" style={{ display:"grid",
                gridTemplateColumns:"2fr 1fr 1fr 80px 120px 100px",
                gap:10, padding:"12px 16px", alignItems:"center", cursor:"pointer",
                animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i * 30}ms both` }}
                onClick={() => setSel(sel?.id === emp.id ? null : emp)}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--blued)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:11, fontWeight:900, color:"var(--blue)", flexShrink:0 }}>
                    {emp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{emp.name}</div>
                    {emp.exp && <div style={{ fontSize:9, color:"var(--amber)" }}>⚠ {emp.exp}</div>}
                  </div>
                </div>
                <div style={{ fontSize:12, color:"var(--t2)" }}>{emp.dept}</div>
                <span className="badge" style={{ background:"var(--blued)", color:"var(--blue)" }}>{emp.ct}</span>
                <span className={`badge p-${emp.pm}`}>{emp.pm}</span>
                <div className="mono" style={{ fontSize:13, fontWeight:800 }}>
                  {emp.ct === "Horaire" ? `${emp.sal}/h` : fmt(emp.sal, 0)}
                </div>
                <div>
                  <ProgBar val={emp.rt} max={100}/>
                  <div style={{ fontSize:10, color:"var(--tm)", marginTop:2 }}>{emp.rt}%</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sel && w >= 700 && (
          <div className="card" style={{ marginTop:12, padding:18,
            animation:"scaleIn .25s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontWeight:800, fontSize:14 }}>{sel.name}</div>
              <button onClick={() => setSel(null)} style={{ background:"none", border:"none",
                cursor:"pointer", fontSize:18, color:"var(--tm)", lineHeight:1 }}>×</button>
            </div>
            <div className="g4" style={{ gap:10 }}>
              {[["Département", sel.dept], ["Contrat", sel.ct], ["Permis", sel.pm],
                ["Taux activité", `${sel.rt}%`], ["Âge", `${sel.age} ans`], ["Embauché", sel.hire],
                ["Salaire", sel.ct === "Horaire" ? `${sel.sal} CHF/h` : `${fmt(sel.sal, 0)} CHF/m`],
                ["Statut", "Actif"]
              ].map(([k, v]) => (
                <div key={k} style={{ padding:"10px 12px", background:"var(--surf2)", borderRadius:8 }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".04em", color:"var(--tm)", marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ PAGE: SALARY CALC ══════════════════════════════════ */

function SalaryCalc() {
  const w = useW();
  const [gross,   setGross]   = useState(6500);
  const [age,     setAge]     = useState(38);
  const [rate,    setRate]    = useState(100);
  const [hasLaac, setHasLaac] = useState(false);
  const [hasIjm,  setHasIjm]  = useState(true);

  const r = calcSalary(gross * rate / 100, age, { hasLaac, hasIjm });
  const lppLbl = age < 25 ? "—" : age < 35 ? "7%" : age < 45 ? "10%" : age < 55 ? "15%" : "18%";
  const p = w < 600 ? "14px 12px" : "18px 26px";

  const rows = [
    { l:"AVS (5.3%)",   e:r.avs,   er:r.avsEr },
    { l:"AI (0.7%)",    e:r.ai,    er:r.aiEr },
    { l:"APG (0.225%)", e:r.apg,   er:r.apgEr },
    { l:"AC (1.1%)",    e:r.ac,    er:r.acEr },
    r.ace  > 0 && { l:"ACE solidarité", e:r.ace,  er:0 },
    r.lpp  > 0 && { l:`LPP (${lppLbl})`, e:r.lpp, er:r.lppEr },
    { l:"LAA NP (1.3%)", e:r.laaNp, er:0 },
    { l:"LAA P (0.8%)",  e:0,       er:r.laaPEr },
    hasLaac && r.laacBase > 0 && { l:"LAAC complémentaire", e:r.laac, er:r.laacEr },
    hasIjm && { l:"IJM (0.75%)", e:r.ijm, er:r.ijmEr },
    { l:"Alloc. familiales", e:0, er:r.famEr },
  ].filter(Boolean);

  return (
    <div style={{ flex:1, overflowY:"auto", paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Calculateur de salaire" sub="Taux 2025 · Swissdec 5.0"/>
      <div style={{ padding:p, display:"flex", flexDirection:"column", gap:14 }}>
        <div className="gcalc">

          {/* ── Left inputs ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="card" style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ fontWeight:800, fontSize:13 }}>⚙️ Paramètres</div>

              <div>
                <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                  color:"var(--tm)", display:"block", marginBottom:6 }}>Salaire mensuel brut (CHF)</label>
                <input className="inp mono" type="number" value={gross} onChange={e => setGross(+e.target.value)}
                  style={{ fontSize: w < 480 ? 19 : 23, fontWeight:900, letterSpacing:"-.02em" }}/>
              </div>

              <div>
                <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                  color:"var(--tm)", display:"block", marginBottom:6 }}>
                  Âge — <span style={{ color:"var(--blue)" }}>LPP: {lppLbl}</span>
                </label>
                <input className="inp" type="number" value={age} onChange={e => setAge(+e.target.value)} min={16} max={70}/>
              </div>

              <div>
                <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                  color:"var(--tm)", display:"block", marginBottom:6 }}>
                  Taux d'activité — <span className="mono" style={{ color:"var(--blue)", fontWeight:800 }}>{rate}%</span>
                </label>
                <input type="range" min={10} max={100} step={10} value={rate}
                  onChange={e => setRate(+e.target.value)}
                  style={{ width:"100%", accentColor:"var(--blue)", cursor:"pointer", marginBottom:4 }}/>
                <ProgBar val={rate} max={100}/>
              </div>

              <Toggle label="IJM — Indemnité journalière" hint="0.75% emp. + 0.75% er." val={hasIjm} set={setHasIjm}/>
              <Toggle label="LAAC — Assurance complémentaire" hint="Sur salaire > 12'350 CHF/m" val={hasLaac} set={setHasLaac}/>
            </div>

            {/* Summary */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:14 }}>📋 Résumé</div>
              {[
                { l:"Salaire brut",        v:r.gross,     c:"var(--t1)",   big:false },
                { l:"Déductions employé",  v:-r.totalDed, c:"var(--red)",  big:false },
                { l:"Net à verser",        v:r.net,       c:"var(--green)",big:true  },
                { l:"Charges patronales",  v:r.totalEr,   c:"var(--amber)",big:false },
                { l:"Coût total employeur",v:r.totalCost, c:"var(--t2)",   big:false },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:`${row.big ? 12 : 8}px 0`,
                  borderTop: i > 0 ? "1px solid var(--b1)" : undefined,
                  borderBottom: row.big ? "2px solid var(--b2)" : undefined }}>
                  <span style={{ fontSize: row.big ? 13 : 12, fontWeight: row.big ? 700 : 500, color:"var(--t2)" }}>{row.l}</span>
                  <span className="mono" style={{ fontSize: row.big ? (w < 480 ? 16 : 20) : 13,
                    fontWeight: row.big ? 900 : 700, color:row.c }}>
                    {row.v < 0 ? "–" : ""} {fmt(Math.abs(row.v))} CHF
                  </span>
                </div>
              ))}
              <div className="g2" style={{ gap:8, marginTop:12 }}>
                {[
                  { l:"Taux déductions", v:`${(r.totalDed / r.gross * 100).toFixed(1)}%`, c:"var(--red)" },
                  { l:"Coût / net",      v:`${(r.totalCost / r.net).toFixed(2)}×`,        c:"var(--blue)" },
                ].map((m, i) => (
                  <div key={i} style={{ padding:"10px 11px", background:`${m.c}0d`, borderRadius:8, border:`1px solid ${m.c}22` }}>
                    <div style={{ fontSize:9, color:"var(--tm)", marginBottom:3 }}>{m.l}</div>
                    <div className="mono" style={{ fontSize: w < 480 ? 15 : 18, fontWeight:900, color:m.c }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: full breakdown ── */}
          <div className="card au">
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--b1)" }}>
              <div style={{ fontWeight:800, fontSize:13 }}>Décompte complet — charges sociales 2025</div>
              <div style={{ fontSize:10, color:"var(--tm)", marginTop:2 }}>AVS/AI/APG · AC · ACE · LPP · LAA NP/P · LAAC · IJM</div>
            </div>
            {/* cols: 3 on desktop, 2 on mobile */}
            <div style={{ display:"grid",
              gridTemplateColumns: w < 540 ? "1fr 90px" : "2.4fr 100px 100px",
              gap:8, padding:"8px 16px", background:"var(--surf2)", borderBottom:"1px solid var(--b1)",
              fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"var(--tm)" }}>
              {(w < 540 ? ["Cotisation","Employé"] : ["Cotisation","Employé","Employeur"]).map(h => <div key={h}>{h}</div>)}
            </div>
            {rows.map((row, i) => (
              <div key={i} className="row" style={{ display:"grid",
                gridTemplateColumns: w < 540 ? "1fr 90px" : "2.4fr 100px 100px",
                gap:8, padding:"10px 16px", alignItems:"center",
                animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i * 20}ms both` }}>
                <div style={{ fontSize: w < 480 ? 11 : 12, color:"var(--t2)" }}>{row.l}</div>
                <div className="mono" style={{ fontSize: w < 480 ? 12 : 13, fontWeight:800,
                  color: row.e > 0 ? "var(--red)" : "var(--tm)" }}>
                  {row.e > 0 ? `–${fmt(row.e)}` : "—"}
                </div>
                {w >= 540 && (
                  <div className="mono" style={{ fontSize:13, fontWeight:800,
                    color: row.er > 0 ? "var(--amber)" : "var(--tm)" }}>
                    {row.er > 0 ? `–${fmt(row.er)}` : "—"}
                  </div>
                )}
              </div>
            ))}
            {/* Total */}
            <div style={{ display:"grid",
              gridTemplateColumns: w < 540 ? "1fr 90px" : "2.4fr 100px 100px",
              gap:8, padding:"12px 16px", background:"var(--surf2)", borderTop:"2px solid var(--b2)", fontWeight:800 }}>
              <div style={{ fontSize:12 }}>TOTAL</div>
              <div className="mono" style={{ fontSize:14, color:"var(--red)" }}>–{fmt(r.totalDed)}</div>
              {w >= 540 && <div className="mono" style={{ fontSize:14, color:"var(--amber)" }}>–{fmt(r.totalEr)}</div>}
            </div>
            {/* Net */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 16px", borderTop:"1px solid var(--b1)", background:"rgba(16,185,129,.04)" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:"var(--green)" }}>Net à verser</div>
                <div style={{ fontSize:10, color:"var(--tm)" }}>Brut – déductions employé</div>
              </div>
              <div className="mono" style={{ fontSize: w < 480 ? 20 : 26, fontWeight:900, color:"var(--green)" }}>
                CHF {fmt(r.net)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ PAGE: ABSENCES ════════════════════════════════════ */

function Absences() {
  const w  = useW();
  const [f, setF] = useState("all");
  const list = ABSENCES.filter(a => f === "all" || a.status === f);
  const p  = w < 600 ? "14px 12px" : "18px 26px";
  const COLORS = { "Vacances":"#10b981","Maladie":"#ef4444","Accident NP":"#f59e0b","Famille":"#3176A6","Accident P":"#ef4444" };

  return (
    <div style={{ flex:1, overflowY:"auto", paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Gestion des absences" sub="Congés · Maladie · Accidents · APG"
        actions={<button className="btn btn-p" style={{ fontSize:11 }}>+ Nouvelle</button>}/>
      <div style={{ padding:p, display:"flex", flexDirection:"column", gap:14 }}>

        <div className="tabs">
          {[["all","Tout"],["pending",`En attente (${ABSENCES.filter(a=>a.status==="pending").length})`],
            ["approved","Approuvé"],["rejected","Refusé"]].map(([val, lbl]) => (
            <button key={val} className={`tab${f === val ? " on" : ""}`} onClick={() => setF(val)}>{lbl}</button>
          ))}
        </div>

        <div className="gabs">
          <div className="card stg">
            {list.map((a, i) => (
              <div key={i} className="row" style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
                <div style={{ width:3, alignSelf:"stretch", borderRadius:2, flexShrink:0,
                  background: COLORS[a.type] || "var(--blue)" }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:2 }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>{a.emp}</span>
                    <span className="badge" style={{ background:(COLORS[a.type]||"var(--blue)")+"1a",
                      color:COLORS[a.type]||"var(--blue)", fontSize:8 }}>{a.type}</span>
                    {a.cert && <span className="badge s-approved" style={{ fontSize:8 }}>Cert ✓</span>}
                  </div>
                  <div style={{ fontSize:10, color:"var(--tm)" }}>
                    {a.start} → {a.end} · <strong>{a.days}j</strong>
                  </div>
                </div>
                <StatusBadge s={a.status}/>
                {a.status === "pending" && (
                  <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                    <button className="btn btn-ok">✓</button>
                    <button className="btn btn-ko">✗</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding:16 }}>
            <SH>Soldes vacances 2025</SH>
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              {VAC.map((v, i) => (
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                    <span style={{ fontWeight:600 }}>{v.n.split(" ")[0]}</span>
                    <span className="mono" style={{ fontWeight:800,
                      color: v.bal < 5 ? "var(--red)" : "var(--blue)" }}>{v.bal}j</span>
                  </div>
                  <ProgBar val={v.taken} max={v.ent} color={v.bal < 5 ? "var(--red)" : "var(--blue)"}/>
                  <div style={{ fontSize:9, color:"var(--tm)", marginTop:1 }}>{v.taken} / {v.ent}j</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ PAGE: TIME TRACKING ═══════════════════════════════ */

function TimeTracking() {
  const w = useW();
  const [emp, setEmp] = useState(EMPLOYEES[0]);
  const totalH  = TIME_W.reduce((a, e) => a + e.worked, 0);
  const totalOT = TIME_W.reduce((a, e) => a + e.ot, 0);
  const target  = emp.rt / 100 * 42;
  const p = w < 600 ? "14px 12px" : "18px 26px";

  return (
    <div style={{ flex:1, overflowY:"auto", paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Pointage & Présences" sub="LTr Art. 15 · Centièmes ou H:MM"
        actions={<button className="btn btn-p" style={{ fontSize:11 }}>💾 Enregistrer</button>}/>
      <div style={{ padding:p, display:"flex", flexDirection:"column", gap:14 }}>
        <div className="gtime">

          {/* Left */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="card" style={{ padding:16 }}>
              <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                color:"var(--tm)", display:"block", marginBottom:8 }}>Collaborateur</label>
              <select className="inp" value={emp.id} onChange={e => setEmp(EMPLOYEES.find(x => x.id === +e.target.value))}>
                {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="card" style={{ padding:16 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>📅 Semaine 03–07 mars</div>
              {[
                { l:"Travaillées",    v:hToHMM(totalH),   c:"var(--blue)" },
                { l:"Contractuelles", v:hToHMM(target),   c:"var(--tm)" },
                { l:"Heures supp.",   v:hToHMM(totalOT),  c:"var(--amber)" },
                { l:"Solde",          v:(totalH - target >= 0 ? "+" : "") + hToHMM(totalH - target),
                  c: totalH >= target ? "var(--green)" : "var(--red)" },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0",
                  borderTop: i > 0 ? "1px solid var(--b1)" : undefined }}>
                  <span style={{ fontSize:12, color:"var(--t2)" }}>{row.l}</span>
                  <span className="mono" style={{ fontSize:14, fontWeight:900, color:row.c }}>{row.v}</span>
                </div>
              ))}
            </div>

            <div style={{ padding:12, background:"var(--amberd)", borderRadius:8,
              border:"1px solid rgba(245,158,11,.2)", fontSize:11 }}>
              <div style={{ fontWeight:700, color:"var(--amber)", marginBottom:4 }}>⚖️ Pauses légales</div>
              <div style={{ color:"var(--t2)", lineHeight:1.7 }}>
                {"> "}5h30 → 15 min<br/>{"> "}7h → 30 min<br/>{"> "}9h → 60 min
              </div>
            </div>
          </div>

          {/* Right: timesheet */}
          <div className="card">
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--b1)", fontWeight:700, fontSize:13 }}>
              Feuille de temps — Mars 2025
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns: w < 500 ? "70px 1fr 1fr 60px" : "80px 80px 80px 50px 70px 60px",
              gap:6, padding:"8px 14px", background:"var(--surf2)", borderBottom:"1px solid var(--b1)",
              fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"var(--tm)" }}>
              {(w < 500 ? ["Date","Arrivée","Départ","Total"] : ["Date","Arrivée","Départ","Pause","Total","HS"]).map(h => <div key={h}>{h}</div>)}
            </div>
            {TIME_W.map((e, i) => (
              <div key={i} className="row" style={{ display:"grid",
                gridTemplateColumns: w < 500 ? "70px 1fr 1fr 60px" : "80px 80px 80px 50px 70px 60px",
                gap:6, padding:"10px 14px", alignItems:"center",
                animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i * 40}ms both` }}>
                <div style={{ fontSize:11, fontWeight:700 }}>{e.d}</div>
                <input className="inp mono" defaultValue={e.arr} style={{ padding:"6px 8px", fontSize:12 }}/>
                <input className="inp mono" defaultValue={e.dep} style={{ padding:"6px 8px", fontSize:12 }}/>
                {w >= 500 && <input className="inp mono" defaultValue="00:30" style={{ padding:"5px 7px", fontSize:11 }}/>}
                <div className="mono" style={{ fontSize:13, fontWeight:900, color:"var(--blue)" }}>{hToHMM(e.worked)}</div>
                {w >= 500 && <div className="mono" style={{ fontSize:12, fontWeight:800, color: e.ot > 0 ? "var(--amber)" : "var(--tm)" }}>
                  {e.ot > 0 ? hToHMM(e.ot) : "—"}
                </div>}
              </div>
            ))}
            <div style={{ display:"grid",
              gridTemplateColumns: w < 500 ? "70px 1fr 1fr 60px" : "80px 80px 80px 50px 70px 60px",
              gap:6, padding:"12px 14px", background:"var(--surf2)", borderTop:"2px solid var(--b2)" }}>
              <div style={{ fontWeight:800, fontSize:11 }}>TOTAL</div>
              <div/><div/>
              {w >= 500 && <div/>}
              <div className="mono" style={{ fontWeight:900, fontSize:14, color:"var(--blue)" }}>{hToHMM(totalH)}</div>
              {w >= 500 && <div className="mono" style={{ fontWeight:800, fontSize:12, color:"var(--amber)" }}>{hToHMM(totalOT)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ PLACEHOLDER ═══════════════════════════════════════ */

function Placeholder({ icon, title, desc }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:14, padding:32, paddingBottom:80, textAlign:"center" }}>
      <div style={{ fontSize:52 }}>{icon}</div>
      <div style={{ fontWeight:900, fontSize:20 }}>{title}</div>
      <div style={{ fontSize:13, color:"var(--tm)", maxWidth:320, lineHeight:1.6 }}>{desc}</div>
      <button className="btn btn-p">Bientôt disponible</button>
    </div>
  );
}

/* ═══ LOGIN ══════════════════════════════════════════════ */

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@swissrh.ch");
  const [pass,  setPass]  = useState("");
  const [load,  setLoad]  = useState(false);
  const w = useW();

  function go() {
    setLoad(true);
    setTimeout(() => { setLoad(false); onLogin(); }, 900);
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#06070e", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse 80% 50% at 20% 40%,rgba(179,45,38,.07) 0%,transparent 50%),radial-gradient(ellipse 60% 40% at 80% 20%,rgba(54,99,137,.08) 0%,transparent 50%),#06070e" }}/>
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)", backgroundSize:"60px 60px", maskImage:"radial-gradient(ellipse at center,black 30%,transparent 70%)" }}/>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420, padding: w < 480 ? "16px" : "24px" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:30 }}>
          <SwissRHLogo height={w < 420 ? 38 : 46} dark/>
        </div>

        <div style={{ background:"rgba(15,18,32,.88)", backdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,.08)", borderRadius:20,
          padding: w < 480 ? "22px 20px" : "30px 28px" }}>
          <div style={{ fontWeight:900, fontSize:22, color:"#fff", marginBottom:4 }}>Connexion</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginBottom:24 }}>Accès sécurisé à votre espace RH</div>

          {[["Email","email",email,setEmail],["Mot de passe","password",pass,setPass]].map(([lbl, type, val, set]) => (
            <div key={lbl} style={{ marginBottom:14 }}>
              <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em",
                color:"rgba(255,255,255,.35)", display:"block", marginBottom:6 }}>{lbl}</label>
              <input className="inp" type={type} value={val} onChange={e => set(e.target.value)}
                onKeyDown={e => e.key === "Enter" && go()}
                style={{ background:"rgba(255,255,255,.06)", borderColor:"rgba(255,255,255,.1)", color:"#fff" }}/>
            </div>
          ))}

          <button className="btn btn-p" onClick={go} disabled={load}
            style={{ width:"100%", justifyContent:"center", padding:"12px", fontSize:14, fontWeight:800, marginTop:6 }}>
            {load ? <><Spinner/>&nbsp;Connexion…</> : "→ Se connecter"}
          </button>
          <div style={{ textAlign:"center", marginTop:16, fontSize:10, color:"rgba(255,255,255,.25)" }}>
            🔒 TLS · swissrh.ch · Groupe NEO
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ APP ROOT ═══════════════════════════════════════════ */

export default function App() {
  const [auth, setAuth]       = useState(false);
  const [page, setPage]       = useState("dashboard");
  const [menu, setMenu]       = useState(false);
  const w = useW();

  if (!auth) return (
    <>
      <style>{CSS}</style>
      <Login onLogin={() => setAuth(true)}/>
    </>
  );

  const PAGES = {
    dashboard: <Dashboard/>,
    employees: <Employees/>,
    salary:    <SalaryCalc/>,
    absences:  <Absences/>,
    time:      <TimeTracking/>,
    payroll:   <Placeholder icon="💳" title="Module Paie"     desc="Bulletins de salaire PDF, validation mensuelle, export Swissdec."/>,
    vacations: <Placeholder icon="🏖" title="Soldes Vacances" desc="Gestion des soldes, report max 5j, pro-rata entrée/sortie."/>,
    reports:   <Placeholder icon="📊" title="Rapports"        desc="Lohnausweis 15 cases, IS cantonaux, export ELM Swissdec 5.0."/>,
    documents: <Placeholder icon="📄" title="Documents RH"    desc="Contrats, attestations CO 330a, certificats de travail."/>,
    settings:  <Placeholder icon="⚙" title="Paramètres"      desc="Configuration entreprise, taux d'assurance, jours fériés."/>,
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
        <Sidebar page={page} setPage={setPage} open={menu} setOpen={setMenu}/>
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg)" }}>
          {PAGES[page] ?? <Dashboard/>}
        </div>
      </div>
    </>
  );
}
