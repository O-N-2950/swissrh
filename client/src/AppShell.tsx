import { useState, useEffect, useMemo } from "react";
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

function Sidebar({ page, setPage, open, setOpen, user, onLogout }) {
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
        <div className="sbi" style={{ justifyContent: col ? "center" : undefined, padding: col ? "8px 0" : undefined, gap: col ? 0 : 9 }}
          onClick={onLogout} title="Se déconnecter">
          <div style={{ width:26, height:26, borderRadius:"50%", background:"var(--sbac)", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"var(--sb)" }}>
            {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {!col && <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>
              {user?.firstName || user?.first_name || user?.email?.split('@')[0] || 'Admin'}
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", cursor:'pointer' }}>🚪 Déconnexion</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

/* ═══ DATA ══════════════════════════════════════════════ */


// ── Secteurs côté frontend (miroir de sector-contributions.ts) ──────────
const SECTOR_CONTRIB_DISPLAY: Record<string, {
  label: string; icon: string; color: string;
  dextra?: { night_rate: number; sunday_rate: number; night_start: number };
  far?: { label: string; er_rate: number; emp_rate?: number };
  formation?: { label: string; er_rate: number; emp_rate?: number };
  reka?: { label: string; er_rate: number; emp_rate: number };
  sectoral_lpp?: { label: string; er_rate: number; emp_rate: number };
  suva_surcharge?: { extra_np_rate: number; extra_p_rate: number };
  fam_alloc_er_rate?: number;
  minimum_wage?: number;
  thirteenth_mandatory?: boolean;
  legal_alerts: string[];
}> = {
  office:          { label:'Bureau / Services',      icon:'💼', color:'#27AE60', legal_alerts:['Durée max 45h/sem (LTr Art.9)', 'HS compensables en temps libre'] },
  construction:    { label:'Construction / Artisanat', icon:'🏗', color:'#E67E22',
    far:          { label:'FAR retraite anticipée', er_rate:0.015 },
    formation:    { label:'Parifonds Construction', er_rate:0.003, emp_rate:0.003 },
    suva_surcharge: { extra_np_rate:0.012, extra_p_rate:0.010 },
    fam_alloc_er_rate: 0.014,
    thirteenth_mandatory: true,
    minimum_wage: 5500,
    legal_alerts:['FAR : 1.5% er retraite anticipée à 60', 'Parifonds : 0.3% emp + 0.3% er', 'SUVA Construction taux majoré', '13e obligatoire CN'] },
  restaurant:      { label:'Hôtellerie / Restauration', icon:'🍽', color:'#C0392B',
    formation:    { label:'Fonds formation L-GAV', er_rate:0.007, emp_rate:0.003 },
    reka:         { label:'REKA bons vacances', er_rate:0.010, emp_rate:0.010 },
    sectoral_lpp: { label:'Caisse LPP sectorielle', er_rate:0.005, emp_rate:0.005 },
    dextra:       { night_rate:0.20, sunday_rate:0.50, night_start:0 },
    thirteenth_mandatory: true,
    minimum_wage: 3931,
    legal_alerts:['REKA obligatoire : 1% emp + 1% er', 'Fonds L-GAV : 0.7% er + 0.3% emp', '13e : 50% juillet + 50% décembre', 'Nuit dès 00h (+20%, ≠ LTr)'] },
  industry_mem:    { label:'Industrie / MEM', icon:'⚙️', color:'#2C3E50',
    formation:    { label:'Fonds formation CCT MEM', er_rate:0.002 },
    thirteenth_mandatory: true,
    minimum_wage: 4400,
    legal_alerts:['13e obligatoire CCT MEM', 'Fonds formation : 0.2% er', '40h/sem standard'] },
  cleaning:        { label:'Nettoyage / Entretien', icon:'🧹', color:'#16A085',
    formation:    { label:'Fonds CCT nettoyage', er_rate:0.006, emp_rate:0.002 },
    dextra:       { night_rate:0.25, sunday_rate:0.50, night_start:20 },
    minimum_wage: 3700,
    legal_alerts:['Nuit dès 20h (≠ LTr 23h)', 'Fonds : 0.6% er + 0.2% emp'] },
  hairdressing:    { label:'Coiffure / Esthétique', icon:'✂️', color:'#8E44AD',
    formation:    { label:'Fonds formation CCT', er_rate:0.004, emp_rate:0.001 },
    minimum_wage: 3600,
    legal_alerts:['Fonds : 0.4% er + 0.1% emp'] },
  transport:       { label:'Transport / Logistique', icon:'🚛', color:'#D35400',
    far:          { label:'FAR Transport (ASTAG)', er_rate:0.013 },
    formation:    { label:'Fonds formation ASTAG', er_rate:0.0015 },
    thirteenth_mandatory: true,
    minimum_wage: 4200,
    legal_alerts:['FAR : ~1.3% er', 'OTR2 : 9h conduite max/jour', '13e obligatoire CCT'] },
  agriculture:     { label:'Agriculture / Viticulture', icon:'🌾', color:'#2ECC71',
    fam_alloc_er_rate: 0.018,
    minimum_wage: 3600,
    legal_alerts:['Alloc. fam. agricoles (caisse cantonale spécifique)', 'Durée max 48h/sem (dérogation LTr)'] },
  retail:          { label:'Commerce / Vente', icon:'🛍', color:'#2980B9',
    minimum_wage: 3400,
    legal_alerts:['Dimanche : dérogation LTr Art.18 nécessaire', 'Salaires min cantonaux : GE 24.32/h · NE 21.09/h'] },
  health_social:   { label:'Santé / Social / EMS', icon:'🏥', color:'#E74C3C',
    formation:    { label:'Fonds formation santé', er_rate:0.0025 },
    dextra:       { night_rate:0.25, sunday_rate:0.50, night_start:22 },
    thirteenth_mandatory: true,
    minimum_wage: 4500,
    legal_alerts:['13e obligatoire CCT santé', 'Nuit dès 22h (CCT)', 'Fériés payés double'] },
};

const IS_BAREMES = [
  { k:'A', l:'A — Célibataire, sans enfant' },
  { k:'B', l:'B — Marié·e, 1 seul revenu' },
  { k:'C', l:'C — Marié·e, 2 revenus' },
  { k:'D', l:'D — Célibataire avec enfants' },
  { k:'H', l:'H — Ménage monoparental' },
];

// IS taux simplifiés (frontend — même logique que backend)
function calcIS(gross: number, canton: string, bareme: string, nbKids = 0) {
  // Approx par tranches (taux effectifs moyens)
  const bIdx = {A:0, B:1, C:2, D:3, H:4}[bareme] ?? 0;
  const TIERS = [
    [2000,  [0.046,0.000,0.000,0.020,0.010]],
    [3000,  [0.086,0.040,0.040,0.060,0.050]],
    [4000,  [0.108,0.060,0.058,0.082,0.072]],
    [5000,  [0.122,0.080,0.076,0.098,0.088]],
    [6000,  [0.133,0.095,0.090,0.110,0.100]],
    [8000,  [0.148,0.112,0.106,0.124,0.114]],
    [10000, [0.158,0.124,0.117,0.134,0.124]],
    [15000, [0.172,0.140,0.131,0.148,0.138]],
    [99999, [0.185,0.155,0.145,0.162,0.152]],
  ] as [number, number[]][];
  let rate = TIERS[TIERS.length-1][1][bIdx];
  for (const [seuil, rates] of TIERS) { if (gross <= seuil) { rate = rates[bIdx]; break; } }
  if (bareme === 'B' && nbKids > 0) rate = Math.max(0, rate - nbKids * 0.005);
  return { rate, amount: gross * rate };
}

// Calcul secteur côté frontend
function calcSectorContribs(gross: number, sectorKey: string) {
  const s = SECTOR_CONTRIB_DISPLAY[sectorKey];
  if (!s) return { empExtra:0, erExtra:0, lines_emp:[] as any[], lines_er:[] as any[] };
  const capped = Math.min(gross, 12350);
  let empExtra = 0, erExtra = 0;
  const lines_emp: any[] = [], lines_er: any[] = [];

  if (s.far) {
    const er = capped * s.far.er_rate;
    erExtra += er; lines_er.push({ l: s.far.label + ' (er)', v: er });
    if (s.far.emp_rate) { const e = capped * s.far.emp_rate; empExtra += e; lines_emp.push({ l: s.far.label + ' (emp)', v: e }); }
  }
  if (s.formation) {
    const er = gross * s.formation.er_rate; erExtra += er; lines_er.push({ l: s.formation.label + ' (er)', v: er });
    if (s.formation.emp_rate) { const e = gross * s.formation.emp_rate; empExtra += e; lines_emp.push({ l: s.formation.label + ' (emp)', v: e }); }
  }
  if (s.reka) {
    const er = capped * s.reka.er_rate; erExtra += er; lines_er.push({ l: s.reka.label + ' (er)', v: er });
    const e  = capped * s.reka.emp_rate; empExtra += e; lines_emp.push({ l: s.reka.label + ' (emp)', v: e });
  }
  if (s.sectoral_lpp) {
    const er = gross * s.sectoral_lpp.er_rate; erExtra += er; lines_er.push({ l: s.sectoral_lpp.label + ' (er)', v: er });
    const e  = gross * s.sectoral_lpp.emp_rate; empExtra += e; lines_emp.push({ l: s.sectoral_lpp.label + ' (emp)', v: e });
  }
  if (s.suva_surcharge) {
    const e = capped * s.suva_surcharge.extra_np_rate; empExtra += e; lines_emp.push({ l: 'SUVA surcharge NP', v: e });
    const er = capped * s.suva_surcharge.extra_p_rate;  erExtra  += er; lines_er.push({ l: 'SUVA surcharge P',  v: er });
  }
  return { empExtra, erExtra, lines_emp, lines_er };
}

function SalaryCalc() {
  const w = useW();
  const [gross,    setGross]    = useState(6500);
  const [age,      setAge]      = useState(38);
  const [rate,     setRate]     = useState(100);
  const [hasLaac,  setHasLaac]  = useState(false);
  const [hasIjm,   setHasIjm]   = useState(true);
  const [sectorKey, setSectorKey] = useState('office');
  const [hasIS,    setHasIS]    = useState(false);
  const [isBareme, setIsBareme] = useState('A');
  const [isKids,   setIsKids]   = useState(0);
  const [has13th,  setHas13th]  = useState(false);

  const r = calcSalary(gross * rate / 100, age, { hasLaac, hasIjm });
  const lppLbl = age < 25 ? "—" : age < 35 ? "7%" : age < 45 ? "10%" : age < 55 ? "15%" : "18%";
  const p = w < 600 ? "14px 12px" : "18px 26px";

  const sectorInfo = SECTOR_CONTRIB_DISPLAY[sectorKey] || SECTOR_CONTRIB_DISPLAY.office;
  const sc = calcSectorContribs(gross * rate / 100, sectorKey);
  const isCalc = hasIS ? calcIS(gross * rate / 100, 'JU', isBareme, isKids) : { rate:0, amount:0 };
  const provision13 = has13th ? (gross * rate / 100) / 12 : 0;
  const rows = [
    { l:"AVS (5.3%)",    e:r.avs,   er:r.avsEr },
    { l:"AI (0.7%)",     e:r.ai,    er:r.aiEr },
    { l:"APG (0.225%)",  e:r.apg,   er:r.apgEr },
    { l:"AC (1.1%)",     e:r.ac,    er:r.acEr },
    r.ace > 0      && { l:"ACE solidarité",         e:r.ace,    er:0 },
    r.lpp > 0      && { l:`LPP (${lppLbl})`,        e:r.lpp,    er:r.lppEr },
    { l:"LAA NP (1.3%)", e:r.laaNp, er:0 },
    { l:"LAA P (0.8%)",  e:0,       er:r.laaPEr },
    hasLaac && r.laacBase > 0 && { l:"LAAC complémentaire", e:r.laac, er:r.laacEr },
    hasIjm  && { l:"IJM (0.75%)",            e:r.ijm,   er:r.ijmEr },
    hasIS   && { l:`IS barème ${isBareme} (${(isCalc.rate*100).toFixed(1)}%)`, e:isCalc.amount, er:0 },
    has13th && { l:"13e salaire (provision 1/12)", e:provision13, er:0 },
    { l:"Alloc. familiales", e:0, er:r.famEr },
    // Cotisations sectorielles
    ...sc.lines_emp.map(l => ({ l:l.l, e:l.v, er:0 })),
    ...sc.lines_er.map(l => ({ l:l.l, e:0, er:l.v })),
  ].filter(Boolean) as {l:string; e:number; er:number}[];

  const totalEmpDeductions = r.totalDed + sc.empExtra + isCalc.amount + provision13;
  const totalErCharges     = r.totalEr  + sc.erExtra;
  const netAfterAll        = (gross * rate / 100) - totalEmpDeductions;

  return (
    <div style={{ flex:1, overflowY:"auto", paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Calculateur de salaire" sub="Taux officiels 2025 · Tous secteurs · IS · 13e"/>
      <div style={{ padding:p, display:"flex", flexDirection:"column", gap:14 }}>

        {/* Sélecteur secteur */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 }}>
          {Object.entries(SECTOR_CONTRIB_DISPLAY).map(([k, s]) => (
            <button key={k} onClick={() => setSectorKey(k)}
              style={{
                padding:"10px 12px", borderRadius:9, border:`2px solid ${sectorKey===k ? s.color : 'var(--b2)'}`,
                background: sectorKey===k ? `${s.color}14` : 'var(--surf)',
                cursor:"pointer", textAlign:"left", transition:"all .2s",
              }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:10, fontWeight:800, lineHeight:1.3 }}>{s.label}</div>
              {sectorInfo.minimum_wage && k === sectorKey && (
                <div style={{ fontSize:8, color:"var(--tm)", marginTop:2 }}>Min CCT : CHF {sectorInfo.minimum_wage.toLocaleString()}</div>
              )}
            </button>
          ))}
        </div>

        {/* Alertes CCT secteur */}
        {sectorInfo.legal_alerts.length > 0 && (
          <div style={{ padding:"10px 14px", background:`${sectorInfo.color}0d`, border:`1px solid ${sectorInfo.color}22`,
            borderRadius:8, fontSize:10, color:sectorInfo.color, display:"flex", gap:8, flexWrap:"wrap" }}>
            <strong>{sectorInfo.icon} {sectorInfo.label} :</strong>
            {sectorInfo.legal_alerts.map((a,i) => (
              <span key={i} style={{ marginRight:8 }}>• {a}</span>
            ))}
          </div>
        )}

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
                {sectorInfo.minimum_wage && (gross * rate / 100) < sectorInfo.minimum_wage && (
                  <div style={{ marginTop:5, fontSize:10, color:"var(--red)", fontWeight:700 }}>
                    ⚠ Salaire inférieur au minimum CCT ({sectorInfo.minimum_wage.toLocaleString()} CHF/m)
                  </div>
                )}
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
              </div>

              <Toggle label="IJM — Indemnité journalière"       hint="0.75% emp. + 0.75% er."     val={hasIjm}  set={setHasIjm}/>
              <Toggle label="LAAC — Assurance complémentaire"   hint="Sur salaire > 12'350 CHF/m"  val={hasLaac} set={setHasLaac}/>
              <Toggle label={`13e salaire${sectorInfo.thirteenth_mandatory ? " ✅ obligatoire CCT" : ""}`}
                      hint="Provision 1/12 par mois"            val={has13th} set={setHas13th}/>
            </div>

            {/* Impôt à la source */}
            <div className="card" style={{ padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: hasIS ? 12 : 0 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:12 }}>🏦 Impôt à la source (IS)</div>
                  <div style={{ fontSize:10, color:"var(--tm)" }}>Permis B / G / L / F</div>
                </div>
                <Toggle label="" hint="" val={hasIS} set={setHasIS}/>
              </div>
              {hasIS && (
                <div style={{ display:"flex", flexDirection:"column", gap:10, paddingTop:12, borderTop:"1px solid var(--b1)" }}>
                  <div>
                    <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--tm)", display:"block", marginBottom:5 }}>Barème</label>
                    <select className="inp" value={isBareme} onChange={e => setIsBareme(e.target.value)}>
                      {IS_BAREMES.map(b => <option key={b.k} value={b.k}>{b.l}</option>)}
                    </select>
                  </div>
                  {(isBareme === 'B' || isBareme === 'D' || isBareme === 'H') && (
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--tm)", display:"block", marginBottom:5 }}>Nb enfants</label>
                      <input className="inp" type="number" min={0} max={10} value={isKids} onChange={e => setIsKids(+e.target.value)}/>
                    </div>
                  )}
                  <div style={{ padding:"8px 10px", background:"var(--blued)", borderRadius:7 }}>
                    <div style={{ fontSize:9, color:"var(--tm)" }}>IS calculé (indicatif)</div>
                    <div className="mono" style={{ fontSize:15, fontWeight:900, color:"var(--blue)" }}>
                      CHF {fmt(isCalc.amount)} <span style={{ fontSize:11, fontWeight:500 }}>({(isCalc.rate*100).toFixed(1)}%)</span>
                    </div>
                    <div style={{ fontSize:8, color:"var(--tm)", marginTop:3 }}>Vérifier barèmes DFI officiels</div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:14 }}>📋 Résumé complet</div>
              {[
                { l:"Salaire brut",            v: gross * rate/100,  c:"var(--t1)",   big:false },
                sc.empExtra > 0 && { l:`Cotisations CCT emp. (${sectorInfo.icon})`, v:-sc.empExtra,  c:"var(--purple)", big:false },
                hasIS   && { l:`IS barème ${isBareme}`,              v:-isCalc.amount, c:"var(--blue)", big:false },
                has13th && { l:"Provision 13e (1/12)",               v:-provision13,  c:"var(--amber)", big:false },
                { l:"Déductions assurances",   v:-r.totalDed,        c:"var(--red)",  big:false },
                { l:"Net à verser",            v:netAfterAll,        c:"var(--green)",big:true },
                { l:"Charges patronales std",  v:r.totalEr,          c:"var(--amber)",big:false },
                sc.erExtra > 0 && { l:`Charges CCT er. (${sectorInfo.icon})`, v:sc.erExtra, c:"var(--purple)", big:false },
                { l:"Coût total employeur",    v:gross*rate/100 + totalErCharges, c:"var(--t2)", big:false },
              ].filter(Boolean).map((row: any, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:`${row.big ? 11 : 7}px 0`,
                  borderTop: i > 0 ? "1px solid var(--b1)" : undefined,
                  borderBottom: row.big ? "2px solid var(--b2)" : undefined }}>
                  <span style={{ fontSize: row.big ? 13 : 11, fontWeight: row.big ? 700 : 500, color:"var(--t2)" }}>{row.l}</span>
                  <span className="mono" style={{ fontSize: row.big ? (w<480?16:20) : 12,
                    fontWeight: row.big ? 900 : 700, color:row.c }}>
                    {row.v < 0 ? "–" : ""} CHF {fmt(Math.abs(row.v))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: full breakdown ── */}
          <div className="card au">
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--b1)" }}>
              <div style={{ fontWeight:800, fontSize:13 }}>Décompte complet — charges sociales 2025</div>
              <div style={{ fontSize:10, color:"var(--tm)", marginTop:2 }}>
                AVS/AI/APG · AC · LPP · LAA · LAAC · IJM
                {sc.lines_emp.length > 0 || sc.lines_er.length > 0 ? ` · ${sectorInfo.icon} CCT ${sectorInfo.label}` : ''}
                {hasIS ? ` · IS barème ${isBareme}` : ''}
                {has13th ? ' · 13e' : ''}
              </div>
            </div>
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
                background: (sc.lines_emp.some(l => l.l === row.l) || sc.lines_er.some(l => l.l === row.l))
                  ? `${sectorInfo.color}08` : undefined,
                animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i * 20}ms both` }}>
                <div style={{ fontSize: w < 480 ? 11 : 12, color:"var(--t2)", display:"flex", alignItems:"center", gap:5 }}>
                  {(sc.lines_emp.some(l => l.l === row.l) || sc.lines_er.some(l => l.l === row.l)) && (
                    <span style={{ fontSize:9 }}>{sectorInfo.icon}</span>
                  )}
                  {row.l}
                </div>
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
              <div style={{ fontSize:12 }}>TOTAL DÉDUCTIONS</div>
              <div className="mono" style={{ fontSize:14, color:"var(--red)" }}>–{fmt(totalEmpDeductions)}</div>
              {w >= 540 && <div className="mono" style={{ fontSize:14, color:"var(--amber)" }}>–{fmt(totalErCharges)}</div>}
            </div>
            {/* Net */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 16px", borderTop:"1px solid var(--b1)", background:"rgba(16,185,129,.04)" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:"var(--green)" }}>Net à verser</div>
                <div style={{ fontSize:10, color:"var(--tm)" }}>Brut – toutes déductions employé</div>
              </div>
              <div className="mono" style={{ fontSize: w < 480 ? 20 : 26, fontWeight:900, color:"var(--green)" }}>
                CHF {fmt(Math.max(0, netAfterAll))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══ PAGE: ABSENCES ════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   SECTOR PROFILE SYSTEM
══════════════════════════════════════════════════════════ */

const SECTOR_PROFILES = {
  restaurant: {
    label: 'Restauration / Hôtellerie',
    icon: '🍽',
    color: '#C0392B',
    defaults: {
      contract_type: 'Horaire',
      weekly_hours: 42,
      vacation_weeks: 4,
      has_dextra: true,
      has_tips: true,
      cct: 'CCT Hôtellerie-Restauration',
    },
    dextra: {
      night_rate: 0.20,       // CCT art. 11: +20% entre 00h–07h
      sunday_rate: 0.50,      // CCT art. 10: +50%
      holiday_rate: 1.00,     // 100% supplément jour férié (en plus salaire)
      overtime_rate: 0.25,    // +25% dès 1ère heure sup
    },
    shifts: ['Matin (06–14h)', 'Midi (10–18h)', 'Soir (16–00h)', 'Nuit (22–06h)', 'Coupure (10–14h / 18–22h)'],
    alerts: ['Repos hebdomadaire 35h (LTr Art.22)', 'Pause obligatoire >5h30', 'Max 50h/sem autorisé CCT'],
  },
  retail: {
    label: 'Commerce / Vente',
    icon: '🛍',
    color: '#2980B9',
    defaults: { contract_type: 'CDI', weekly_hours: 40, vacation_weeks: 5, has_dextra: false, has_tips: false },
    dextra: { night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50, overtime_rate: 0.25 },
    shifts: [],
    alerts: ['Repos dominical (LTr Art.18)'],
  },
  construction: {
    label: 'Construction / Artisanat',
    icon: '🏗',
    color: '#E67E22',
    defaults: { contract_type: 'CDI', weekly_hours: 41.5, vacation_weeks: 5, has_dextra: false, has_tips: false },
    dextra: { night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50, overtime_rate: 0.25 },
    shifts: [],
    alerts: ['Intempéries: RHT possible (LACI Art.32)', 'Salaire minimum CCT construction'],
  },
  office: {
    label: 'Bureau / Services',
    icon: '💼',
    color: '#27AE60',
    defaults: { contract_type: 'CDI', weekly_hours: 42, vacation_weeks: 5, has_dextra: false, has_tips: false },
    dextra: { night_rate: 0.25, sunday_rate: 0.50, holiday_rate: 0.50, overtime_rate: 0.25 },
    shifts: [],
    alerts: [],
  },
};

type SectorKey = keyof typeof SECTOR_PROFILES;

// Context global du secteur (lu depuis company settings)
const SectorCtx = (typeof window !== 'undefined')
  ? (window as any).__srhSector as SectorKey || 'office'
  : 'office';

function useSector(): typeof SECTOR_PROFILES[SectorKey] {
  const [sector, setSector] = useState<SectorKey>('office');
  useEffect(() => {
    apiFetch('/company').then(r => {
      const s = r.company?.sector as SectorKey;
      if (s && SECTOR_PROFILES[s]) setSector(s);
    }).catch(() => {});
  }, []);
  return SECTOR_PROFILES[sector];
}

/* ══════════════════════════════════════════════════════════
   API CLIENT + HOOKS
══════════════════════════════════════════════════════════ */
const API_BASE = '/api';
const apiFetch = async (url: string, method = 'GET', body?: any) => {
  const r = await fetch(API_BASE + url, {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
};

function useApi(fetchFn: any, deps: any[] = []) {
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setLoading(true); setError(null);
    fetchFn().then((d: any) => { setData(d); setLoading(false); })
             .catch((e: any) => { setError(e.message); setLoading(false); });
  };
  useEffect(load, deps);
  return { data, loading, error, reload: load };
}

function ApiState({ loading, error, children }: any) {
  if (loading) return (
    <div style={{ padding:40, display:'flex', justifyContent:'center' }}>
      <Spinner size={28}/>
    </div>
  );
  if (error) return (
    <div style={{ margin:20, padding:'12px 16px', background:'var(--redd)',
      border:'1px solid rgba(239,68,68,.2)', borderRadius:8, fontSize:12, color:'var(--red)' }}>
      ⚠ {error}
    </div>
  );
  return children;
}

const fDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-CH', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—';
const now  = new Date();
const YEAR  = now.getFullYear();
const MONTH = now.getMonth() + 1;
const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_SHORT   = ['L','M','M','J','V','S','D'];

/* ══════════════════════════════════════════════════════════
   DASHBOARD — Actionnable, pas décoratif
══════════════════════════════════════════════════════════ */

function Dashboard({ user = null }: any) {
  const w = useW();
  const p = w < 600 ? '14px 12px' : '20px 26px';
  const [hp, setHp] = useState<number | null>(null);
  const sector = useSector();

  const { data: kpi, loading: kLoading } = useApi(() => apiFetch(`/reports/dashboard?year=${YEAR}&month=${MONTH}`));
  const { data: alertsD } = useApi(() => apiFetch('/absences/alerts/all'));
  const { data: vacD }    = useApi(() => apiFetch(`/absences/vacation/balances?year=${YEAR}`));
  const { data: absD }    = useApi(() => apiFetch('/absences?status=pending'));

  const kd  = kpi?.payroll;
  const emps = kpi?.employees;
  const alerts   = alertsD?.alerts || [];
  const pendingAbs = (absD?.absences || []).filter((a: any) => a.status === 'pending');
  const vac  = (vacD?.balances || []).slice(0, 5);

  // Tâches actionnables du jour
  const tasks = [
    pendingAbs.length > 0 && {
      id: 'abs', icon: '📋', label: `${pendingAbs.length} demande(s) de congés en attente`,
      action: 'absences', urgency: 'high', detail: pendingAbs.map((a: any) => `${a.first_name} ${a.last_name}`).join(', ')
    },
    alerts.length > 0 && {
      id: 'permits', icon: '🪪', label: `${alerts.length} permis de travail expire bientôt`,
      action: 'employees', urgency: 'medium', detail: alerts.slice(0,2).map((a: any) => `${a.first_name} ${a.last_name}`).join(', ')
    },
    vac.some((v: any) => v.balance_days > 20) && {
      id: 'vac', icon: '🏖', label: `Solde vacances > 20j pour ${vac.filter((v: any) => v.balance_days > 20).length} employé(s)`,
      action: 'vacations', urgency: 'low', detail: 'Planifier les congés avant fin d\'année'
    },
    new Date().getDate() >= 25 && {
      id: 'payroll', icon: '💳', label: `Paie de ${MONTH_NAMES[MONTH-1]} — Prête à lancer`,
      action: 'payroll', urgency: 'high', detail: `${emps?.total ?? 0} collaborateurs`
    },
  ].filter(Boolean) as any[];

  const pieData = kd ? [
    { name:'AVS/AI/APG', v:Math.round((kd.totalGross||0)*0.0853/Math.max(emps?.total||1,1)), c:'#3176A6' },
    { name:'LPP',        v:Math.round((kd.totalGross||0)*0.050 /Math.max(emps?.total||1,1)), c:'#8b5cf6' },
    { name:'AC/ACE',     v:Math.round((kd.totalGross||0)*0.016 /Math.max(emps?.total||1,1)), c:'#10b981' },
    { name:'LAA NP',     v:Math.round((kd.totalGross||0)*0.013 /Math.max(emps?.total||1,1)), c:'#f59e0b' },
    { name:'IJM',        v:Math.round((kd.totalGross||0)*0.0075/Math.max(emps?.total||1,1)), c:'#ef4444' },
  ] : [];

  const URGENCY_STYLE: any = {
    high:   { bg:'rgba(239,68,68,.08)',   border:'rgba(239,68,68,.2)',   dot:'var(--red)' },
    medium: { bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.2)',  dot:'var(--amber)' },
    low:    { bg:'rgba(49,118,166,.08)',  border:'rgba(49,118,166,.2)',  dot:'var(--blue)' },
  };

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar
        title="Dashboard RH"
        sub={kLoading ? 'Chargement…' : `${MONTH_NAMES[MONTH-1]} ${YEAR} · ${emps?.total ?? '…'} collaborateurs${user?.companyName ? ` · ${user.companyName}` : ''}${sector.label !== 'Bureau / Services' ? ` · ${sector.icon} ${sector.label}` : ''}`}
        actions={<>
          <button className="btn btn-g" style={{ fontSize:11 }}
            onClick={() => window.open('/api/exports/employees.csv','_blank')}>📤 Export</button>
        </>}
      />
      <div style={{ padding:p, display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── Tâches du jour ── */}
        {tasks.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }} className="au">
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--tm)', marginBottom:2 }}>
              ⚡ Actions requises aujourd'hui
            </div>
            {tasks.map((t, i) => {
              const s = URGENCY_STYLE[t.urgency];
              return (
                <div key={t.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                  background:s.bg, border:`1px solid ${s.border}`,
                  borderRadius:9, cursor:'pointer',
                  animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i*60}ms both`,
                  transition:'transform .15s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='translateX(3px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform='translateX(0)'}
                >
                  <div style={{ width:7, height:7, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>
                  <span style={{ fontSize:14 }}>{t.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700 }}>{t.label}</div>
                    {t.detail && <div style={{ fontSize:10, color:'var(--tm)', marginTop:1 }}>{t.detail}</div>}
                  </div>
                  <span style={{ fontSize:11, color:'var(--tm)', flexShrink:0 }}>→</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="g4 stg">
          <KpiCard label="Masse salariale brute" value={kd?.totalGross ?? 0}
            sub={MONTH_NAMES[MONTH-1]} color="var(--blue)" icon="💰"
            trend={parseFloat(kd?.trendVsLastMonth ?? '0')} delay={0}/>
          <KpiCard label="Net total versé" value={kd?.totalNet ?? 0}
            sub="ce mois" color="var(--green)" icon="✅" delay={60}/>
          <KpiCard label="Charges patronales" value={kd?.totalEmployerCost ?? 0}
            sub={kd?.totalGross ? `≈ ${((kd.totalEmployerCost/kd.totalGross)*100).toFixed(0)}% brut` : '—'}
            color="var(--amber)" icon="🏛" delay={120}/>
          <KpiCard label="Collaborateurs" value={emps?.total ?? 0}
            sub={alerts.length > 0 ? `${alerts.length} alerte permis` : pendingAbs.length > 0 ? `${pendingAbs.length} congé en attente` : 'RAS'}
            isNum color="var(--purple)" icon="👥" delay={180}/>
        </div>

        {/* ── Alertes secteur ── */}
        {sector.alerts.length > 0 && (
          <div style={{ padding:'10px 14px', background:'rgba(49,118,166,.05)', border:'1px solid rgba(49,118,166,.12)', borderRadius:8, fontSize:11, color:'var(--blue)' }}>
            <strong>📌 {sector.icon} {sector.cct || 'Rappels légaux'} :</strong>{' '}
            {sector.alerts.join(' · ')}
          </div>
        )}

        {/* ── Charts + Alertes + Absences ── */}
        <div className="g3">
          {/* Pie charges */}
          <div className="card au" style={{ padding: w < 480 ? 14 : 18 }}>
            <SH>🧮 Déductions par type</SH>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%"
                      innerRadius={38} outerRadius={58}
                      dataKey="v" paddingAngle={2}
                      onMouseEnter={(_: any, i: number) => setHp(i)}
                      onMouseLeave={() => setHp(null)}>
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.c}
                          opacity={hp === null || hp === i ? 1 : .4}
                          strokeWidth={hp === i ? 2 : 0} stroke="var(--surf)"/>
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`CHF ${fmt(v, 0)}`]}
                      contentStyle={{ background:'var(--surf)', border:'1px solid var(--b2)', borderRadius:8, fontFamily:'var(--mono)', fontSize:11 }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:d.c, flexShrink:0 }}/>
                        <span style={{ color:'var(--t2)' }}>{d.name}</span>
                      </div>
                      <span className="mono" style={{ fontWeight:700, fontSize:11 }}>CHF {fmt(d.v, 0)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : kLoading ? <Spinner/> : (
              <div style={{ padding:20, textAlign:'center', color:'var(--tm)', fontSize:12 }}>
                Aucune donnée de paie ce mois
              </div>
            )}
          </div>

          {/* Alertes */}
          <div className="card au" style={{ padding: w < 480 ? 14 : 18, animationDelay:'.05s' }}>
            <SH>🔔 Alertes {alerts.length > 0 && <span className="badge s-rejected" style={{ marginLeft:5 }}>{alerts.length}</span>}</SH>
            {alerts.length === 0 ? (
              <div style={{ padding:'16px 0', textAlign:'center', fontSize:12, color:'var(--tm)' }}>✅ Aucune alerte</div>
            ) : alerts.slice(0,4).map((a: any, i: number) => (
              <div key={i} style={{ display:'flex', gap:8, padding:'8px 10px', marginBottom:6,
                background:'var(--amberd)', borderRadius:7, border:'1px solid rgba(245,158,11,.2)' }}>
                <span style={{ fontSize:12, flexShrink:0 }}>🪪</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700 }}>{a.first_name} {a.last_name}</div>
                  <div style={{ fontSize:10, color:'var(--tm)' }}>Permis {a.permit_type} · expire dans {a.days_remaining}j</div>
                </div>
              </div>
            ))}

            {pendingAbs.length > 0 && (
              <div style={{ marginTop:8, borderTop:'1px solid var(--b1)', paddingTop:8 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'var(--tm)', marginBottom:6 }}>En attente</div>
                {pendingAbs.slice(0,3).map((a: any, i: number) => (
                  <div key={i} style={{ display:'flex', gap:8, padding:'6px 10px', marginBottom:4,
                    background:'var(--blued)', borderRadius:7 }}>
                    <span style={{ fontSize:11 }}>📋</span>
                    <div style={{ fontSize:11, color:'var(--t2)' }}>
                      <strong>{a.first_name}</strong> · {a.days_count}j ·
                      {fDate(a.start_date)}–{fDate(a.end_date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Soldes vacances */}
          <div className="card au" style={{ padding: w < 480 ? 14 : 18, animationDelay:'.10s' }}>
            <SH>🏖 Soldes vacances</SH>
            {vac.length === 0 ? <div style={{ fontSize:12, color:'var(--tm)' }}>Aucune donnée</div>
            : vac.map((v: any, i: number) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                  <span style={{ fontWeight:600 }}>{v.first_name} {v.last_name?.charAt(0)}.</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {v.balance_days > 20 && <span style={{ fontSize:9, color:'var(--amber)', fontWeight:700 }}>⚠</span>}
                    <span className="mono" style={{ color: v.balance_days < 5 ? 'var(--red)' : v.balance_days > 20 ? 'var(--amber)' : 'var(--blue)', fontWeight:700 }}>
                      {v.balance_days}j
                    </span>
                  </div>
                </div>
                <div className="prog">
                  <div className="prog-f" style={{
                    width:`${Math.min(100,(v.taken_days/v.entitled_days)*100)||0}%`,
                    background: v.balance_days < 5 ? 'var(--red)' : v.balance_days > 20 ? 'var(--amber)' : 'var(--blue)'
                  }}/>
                </div>
                <div style={{ fontSize:9, color:'var(--tm)', marginTop:1 }}>{v.taken_days}/{v.entitled_days}j pris</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TIME TRACKING V2 — DEXTRA + Shifts + Auto-calcul
══════════════════════════════════════════════════════════ */

function dextraLabel(type: string) {
  return { night:'🌙 Nuit (+20%)', sunday:'☀ Dimanche (+50%)', holiday:'🎉 Férié (+100%)', overtime:'⏱ Suppl. (+25%)' }[type] || type;
}

function calcDextra(entries: any[], sector: any) {
  return entries.reduce((acc, e) => {
    const h = e.worked_hours || 0;
    const hn = e.night_hours || 0;
    const hs = e.sunday_hours || 0;
    const hh = e.holiday_hours || 0;
    const ho = e.overtime_hours || 0;
    const base = e.hourly_rate || 0;
    const d = sector.dextra;
    return {
      ...acc,
      normal:   acc.normal   + (h - hn - hs - hh - ho) * base,
      night:    acc.night    + hn * base * d.night_rate,
      sunday:   acc.sunday   + hs * base * d.sunday_rate,
      holiday:  acc.holiday  + hh * base * d.holiday_rate,
      overtime: acc.overtime + ho * base * d.overtime_rate,
      hours:    acc.hours    + h,
    };
  }, { normal:0, night:0, sunday:0, holiday:0, overtime:0, hours:0 });
}

function WeekGrid({ entries, onEntry, sector, empData }: any) {
  // Build week grid (current week, Mon–Sun)
  const [weekOffset, setWeekOffset] = useState(0);
  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1 + weekOffset * 7);
    d.setHours(0,0,0,0);
    return d;
  }, [weekOffset]);

  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const entryMap: any = {};
  (entries || []).forEach((e: any) => {
    const k = e.work_date?.slice(0,10);
    if (k) entryMap[k] = e;
  });

  const dayNames = ['LUN','MAR','MER','JEU','VEN','SAM','DIM'];
  const isSunday = (d: Date) => d.getDay() === 0;

  const weekStr = `${days[0].toLocaleDateString('fr-CH',{day:'2-digit',month:'2-digit'})} – ${days[6].toLocaleDateString('fr-CH',{day:'2-digit',month:'2-digit',year:'numeric'})}`;

  const totalH = days.reduce((s, d) => {
    const k = d.toISOString().slice(0,10);
    return s + (entryMap[k]?.worked_hours || 0);
  }, 0);
  const targetH = (empData?.weekly_hours || 42);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <button className="btn btn-g" style={{ padding:'5px 10px' }} onClick={() => setWeekOffset(o => o-1)}>←</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontWeight:700, fontSize:13 }}>Semaine {weekStr}</div>
          <div style={{ fontSize:10, color:'var(--tm)' }}>
            {hToHMM(totalH)} / {hToHMM(targetH)}
            <span style={{ marginLeft:8, color: totalH >= targetH ? 'var(--green)' : 'var(--red)', fontWeight:700 }}>
              {totalH >= targetH ? `+${hToHMM(totalH-targetH)}` : `-${hToHMM(targetH-totalH)}`}
            </span>
          </div>
        </div>
        <button className="btn btn-g" style={{ padding:'5px 10px' }} onClick={() => setWeekOffset(o => o+1)}>→</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}>
        {days.map((day, di) => {
          const iso = day.toISOString().slice(0,10);
          const e   = entryMap[iso];
          const isToday = iso === new Date().toISOString().slice(0,10);
          const isSun   = isSunday(day);
          const isPast  = day < now;

          return (
            <div key={di}
              style={{
                borderRadius:9, border:`1px solid ${isToday ? 'var(--blue)' : isSun ? 'rgba(239,68,68,.2)' : 'var(--b2)'}`,
                background: isToday ? 'var(--blued)' : isSun ? 'rgba(239,68,68,.04)' : 'var(--surf)',
                padding:'8px 6px', cursor:'pointer', transition:'all .15s',
                minHeight:90, display:'flex', flexDirection:'column', gap:4
              }}
              onClick={() => onEntry(day, e)}
              onMouseEnter={el => (el.currentTarget as HTMLElement).style.boxShadow='0 2px 12px rgba(0,0,0,.08)'}
              onMouseLeave={el => (el.currentTarget as HTMLElement).style.boxShadow='none'}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:8, fontWeight:800, letterSpacing:'.05em', color: isSun ? 'var(--red)' : 'var(--tm)' }}>{dayNames[di]}</span>
                <span style={{ fontSize:11, fontWeight:700, color: isToday ? 'var(--blue)' : 'var(--t2)' }}>{day.getDate()}</span>
              </div>

              {e ? (
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:900, color:'var(--blue)', fontFamily:'var(--mono)' }}>
                    {hToHMM(e.worked_hours||0)}
                  </div>
                  <div style={{ fontSize:9, color:'var(--tm)' }}>{e.start_time}–{e.end_time}</div>
                  {/* DEXTRA badges */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:2, marginTop:3 }}>
                    {(e.night_hours||0) > 0 && <span style={{ fontSize:7, padding:'1px 4px', borderRadius:3, background:'rgba(139,92,246,.15)', color:'#7c3aed', fontWeight:800 }}>🌙{hToHMM(e.night_hours)}</span>}
                    {(e.sunday_hours||0) > 0 && <span style={{ fontSize:7, padding:'1px 4px', borderRadius:3, background:'rgba(239,68,68,.12)', color:'var(--red)', fontWeight:800 }}>☀{hToHMM(e.sunday_hours)}</span>}
                    {(e.overtime_hours||0) > 0 && <span style={{ fontSize:7, padding:'1px 4px', borderRadius:3, background:'rgba(245,158,11,.15)', color:'var(--amber)', fontWeight:800 }}>⏱+{hToHMM(e.overtime_hours)}</span>}
                  </div>
                </div>
              ) : (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:16, color:'var(--b2)' }}>+</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeEntryModal({ day, existing, empData, sector, onClose, onSaved }: any) {
  const dateStr = day.toISOString().slice(0,10);
  const dayOfWeek = day.getDay();
  const isSun     = dayOfWeek === 0;
  const isSat     = dayOfWeek === 6;

  const [form, setForm] = useState({
    start_time:   existing?.start_time   || (isSun||isSat ? '08:00' : '08:00'),
    end_time:     existing?.end_time     || (isSun||isSat ? '17:00' : '17:00'),
    break_minutes: existing?.break_minutes ?? 30,
    notes:        existing?.notes        || '',
    shift_type:   existing?.shift_type   || 'normal',
    tips_amount:  existing?.tips_amount  || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}));

  // Auto-calcul DEXTRA
  const calc = useMemo(() => {
    const toH = (t: string) => {
      const [h,m] = t.split(':').map(Number);
      return h + (m||0)/60;
    };
    const start = toH(form.start_time);
    let end   = toH(form.end_time);
    if (end <= start) end += 24; // nuit
    const worked = Math.max(0, end - start - form.break_minutes/60);
    const targetH = (empData?.weekly_hours || 42) / 5;

    // DEXTRA calculation
    let nightH = 0, sundayH = 0, overtimeH = 0, holidayH = 0;

    if (isSun) {
      // Tout est dimanche
      sundayH = worked;
    } else if (sector.defaults.has_dextra) {
      // Nuit : 00h-07h (CCT restauration) ou 23h-06h (LTr)
      const nightStart = form.shift_type === 'night' ? 22 : 23;
      const nightEnd   = 7;
      // Count hours in night range
      for (let h = 0; h < worked; h++) {
        const cur = (start + h) % 24;
        if (cur >= nightStart || cur < nightEnd) nightH++;
      }
    }

    if (worked > targetH) overtimeH = worked - targetH;

    return { worked, nightH: Math.round(nightH*4)/4, sundayH, overtimeH: Math.round(overtimeH*4)/4, holidayH };
  }, [form.start_time, form.end_time, form.break_minutes, form.shift_type, isSun, sector, empData]);

  const d = sector.dextra;
  const hr = empData?.salary_amount || 0; // hourly rate

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        employee_id: empData?.id, work_date: dateStr,
        start_time: form.start_time, end_time: form.end_time,
        break_minutes: form.break_minutes,
        worked_hours: calc.worked,
        night_hours: calc.nightH, sunday_hours: calc.sundayH,
        holiday_hours: calc.holidayH, overtime_hours: calc.overtimeH,
        notes: form.notes, shift_type: form.shift_type,
        tips_amount: form.tips_amount ? parseFloat(form.tips_amount) : null,
        status: 'pending',
      };
      if (existing?.id) await apiFetch(`/time/${existing.id}`, 'PUT', body);
      else              await apiFetch('/time', 'POST', body);
      onSaved();
    } catch(e: any) { alert(e.message); }
    setSaving(false);
  };

  const SHIFT_TYPES = sector.shifts.length > 0
    ? [['normal','Normal'], ...sector.shifts.map((s: string, i: number) => [`shift_${i}`, s])]
    : [['normal','Normal']];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ padding:24, maxWidth:460 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>
              {day.toLocaleDateString('fr-CH',{weekday:'long',day:'numeric',month:'long'})}
              {isSun && <span style={{ marginLeft:8, fontSize:11, background:'rgba(239,68,68,.12)', color:'var(--red)', padding:'2px 8px', borderRadius:5, fontWeight:700 }}>DIMANCHE</span>}
            </div>
            {isSun && <div style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>Supplément +{Math.round(d.sunday_rate*100)}% automatique (LTr Art.19)</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--tm)' }}>×</button>
        </div>

        {/* Shift selector (restaurant) */}
        {sector.shifts.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:6 }}>Type de shift</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {SHIFT_TYPES.map(([v,l]: any) => (
                <button key={v} onClick={() => {
                  set('shift_type', v);
                  // Auto-fill times
                  const presets: any = {
                    'shift_0': ['06:00','14:00'], 'shift_1': ['10:00','18:00'],
                    'shift_2': ['16:00','00:00'], 'shift_3': ['22:00','06:00'],
                    'shift_4': ['10:00','22:00'],
                  };
                  if (presets[v]) { set('start_time', presets[v][0]); set('end_time', presets[v][1]); }
                }} className={`btn ${form.shift_type === v ? 'btn-p' : 'btn-g'}`} style={{ fontSize:11 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="g2" style={{ gap:12, marginBottom:14 }}>
          {[['Arrivée','start_time'],['Départ','end_time']].map(([lbl,k]) => (
            <div key={k}>
              <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>{lbl}</label>
              <input className="inp mono" type="time" value={(form as any)[k]} onChange={e => set(k, e.target.value)}/>
            </div>
          ))}
          <div>
            <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>Pause (min)</label>
            <input className="inp mono" type="number" min="0" max="120" step="5" value={form.break_minutes} onChange={e => set('break_minutes', +e.target.value)}/>
          </div>
          {sector.defaults.has_tips && (
            <div>
              <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>Pourboires CHF</label>
              <input className="inp mono" type="number" min="0" step="0.05" placeholder="0.00" value={form.tips_amount} onChange={e => set('tips_amount', e.target.value)}/>
            </div>
          )}
        </div>

        {/* DEXTRA recap auto */}
        <div style={{ background:'var(--surf2)', borderRadius:9, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', marginBottom:8 }}>Récap automatique</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[
              { lbl:'Total travaillé', v:hToHMM(calc.worked), c:'var(--blue)', bold:true },
              calc.nightH > 0   && { lbl:`Heures nuit (+${Math.round(d.night_rate*100)}%)`,    v:hToHMM(calc.nightH),    c:'#7c3aed' },
              calc.sundayH > 0  && { lbl:`Heures dim. (+${Math.round(d.sunday_rate*100)}%)`,  v:hToHMM(calc.sundayH),   c:'var(--red)' },
              calc.overtimeH > 0 && { lbl:`Heures suppl. (+25%)`, v:hToHMM(calc.overtimeH), c:'var(--amber)' },
            ].filter(Boolean).map((item: any, i) => (
              <div key={i} style={{ background:'var(--surf)', borderRadius:6, padding:'6px 10px', border:'1px solid var(--b1)' }}>
                <div style={{ fontSize:9, color:'var(--tm)' }}>{item.lbl}</div>
                <div className="mono" style={{ fontSize:13, fontWeight:900, color:item.c }}>{item.v}</div>
              </div>
            ))}
          </div>

          {(calc.nightH > 0 || calc.sundayH > 0 || calc.overtimeH > 0) && hr > 0 && (
            <div style={{ marginTop:8, fontSize:11, color:'var(--green)', fontWeight:700 }}>
              + CHF {fmt((calc.nightH*hr*d.night_rate + calc.sundayH*hr*d.sunday_rate + calc.overtimeH*hr*d.overtime_rate), 2)} de suppléments DEXTRA
            </div>
          )}
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>Remarque</label>
          <input className="inp" placeholder="Optionnel…" value={form.notes} onChange={e => set('notes', e.target.value)}/>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-g" onClick={onClose}>Annuler</button>
          <button className="btn btn-p" onClick={save} disabled={saving}>
            {saving ? <Spinner size={14}/> : (existing ? '💾 Modifier' : '✅ Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeTracking() {
  const w = useW();
  const p = w < 600 ? '14px 12px' : '18px 26px';
  const [empId, setEmpId]   = useState('');
  const [modal, setModal]   = useState<{day: Date, existing: any}|null>(null);
  const sector = useSector();

  const { data: empD } = useApi(() => apiFetch('/employees'));
  const employees = empD?.employees || [];

  const { data: timeD, reload } = useApi(
    () => empId ? apiFetch(`/time/summary/${empId}?year=${YEAR}&month=${MONTH}`) : Promise.resolve(null),
    [empId]
  );

  useEffect(() => { if (employees.length > 0 && !empId) setEmpId(String(employees[0].id)); }, [employees]);

  const emp     = employees.find((e: any) => String(e.id) === String(empId));
  const summary = timeD?.summary;
  const entries = timeD?.entries || [];

  const dextraSummary = useMemo(() => calcDextra(entries, sector), [entries, sector]);

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Pointage & Présences"
        sub={`LTr Art.15 · ${sector.defaults.has_dextra ? `DEXTRA · ${sector.icon}` : 'Heures de travail'}`}
      />
      <div style={{ padding:p, display:'flex', flexDirection:'column', gap:14 }}>

        {/* Sélecteur employé */}
        <div className="card" style={{ padding:14, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>Collaborateur</label>
            <select className="inp" value={empId} onChange={e => setEmpId(e.target.value)}>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} · {e.salary_type==='hourly'?`${fmt(e.salary_amount,2)} CHF/h`:`${fmt(e.salary_amount,0)} CHF/m`}</option>)}
            </select>
          </div>
          {emp && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { l:'Taux', v:`${emp.activity_rate}%`, c:'var(--blue)' },
                { l:'Heures/sem', v:`${emp.weekly_hours}h`, c:'var(--purple)' },
                summary && { l:'Balance', v:(summary.balance_hours>=0?'+':'')+hToHMM(summary.balance_hours||0), c:summary.balance_hours>=0?'var(--green)':'var(--red)' },
              ].filter(Boolean).map((item: any,i) => (
                <div key={i} style={{ padding:'6px 10px', background:'var(--surf2)', borderRadius:7 }}>
                  <div style={{ fontSize:9, color:'var(--tm)', fontWeight:700 }}>{item.l}</div>
                  <div className="mono" style={{ fontSize:13, fontWeight:900, color:item.c }}>{item.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DEXTRA summary si activé */}
        {sector.defaults.has_dextra && dextraSummary.hours > 0 && (
          <div style={{ background:'linear-gradient(135deg,rgba(139,92,246,.08),rgba(49,118,166,.06))',
            border:'1px solid rgba(139,92,246,.15)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', color:'#7c3aed', marginBottom:8 }}>
              {sector.icon} DEXTRA — Suppléments du mois
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { l:'Heures normales', v:hToHMM(dextraSummary.hours), c:'var(--blue)' },
                dextraSummary.night > 0   && { l:`Nuit (+${Math.round(sector.dextra.night_rate*100)}%)`,   v:fmt(dextraSummary.night,2)+' CHF',   c:'#7c3aed' },
                dextraSummary.sunday > 0  && { l:`Dimanche (+${Math.round(sector.dextra.sunday_rate*100)}%)`, v:fmt(dextraSummary.sunday,2)+' CHF',  c:'var(--red)' },
                dextraSummary.overtime > 0 && { l:'Heures suppl.',                                           v:fmt(dextraSummary.overtime,2)+' CHF', c:'var(--amber)' },
              ].filter(Boolean).map((item: any,i) => (
                <div key={i} style={{ padding:'6px 12px', background:'rgba(255,255,255,.7)', borderRadius:7, backdropFilter:'blur(4px)' }}>
                  <div style={{ fontSize:9, color:'var(--tm)' }}>{item.l}</div>
                  <div className="mono" style={{ fontSize:13, fontWeight:900, color:item.c }}>{item.v}</div>
                </div>
              ))}
              {(dextraSummary.night+dextraSummary.sunday+dextraSummary.overtime) > 0 && (
                <div style={{ padding:'6px 12px', background:'rgba(16,185,129,.1)', borderRadius:7, border:'1px solid rgba(16,185,129,.2)' }}>
                  <div style={{ fontSize:9, color:'var(--tm)' }}>Total suppléments</div>
                  <div className="mono" style={{ fontSize:13, fontWeight:900, color:'var(--green)' }}>
                    + CHF {fmt(dextraSummary.night+dextraSummary.sunday+dextraSummary.overtime, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grille visuelle */}
        <div className="card" style={{ padding:16 }}>
          <SH>📅 Grille de présence</SH>
          <WeekGrid entries={entries} sector={sector} empData={emp}
            onEntry={(day: Date, existing: any) => setModal({day, existing})}/>
        </div>

        {/* Mentions légales */}
        <div style={{ padding:'10px 14px', background:'var(--surf2)', borderRadius:8, fontSize:10, color:'var(--tm)' }}>
          <strong>⚖️ Rappels LTr :</strong> Pause {'>'} 5h30 = 15min · {'>'} 7h = 30min · {'>'} 9h = 60min · Repos hebdo = 35h consécutives · Max 45h/semaine (Art.9)
          {sector.defaults.has_dextra && ` · ${sector.icon} Suppléments CCT applicables`}
        </div>
      </div>

      {modal && (
        <TimeEntryModal
          day={modal.day} existing={modal.existing}
          empData={emp} sector={sector}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload(); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAYROLL RUN — Lancer la paie (3 étapes)
══════════════════════════════════════════════════════════ */

function PayrollRunModal({ month, year, employees, sector, onClose, onDone }: any) {
  const [step, setStep] = useState<'preview'|'confirm'|'done'>('preview');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Step 1: Preview calculs
  useEffect(() => {
    setLoading(true);
    Promise.all(
      employees
        .filter((e: any) => e.salary_amount > 0)
        .map(async (emp: any) => {
          try {
            const res = await apiFetch('/salary/calculate', 'POST', {
              grossSalary:  emp.salary_type === 'monthly' ? emp.salary_amount : emp.salary_amount * emp.weekly_hours * 4.33,
              age:          emp.age || 35,
              activityRate: emp.activity_rate,
              hasLaac:      sector.label === 'Restauration / Hôtellerie',
              hasIjm:       true,
            });
            return { ...emp, calc: res.result, ok: true };
          } catch(e: any) {
            return { ...emp, error: e.message, ok: false };
          }
        })
    ).then(r => { setResults(r); setLoading(false); });
  }, []);

  const totalGross = results.filter(r=>r.ok).reduce((s,r) => s + (r.calc?.grossTotal||0), 0);
  const totalNet   = results.filter(r=>r.ok).reduce((s,r) => s + (r.calc?.netSalary||0), 0);
  const totalCost  = results.filter(r=>r.ok).reduce((s,r) => s + (r.calc?.totalCost||0), 0);

  // Step 2: Validate & save all payslips
  const runPayroll = async () => {
    setStep('confirm');
    setLoading(true);
    const errs: string[] = [];
    let done = 0;

    for (const r of results.filter(r => r.ok)) {
      try {
        await apiFetch('/salary/payslip', 'POST', {
          employeeId: r.id, periodYear: year, periodMonth: month,
          grossSalary: r.calc.grossTotal,
          age: r.age || 35,
          activityRate: r.activity_rate,
          hasLaac: sector.label === 'Restauration / Hôtellerie',
          hasIjm: true,
        });
        done++;
        setProgress(Math.round((done / results.filter(r=>r.ok).length) * 100));
      } catch(e: any) {
        errs.push(`${r.first_name} ${r.last_name}: ${e.message}`);
      }
    }
    setErrors(errs);
    setLoading(false);
    setStep('done');
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && step === 'done' && onClose()}>
      <div className="modal" style={{ padding:28, maxWidth:600 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18 }}>🚀 Lancer la paie</div>
            <div style={{ fontSize:12, color:'var(--tm)' }}>{MONTH_NAMES[month-1]} {year} · {results.filter(r=>r.ok).length} bulletins</div>
          </div>
          {step === 'done' && <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--tm)' }}>×</button>}
        </div>

        {/* Steps indicator */}
        <div style={{ display:'flex', gap:4, marginBottom:20 }}>
          {[['preview','1. Aperçu'],['confirm','2. Lancement'],['done','3. Terminé']].map(([s,l], i) => (
            <div key={s} style={{ flex:1, height:4, borderRadius:2,
              background: ['preview','confirm','done'].indexOf(step) >= i ? 'var(--blue)' : 'var(--surf2)',
              transition:'background .3s' }}/>
          ))}
        </div>

        {step === 'preview' && (
          <>
            {loading ? (
              <div style={{ padding:40, textAlign:'center' }}>
                <Spinner size={28}/>
                <div style={{ fontSize:12, color:'var(--tm)', marginTop:12 }}>Calcul en cours…</div>
              </div>
            ) : (
              <>
                {/* Summary KPIs */}
                <div className="g3" style={{ marginBottom:16 }}>
                  {[
                    { l:'Masse brute totale', v:fCHF(totalGross), c:'var(--blue)' },
                    { l:'Net total à verser', v:fCHF(totalNet),   c:'var(--green)' },
                    { l:'Coût total employeur', v:fCHF(totalCost), c:'var(--amber)' },
                  ].map((k,i) => (
                    <div key={i} style={{ padding:'12px 14px', background:'var(--surf2)', borderRadius:9 }}>
                      <div style={{ fontSize:10, color:'var(--tm)', fontWeight:700 }}>{k.l}</div>
                      <div className="mono" style={{ fontSize:16, fontWeight:900, color:k.c, marginTop:4 }}>{k.v}</div>
                    </div>
                  ))}
                </div>

                {/* Per-employee preview */}
                <div style={{ maxHeight:260, overflowY:'auto', border:'1px solid var(--b1)', borderRadius:8 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
                    gap:8, padding:'7px 12px', background:'var(--surf2)',
                    fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--tm)' }}>
                    {['Employé','Brut','Net','Charges er.'].map(h => <div key={h}>{h}</div>)}
                  </div>
                  {results.map((r, i) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
                      gap:8, padding:'9px 12px', borderTop:'1px solid var(--b1)',
                      background: !r.ok ? 'rgba(239,68,68,.05)' : undefined }}>
                      <div style={{ fontWeight:700, fontSize:12 }}>
                        {r.first_name} {r.last_name}
                        {!r.ok && <span style={{ color:'var(--red)', fontSize:10 }}> ⚠ {r.error}</span>}
                      </div>
                      {r.ok ? (
                        <>
                          <div className="mono" style={{ fontWeight:800, color:'var(--blue)', fontSize:12 }}>{fCHF(r.calc.grossTotal)}</div>
                          <div className="mono" style={{ fontWeight:800, color:'var(--green)', fontSize:12 }}>{fCHF(r.calc.netSalary)}</div>
                          <div className="mono" style={{ color:'var(--amber)', fontSize:12 }}>{fCHF(r.calc.totalEmployer)}</div>
                        </>
                      ) : <div/> }
                    </div>
                  ))}
                </div>

                <div style={{ marginTop:16, padding:'10px 14px', background:'var(--blued)', borderRadius:8, fontSize:11, color:'var(--blue)' }}>
                  ℹ Les bulletins PDF seront générés et accessibles individuellement après validation.
                </div>

                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
                  <button className="btn btn-g" onClick={onClose}>Annuler</button>
                  <button className="btn btn-p" onClick={runPayroll}
                    style={{ background:'var(--green)' }}>
                    ✅ Valider et générer {results.filter(r=>r.ok).length} bulletins
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === 'confirm' && (
          <div style={{ padding:32, textAlign:'center' }}>
            <Spinner size={36}/>
            <div style={{ fontWeight:700, fontSize:16, marginTop:16, marginBottom:8 }}>Génération en cours…</div>
            <div style={{ height:6, background:'var(--surf2)', borderRadius:3, marginBottom:8 }}>
              <div style={{ height:'100%', width:`${progress}%`, background:'var(--blue)', borderRadius:3, transition:'width .3s' }}/>
            </div>
            <div style={{ fontSize:12, color:'var(--tm)' }}>{progress}% · {Math.round(progress/100*results.filter(r=>r.ok).length)} / {results.filter(r=>r.ok).length} bulletins</div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:6 }}>Paie lancée avec succès !</div>
            <div style={{ fontSize:13, color:'var(--tm)', marginBottom:16 }}>
              {results.filter(r=>r.ok).length} bulletins générés pour {MONTH_NAMES[month-1]} {year}
            </div>
            {errors.length > 0 && (
              <div style={{ background:'var(--redd)', borderRadius:8, padding:'10px 14px', marginBottom:16, textAlign:'left' }}>
                <div style={{ fontWeight:700, color:'var(--red)', marginBottom:6 }}>⚠ {errors.length} erreur(s)</div>
                {errors.map((e,i) => <div key={i} style={{ fontSize:11, color:'var(--red)' }}>{e}</div>)}
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn btn-g" onClick={onClose}>Fermer</button>
              <button className="btn btn-p"
                onClick={() => window.open(`/api/exports/payslips.csv?year=${year}&month=${month}`, '_blank')}>
                📥 Exporter CSV AVS
              </button>
              <button className="btn btn-p" style={{ background:'var(--green)' }} onClick={onDone}>
                💳 Voir les bulletins →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Payroll() {
  const w = useW();
  const p = w < 600 ? '14px 12px' : '18px 26px';
  const [month, setMonth] = useState(MONTH);
  const [year, setYear]   = useState(YEAR);
  const [showRun, setShowRun] = useState(false);
  const sector = useSector();

  const { data: pD, loading, error, reload } = useApi(
    () => apiFetch(`/salary/payslips?year=${year}&month=${month}`), [year, month]
  );
  const { data: empD } = useApi(() => apiFetch('/employees'));
  const payslips  = pD?.payslips  || [];
  const employees = empD?.employees || [];
  const total     = payslips.reduce((s: number, p: any) => s + parseFloat(p.gross_salary||0), 0);
  const totalNet  = payslips.reduce((s: number, p: any) => s + parseFloat(p.net_salary||0), 0);

  const isCurrentMonth = month === MONTH && year === YEAR;

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Module Paie" sub="Bulletins · Validation mensuelle · PDF"
        actions={<>
          <button className="btn btn-g" style={{ fontSize:11 }}
            onClick={() => window.open(`/api/exports/payslips.csv?year=${year}&month=${month}`,'_blank')}>
            📤 Export CSV
          </button>
          {payslips.length === 0 && (
            <button className="btn btn-p" style={{ fontSize:11, background:'var(--green)' }}
              onClick={() => setShowRun(true)}>
              🚀 Lancer la paie
            </button>
          )}
        </>}
      />
      <div style={{ padding:p, display:'flex', flexDirection:'column', gap:14 }}>

        {/* Sélecteur période */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <select className="inp" style={{ width:130 }} value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTH_NAMES.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="inp" style={{ width:80 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {total > 0 && (
            <div style={{ display:'flex', gap:10, marginLeft:8, flexWrap:'wrap' }}>
              {[
                { l:'Brut total', v:fCHF(total),   c:'var(--blue)' },
                { l:'Net total',  v:fCHF(totalNet), c:'var(--green)' },
              ].map((k,i) => (
                <div key={i} style={{ padding:'5px 12px', background:'var(--surf)', border:'1px solid var(--b2)', borderRadius:7 }}>
                  <span style={{ fontSize:10, color:'var(--tm)', fontWeight:700 }}>{k.l}: </span>
                  <span className="mono" style={{ fontSize:13, fontWeight:900, color:k.c }}>{k.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <ApiState loading={loading} error={error}>
          {payslips.length === 0 ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>💳</div>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>Aucun bulletin pour {MONTH_NAMES[month-1]} {year}</div>
              <div style={{ fontSize:12, color:'var(--tm)', marginBottom:20 }}>
                {employees.length === 0
                  ? 'Commencez par ajouter des collaborateurs'
                  : `${employees.length} collaborateur(s) prêt(s) · Cliquez pour lancer la paie`
                }
              </div>
              {employees.length > 0 && (
                <button className="btn btn-p" style={{ fontSize:13, padding:'12px 24px', background:'var(--green)' }}
                  onClick={() => setShowRun(true)}>
                  🚀 Lancer la paie {MONTH_NAMES[month-1]}
                </button>
              )}
            </div>
          ) : (
            <div className="card">
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px 44px',
                gap:8, padding:'9px 16px', background:'var(--surf2)',
                borderBottom:'1px solid var(--b1)', borderRadius:'var(--r) var(--r) 0 0' }}>
                {['Employé','Brut','Net','Charges er.','Coût total','Statut','PDF'].map(h => (
                  <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--tm)' }}>{h}</div>
                ))}
              </div>
              {payslips.map((ps: any, i: number) => (
                <div key={ps.id} className="row" style={{ display:'grid',
                  gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px 44px',
                  gap:8, padding:'12px 16px', alignItems:'center',
                  animation:`slideUp .4s ${i*30}ms both` }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{ps.first_name} {ps.last_name}</div>
                  <div className="mono" style={{ fontWeight:800, color:'var(--blue)', fontSize:13 }}>{fCHF(ps.gross_salary)}</div>
                  <div className="mono" style={{ fontWeight:800, color:'var(--green)', fontSize:13 }}>{fCHF(ps.net_salary)}</div>
                  <div className="mono" style={{ fontSize:12, color:'var(--amber)' }}>{fCHF(ps.total_employer)}</div>
                  <div className="mono" style={{ fontWeight:800, fontSize:12 }}>{fCHF(ps.total_cost)}</div>
                  <span className={`badge s-${ps.status||'approved'}`}>{ps.status||'validé'}</span>
                  <button className="btn btn-g" style={{ padding:'4px 7px', fontSize:12 }} title="Télécharger PDF"
                    onClick={() => window.open(`/api/salary/payslip/${ps.id}/pdf`,'_blank')}>
                    📄
                  </button>
                </div>
              ))}
              {/* Total row */}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px 44px',
                gap:8, padding:'12px 16px', background:'var(--surf2)',
                borderTop:'2px solid var(--b2)', borderRadius:'0 0 var(--r) var(--r)' }}>
                <div style={{ fontWeight:800, fontSize:12 }}>TOTAL · {payslips.length} bulletins</div>
                <div className="mono" style={{ fontWeight:900, color:'var(--blue)' }}>{fCHF(total)}</div>
                <div className="mono" style={{ fontWeight:900, color:'var(--green)' }}>{fCHF(totalNet)}</div>
                <div/>
                <div className="mono" style={{ fontWeight:900 }}>{fCHF(payslips.reduce((s: number,p: any) => s+parseFloat(p.total_cost||0),0))}</div>
                <div/><div/>
              </div>
            </div>
          )}
        </ApiState>
      </div>

      {showRun && (
        <PayrollRunModal
          month={month} year={year}
          employees={employees.filter((e: any) => e.is_active)}
          sector={sector}
          onClose={() => setShowRun(false)}
          onDone={() => { setShowRun(false); reload(); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE: EMPLOYEES (câblé API + CRUD)
══════════════════════════════════════════════════════════ */

function EmpModal({ emp, onClose, onSaved }) {
  const isNew = !emp?.id;
  const [form, setForm] = useState(emp || {
    first_name:'', last_name:'', email:'', phone:'',
    birthdate:'', hire_date:'', contract_type:'CDI',
    permit_type:'CH', activity_rate:100, weekly_hours:42,
    salary_type:'monthly', salary_amount:'', department:'',
    position:'', vacation_weeks:5, avs_number:'',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const body = {
        firstName: form.first_name, lastName: form.last_name,
        email: form.email, phone: form.phone,
        birthdate: form.birthdate || null, hireDate: form.hire_date,
        contractType: form.contract_type, permitType: form.permit_type,
        permitExpiry: form.permit_expiry || null,
        activityRate: +form.activity_rate, weeklyHours: +form.weekly_hours,
        salaryType: form.salary_type, salaryAmount: +form.salary_amount,
        department: form.department, position: form.position,
        vacationWeeks: +form.vacation_weeks, avsNumber: form.avs_number,
      };
      if (isNew) await apiFetch('/employees', 'POST', body);
      else       await apiFetch(`/employees/${emp.id}`, 'PUT', body);
      onSaved();
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const F = ({ label, k, type='text', opts=null }) => (
    <div>
      <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>{label}</label>
      {opts ? (
        <select className="inp" value={form[k]||''} onChange={e => set(k, e.target.value)}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="inp" type={type} value={form[k]||''} onChange={e => set(k, e.target.value)}/>
      )}
    </div>
  );

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ padding:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:16 }}>{isNew ? '➕ Nouveau collaborateur' : `✏️ ${form.first_name} ${form.last_name}`}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--tm)' }}>×</button>
        </div>

        <div className="g2" style={{ gap:12, marginBottom:12 }}>
          <F label="Prénom *" k="first_name"/>
          <F label="Nom *" k="last_name"/>
          <F label="Email" k="email" type="email"/>
          <F label="Téléphone" k="phone"/>
          <F label="Date naissance" k="birthdate" type="date"/>
          <F label="Date entrée *" k="hire_date" type="date"/>
          <F label="Contrat" k="contract_type" opts={['CDI','CDD','Horaire','Stage','Apprentissage']}/>
          <F label="Permis" k="permit_type" opts={['CH','C','B','G','L','F','N']}/>
          <F label="Expiry permis" k="permit_expiry" type="date"/>
          <F label="Taux activité %" k="activity_rate" type="number"/>
          <F label="Heures/sem" k="weekly_hours" type="number"/>
          <F label="Type salaire" k="salary_type" opts={['monthly','hourly']}/>
          <F label="Salaire CHF" k="salary_amount" type="number"/>
          <F label="Département" k="department"/>
          <F label="Poste" k="position"/>
          <F label="Semaines vacances" k="vacation_weeks" opts={['4','5','6']}/>
          <F label="N° AVS" k="avs_number"/>
        </div>

        {err && <div style={{ color:'var(--red)', fontSize:11, marginBottom:10 }}>⚠ {err}</div>}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-g" onClick={onClose}>Annuler</button>
          <button className="btn btn-p" onClick={save} disabled={saving}>
            {saving ? <Spinner size={14}/> : (isNew ? '✅ Créer' : '💾 Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Employees() {
  const w = useW();
  const [q, setQ]     = useState('');
  const [sel, setSel] = useState(null);
  const [modal, setModal] = useState(null); // null | 'new' | emp obj
  const p = w < 600 ? '14px 12px' : '18px 26px';

  const { data, loading, error, reload } = useApi(() => apiFetch('/employees'));
  const employees = (data?.employees || []).filter(e =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(q.toLowerCase()) ||
    (e.department||'').toLowerCase().includes(q.toLowerCase())
  );

  const del = async (id) => {
    if (!confirm('Désactiver ce collaborateur ?')) return;
    await apiFetch(`/employees/${id}`, 'DELETE');
    reload();
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Topbar title="Collaborateurs"
        sub={loading ? 'Chargement…' : `${employees.length} / ${data?.employees?.length || 0} affiché(s)`}
        actions={<button className="btn btn-p" style={{ fontSize:11 }} onClick={() => setModal('new')}>+ Nouveau</button>}/>

      <div style={{ flex:1, overflowY:'auto', padding:p, paddingBottom: w < 768 ? 80 : undefined }}>
        <div style={{ position:'relative', marginBottom:12 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tm)' }}>🔍</span>
          <input className="inp" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft:34 }}/>
        </div>

        <ApiState loading={loading} error={error}>
          {w < 700 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }} className="stg">
              {employees.map(emp => (
                <div key={emp.id} className="card" style={{ padding:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--blued)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, fontWeight:900, color:'var(--blue)', flexShrink:0 }}>
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{emp.first_name} {emp.last_name}</div>
                      <div style={{ fontSize:11, color:'var(--tm)' }}>{emp.department} · {emp.contract_type}</div>
                    </div>
                    <span className={`badge p-${emp.permit_type}`}>{emp.permit_type}</span>
                  </div>
                  <div className="g2" style={{ gap:8 }}>
                    <div style={{ background:'var(--surf2)', borderRadius:7, padding:'8px 10px' }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--tm)' }}>Salaire</div>
                      <div className="mono" style={{ fontSize:17, fontWeight:900, color:'var(--blue)', marginTop:3 }}>
                        {emp.salary_type === 'hourly' ? `${fmt(emp.salary_amount,2)}/h` : fmt(emp.salary_amount,0)}
                        <span style={{ fontSize:10, color:'var(--tm)', fontWeight:400 }}> CHF</span>
                      </div>
                    </div>
                    <div style={{ background:'var(--surf2)', borderRadius:7, padding:'8px 10px' }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--tm)' }}>Activité</div>
                      <div className="mono" style={{ fontSize:17, fontWeight:800, color:'var(--blue)', marginTop:6 }}>{emp.activity_rate}%</div>
                    </div>
                  </div>
                  {emp.permit_expiring_soon && (
                    <div style={{ marginTop:8, padding:'6px 10px', background:'var(--amberd)', borderRadius:6, fontSize:10, color:'var(--amber)', fontWeight:700 }}>
                      ⚠ Permis expire bientôt
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6, marginTop:10 }}>
                    <button className="btn btn-g" style={{ fontSize:10, flex:1 }} onClick={() => setModal(emp)}>✏️ Modifier</button>
                    <button className="btn btn-ko" style={{ fontSize:10 }} onClick={() => del(emp.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 80px 130px 100px 80px',
                gap:10, padding:'9px 16px', background:'var(--surf2)',
                borderBottom:'1px solid var(--b1)', borderRadius:'var(--r) var(--r) 0 0' }}>
                {['Collaborateur','Département','Contrat','Permis','Salaire CHF','Activité',''].map(h => (
                  <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--tm)' }}>{h}</div>
                ))}
              </div>
              {employees.map((emp, i) => (
                <div key={emp.id} className="row" style={{ display:'grid',
                  gridTemplateColumns:'2fr 1fr 1fr 80px 130px 100px 80px',
                  gap:10, padding:'12px 16px', alignItems:'center',
                  animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i*30}ms both`,
                  cursor:'pointer' }} onClick={() => setSel(sel?.id === emp.id ? null : emp)}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--blued)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:900, color:'var(--blue)', flexShrink:0 }}>
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700 }}>{emp.first_name} {emp.last_name}</div>
                      {emp.permit_expiring_soon && <div style={{ fontSize:9, color:'var(--amber)' }}>⚠ Permis expire bientôt</div>}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{emp.department || '—'}</div>
                  <span className="badge" style={{ background:'var(--blued)', color:'var(--blue)' }}>{emp.contract_type}</span>
                  <span className={`badge p-${emp.permit_type}`}>{emp.permit_type}</span>
                  <div className="mono" style={{ fontSize:13, fontWeight:800 }}>
                    {emp.salary_type === 'hourly' ? `${fmt(emp.salary_amount,2)}/h` : fmt(emp.salary_amount,0)}
                  </div>
                  <div>
                    <div className="prog"><div className="prog-f" style={{ width:`${emp.activity_rate}%` }}/></div>
                    <div style={{ fontSize:10, color:'var(--tm)', marginTop:2 }}>{emp.activity_rate}%</div>
                  </div>
                  <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-g" style={{ padding:'4px 8px', fontSize:10 }} onClick={() => setModal(emp)}>✏️</button>
                    <button className="btn btn-ko" style={{ padding:'4px 8px', fontSize:10 }} onClick={() => del(emp.id)}>🗑</button>
                  </div>
                </div>
              ))}
              {employees.length === 0 && !loading && (
                <div style={{ padding:32, textAlign:'center', color:'var(--tm)', fontSize:13 }}>
                  {q ? 'Aucun résultat' : 'Aucun collaborateur — cliquez + Nouveau'}
                </div>
              )}
            </div>
          )}

          {sel && w >= 700 && (
            <div className="card" style={{ marginTop:12, padding:18, animation:'scaleIn .25s cubic-bezier(.16,1,.3,1)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:14 }}>{sel.first_name} {sel.last_name}</div>
                <button onClick={() => setSel(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--tm)' }}>×</button>
              </div>
              <div className="g4" style={{ gap:10 }}>
                {[
                  ['Département', sel.department||'—'], ['Contrat', sel.contract_type],
                  ['Permis', sel.permit_type], ['Taux', `${sel.activity_rate}%`],
                  ['Âge', `${sel.age ?? '—'} ans`], ['Embauché(e)', fDate(sel.hire_date)],
                  ['Salaire', sel.salary_type==='hourly' ? `${fmt(sel.salary_amount,2)} CHF/h` : `${fmt(sel.salary_amount,0)} CHF/m`],
                  ['AVS', sel.avs_masked || sel.avs_number || '—'],
                  ['Email', sel.email||'—'], ['Poste', sel.position||'—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding:'10px 12px', background:'var(--surf2)', borderRadius:8 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em', color:'var(--tm)', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:700, wordBreak:'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ApiState>
      </div>

      {modal && <EmpModal
        emp={modal === 'new' ? null : modal}
        onClose={() => setModal(null)}
        onSaved={() => { setModal(null); reload(); }}
      />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE: ABSENCES (câblé API + approve/reject)
══════════════════════════════════════════════════════════ */

function Absences() {
  const w = useW();
  const [f, setF] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const p = w < 600 ? '14px 12px' : '18px 26px';
  const COLORS = { 'Vacances':'#10b981','vacation':'#10b981','Maladie':'#ef4444','illness':'#ef4444','Accident NP':'#f59e0b','accident_np':'#f59e0b','Famille':'#3176A6','family':'#3176A6','Militaire':'#8b5cf6','military':'#8b5cf6' };

  const { data, loading, error, reload } = useApi(() => apiFetch('/absences'));
  const { data: vacD } = useApi(() => apiFetch(`/absences/vacation/balances?year=${YEAR}`));
  const { data: empD } = useApi(() => apiFetch('/employees'));

  const all = data?.absences || [];
  const pending = all.filter(a => a.status === 'pending');
  const list = f === 'all' ? all : all.filter(a => a.status === f);
  const vac  = (vacD?.balances || []).slice(0, 8);

  const approve = async (id) => { await apiFetch(`/absences/${id}/approve`, 'PUT'); reload(); };
  const reject  = async (id) => { await apiFetch(`/absences/${id}/reject`, 'PUT', { reason: 'Refusé' }); reload(); };

  const fTypeLabel = (t) => ({ vacation:'Vacances', illness:'Maladie', accident_np:'Acc. NP', accident_p:'Acc. P', family:'Famille', military:'Militaire' })[t] || t;

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Gestion des absences" sub="Congés · Maladie · Accidents · APG"
        actions={<button className="btn btn-p" style={{ fontSize:11 }} onClick={() => setShowNew(true)}>+ Nouvelle</button>}/>
      <div style={{ padding:p, display:'flex', flexDirection:'column', gap:14 }}>

        <div className="tabs">
          {[['all','Tout'],[`pending`,`En attente (${pending.length})`],['approved','Approuvé'],['rejected','Refusé']].map(([v, l]) => (
            <button key={v} className={`tab${f === v ? ' on' : ''}`} onClick={() => setF(v)}>{l}</button>
          ))}
        </div>

        <ApiState loading={loading} error={error}>
          <div className="gabs">
            <div className="card stg">
              {list.length === 0 ? (
                <div style={{ padding:32, textAlign:'center', color:'var(--tm)', fontSize:13 }}>Aucune absence</div>
              ) : list.map((a, i) => {
                const col = COLORS[a.absence_type] || 'var(--blue)';
                return (
                  <div key={a.id} className="row" style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px' }}>
                    <div style={{ width:3, alignSelf:'stretch', borderRadius:2, flexShrink:0, background:col }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2 }}>
                        <span style={{ fontWeight:700, fontSize:13 }}>{a.first_name} {a.last_name}</span>
                        <span className="badge" style={{ background:col+'1a', color:col, fontSize:8 }}>{fTypeLabel(a.absence_type)}</span>
                      </div>
                      <div style={{ fontSize:10, color:'var(--tm)' }}>
                        {fDate(a.start_date)} → {fDate(a.end_date)} · <strong>{a.days_count}j</strong>
                        {a.reason && ` · ${a.reason}`}
                      </div>
                    </div>
                    <StatusBadge s={a.status}/>
                    {a.status === 'pending' && (
                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        <button className="btn btn-ok" onClick={() => approve(a.id)}>✓</button>
                        <button className="btn btn-ko" onClick={() => reject(a.id)}>✗</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ padding:16 }}>
              <SH>Soldes vacances {YEAR}</SH>
              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                {vac.length === 0 ? <div style={{ fontSize:11, color:'var(--tm)' }}>Aucun solde</div>
                : vac.map((v, i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                      <span style={{ fontWeight:600 }}>{v.first_name} {v.last_name?.charAt(0)}.</span>
                      <span className="mono" style={{ fontWeight:800, color: v.balance_days < 5 ? 'var(--red)' : 'var(--blue)' }}>{v.balance_days}j</span>
                    </div>
                    <div className="prog">
                      <div className="prog-f" style={{ width:`${Math.min(100,(v.taken_days/v.entitled_days)*100)||0}%`,
                        background: v.balance_days < 5 ? 'var(--red)' : 'var(--blue)' }}/>
                    </div>
                    <div style={{ fontSize:9, color:'var(--tm)', marginTop:1 }}>{v.taken_days}/{v.entitled_days}j</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ApiState>
      </div>

      {showNew && <NewAbsenceModal
        employees={empD?.employees || []}
        onClose={() => setShowNew(false)}
        onSaved={() => { setShowNew(false); reload(); }}
      />}
    </div>
  );
}

function NewAbsenceModal({ employees, onClose, onSaved }) {
  const [form, setForm] = useState({ employee_id:'', absence_type:'vacation', start_date:'', end_date:'', reason:'' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({...f, [k]:v}));

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/absences', 'POST', form);
      onSaved();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ padding:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:16 }}>🏖 Nouvelle absence</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--tm)' }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['Collaborateur','employee_id','sel'], ['Type','absence_type','type'], ['Début','start_date','date'], ['Fin','end_date','date'], ['Remarque','reason','text']].map(([lbl, k, type]) => (
            <div key={k}>
              <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>{lbl}</label>
              {type === 'sel' ? (
                <select className="inp" value={form[k]} onChange={e => set(k, e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              ) : type === 'type' ? (
                <select className="inp" value={form[k]} onChange={e => set(k, e.target.value)}>
                  {[['vacation','Vacances'],['illness','Maladie'],['accident_np','Accident NP'],['accident_p','Accident P'],['family','Famille'],['military','Militaire']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input className="inp" type={type === 'date' ? 'date' : 'text'} value={form[k]||''} onChange={e => set(k, e.target.value)}/>
              )}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
          <button className="btn btn-g" onClick={onClose}>Annuler</button>
          <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? <Spinner size={14}/> : '✅ Créer'}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE: RAPPORTS (exports AVS, Lohnausweis)
══════════════════════════════════════════════════════════ */
function Reports() {
  const w = useW();
  const p = w < 600 ? '14px 12px' : '18px 26px';
  const [year, setYear] = useState(YEAR);
  const { data: avsD, loading } = useApi(() => apiFetch(`/reports/avs?year=${year}`), [year]);
  const rows = avsD?.declarations || [];

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Rapports & Exports" sub="AVS · Lohnausweis · IS cantonaux"/>
      <div style={{ padding:p, display:'flex', flexDirection:'column', gap:14 }}>

        <div className="g3">
          {[
            { icon:'🏦', title:'Déclaration AVS', desc:`Masse salariale ${year} — export CSV`, action: () => window.open(`/api/exports/avs.csv?year=${year}`, '_blank'), color:'var(--blue)' },
            { icon:'📋', title:'Lohnausweis', desc:'Certificat de salaire 15 cases', action: () => alert('PDF Lohnausweis — bientôt disponible'), color:'var(--purple)' },
            { icon:'👥', title:'Export employés', desc:'Liste complète — données RH', action: () => window.open('/api/exports/employees.csv', '_blank'), color:'var(--green)' },
          ].map((r, i) => (
            <div key={i} className="card" style={{ padding:20, cursor:'pointer', transition:'box-shadow .2s' }}
              onClick={r.action}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
              <div style={{ fontSize:28, marginBottom:10 }}>{r.icon}</div>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>{r.title}</div>
              <div style={{ fontSize:11, color:'var(--tm)', marginBottom:14 }}>{r.desc}</div>
              <button className="btn btn-p" style={{ fontSize:11, background:r.color }}>📥 Télécharger</button>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontWeight:700, fontSize:14, flex:1 }}>📊 Base AVS {year}</div>
            <select className="inp" style={{ width:80 }} value={year} onChange={e => setYear(+e.target.value)}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <ApiState loading={loading} error={null}>
            {rows.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:'var(--tm)' }}>Aucune donnée pour {year}</div>
            ) : rows.map((r, i) => (
              <div key={i} className="row" style={{ display:'grid',
                gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',
                gap:10, padding:'12px 18px', alignItems:'center' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{r.first_name} {r.last_name}</div>
                <div style={{ fontSize:11, color:'var(--tm)', fontFamily:'var(--mono)' }}>{r.avs_number || '—'}</div>
                <div className="mono" style={{ fontWeight:800 }}>{fCHF(r.annual_gross)}</div>
                <div className="mono" style={{ color:'var(--blue)' }}>{fCHF(r.avs_employee_total)}</div>
                <div className="mono" style={{ color:'var(--amber)' }}>{fCHF(r.avs_employer_total)}</div>
              </div>
            ))}
          </ApiState>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE: SETTINGS (paramètres entreprise)
══════════════════════════════════════════════════════════ */
function Settings() {
  const w = useW();
  const p = w < 600 ? '14px 12px' : '18px 26px';
  const { data, loading, reload } = useApi(() => apiFetch('/company'));
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data?.company) setForm(data.company); }, [data]);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/company', 'PUT', form);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      reload();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const F = ({ label, k, type='text', opts=null }) => !form ? null : (
    <div>
      <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>{label}</label>
      {opts ? (
        <select className="inp" value={form[k]||''} onChange={e => set(k, e.target.value)}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="inp" type={type} value={form[k]||''} onChange={e => set(k, e.target.value)}/>
      )}
    </div>
  );

  const CANTONS = ['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'];

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Paramètres entreprise" sub="Configuration · Assurances · Jours fériés"/>
      <div style={{ padding:p, display:'flex', flexDirection:'column', gap:14 }}>
        <ApiState loading={loading} error={null}>
          {form && (
            <>
              {/* Secteur d'activité */}
              <div className="card" style={{ padding:20, marginBottom:0 }}>
                <SH>🏭 Secteur d'activité</SH>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {Object.entries(SECTOR_PROFILES).map(([key, s]) => (
                    <div key={key}
                      style={{
                        padding:'12px 14px', borderRadius:9, cursor:'pointer',
                        border:`2px solid ${form?.sector === key ? s.color : 'var(--b2)'}`,
                        background: form?.sector === key ? `${s.color}12` : 'var(--surf)',
                        transition:'all .2s',
                      }}
                      onClick={() => set('sector', key)}>
                      <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                      <div style={{ fontSize:11, fontWeight:700, lineHeight:1.3 }}>{s.label}</div>
                      {key === 'restaurant' && <div style={{ fontSize:9, color:'var(--tm)', marginTop:4 }}>DEXTRA · CCT · Pourboires</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding:20 }}>
                <SH>🏢 Informations entreprise</SH>
                <div className="g2" style={{ gap:12 }}>
                  <F label="Raison sociale" k="name"/>
                  <F label="Forme juridique" k="legal_form" opts={['Sàrl','SA','Raison individuelle','Association','Fondation']}/>
                  <F label="N° IDE (CHE-xxx)" k="uid"/>
                  <F label="Canton" k="canton" opts={CANTONS}/>
                  <F label="Adresse" k="address"/>
                  <F label="NPA" k="npa"/>
                  <F label="Ville" k="city"/>
                  <F label="N° caisse AVS" k="avs_number"/>
                  <F label="N° institution LPP" k="lpp_number"/>
                  <F label="N° police LAA" k="laa_number"/>
                </div>
              </div>

              <div className="card" style={{ padding:20 }}>
                <SH>📊 Taux d'assurance</SH>
                <div className="g4" style={{ gap:12 }}>
                  {[
                    ['LAA NP (%)', 'laa_np_rate'],
                    ['LAA P (%)', 'laa_p_rate'],
                    ['IJM total (%)', 'ijm_rate'],
                    ['All. familiales (%)', 'fam_alloc'],
                  ].map(([l, k]) => (
                    <div key={k}>
                      <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>{l}</label>
                      <input className="inp" type="number" step="0.001" min="0" max="0.5"
                        value={((form[k]||0)*100).toFixed(3)}
                        onChange={e => set(k, parseFloat(e.target.value)/100)}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                {saved && <div style={{ padding:'8px 14px', background:'var(--greend)', borderRadius:8, fontSize:12, color:'var(--green)', fontWeight:700 }}>✅ Enregistré</div>}
                <button className="btn btn-p" onClick={save} disabled={saving}>
                  {saving ? <Spinner size={14}/> : '💾 Enregistrer'}
                </button>
              </div>
            </>
          )}
        </ApiState>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE: VACATIONS (soldes vacances)
══════════════════════════════════════════════════════════ */
function Vacations() {
  const w = useW();
  const p = w < 600 ? '14px 12px' : '18px 26px';
  const [year, setYear] = useState(YEAR);
  const { data, loading, error } = useApi(
    () => apiFetch(`/absences/vacation/balances?year=${year}`), [year]
  );
  const balances = data?.balances || [];

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom: w < 768 ? 68 : 0 }}>
      <Topbar title="Soldes Vacances" sub="Droits · Pris · Soldes · Pro-rata"
        actions={
          <select className="inp" style={{ width:80 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        }/>
      <div style={{ padding:p, display:'flex', flexDirection:'column', gap:14 }}>
        <ApiState loading={loading} error={error}>
          {balances.length === 0 ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🏖</div>
              <div style={{ fontWeight:700, fontSize:15 }}>Aucun solde pour {year}</div>
            </div>
          ) : (
            <>
              <div className="g4">
                {[
                  { l:'Total droit', v: balances.reduce((s,b) => s + (b.entitled_days||0), 0), icon:'📅', c:'var(--blue)' },
                  { l:'Pris', v: balances.reduce((s,b) => s + (b.taken_days||0), 0), icon:'✅', c:'var(--green)' },
                  { l:'Solde total', v: balances.reduce((s,b) => s + (b.balance_days||0), 0), icon:'🏖', c:'var(--amber)' },
                  { l:'Alerte > 20j', v: balances.filter(b => b.balance_days > 20).length, icon:'⚠', c:'var(--red)', isNum:true },
                ].map((k, i) => <KpiCard key={i} label={k.l} value={k.v} sub={k.isNum ? 'employés' : 'jours'} color={k.c} icon={k.icon} isNum={k.isNum} delay={i*60}/>)}
              </div>

              <div className="card">
                <div style={{ display:'grid', gridTemplateColumns:'2fr 80px 80px 80px 80px 120px',
                  gap:10, padding:'9px 16px', background:'var(--surf2)',
                  borderBottom:'1px solid var(--b1)', borderRadius:'var(--r) var(--r) 0 0' }}>
                  {['Collaborateur','Droit','Pris','Solde','Report','Statut'].map(h => (
                    <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', color:'var(--tm)' }}>{h}</div>
                  ))}
                </div>
                {balances.map((b, i) => (
                  <div key={i} className="row" style={{ display:'grid',
                    gridTemplateColumns:'2fr 80px 80px 80px 80px 120px',
                    gap:10, padding:'12px 16px', alignItems:'center',
                    animation:`slideUp .4s ${i*30}ms both` }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{b.first_name} {b.last_name}</div>
                    <div className="mono" style={{ fontWeight:800 }}>{b.entitled_days}j</div>
                    <div className="mono" style={{ color:'var(--green)' }}>{b.taken_days}j</div>
                    <div className="mono" style={{ fontWeight:900,
                      color: b.balance_days < 5 ? 'var(--red)' : b.balance_days > 20 ? 'var(--amber)' : 'var(--blue)' }}>
                      {b.balance_days}j
                    </div>
                    <div className="mono" style={{ fontSize:12, color:'var(--tm)' }}>{b.carried_over||0}j</div>
                    <div>
                      <div className="prog">
                        <div className="prog-f" style={{ width:`${Math.min(100,(b.taken_days/b.entitled_days)*100)||0}%`,
                          background: b.balance_days < 5 ? 'var(--red)' : b.balance_days > 20 ? 'var(--amber)' : 'var(--blue)' }}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ApiState>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PLACEHOLDER (modules futurs)
══════════════════════════════════════════════════════════ */
function Placeholder({ icon, title, desc }) {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40, maxWidth:360 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>{icon}</div>
        <div style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:13, color:'var(--tm)', lineHeight:1.7 }}>{desc}</div>
        <div style={{ marginTop:16, padding:'8px 14px', background:'var(--amberd)', borderRadius:8,
          fontSize:11, color:'var(--amber)', fontWeight:700 }}>🚧 En développement</div>
      </div>
    </div>
  );
}


/* ══ SETUP WIZARD (1er démarrage) ═══════════════════════ */
function SetupWizard({ onDone }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName:'', canton:'JU', email:'', password:'', confirm:''
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const CANTONS = ['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'];

  const finish = async () => {
    if (form.password !== form.confirm) { setErr('Les mots de passe ne correspondent pas'); return; }
    if (form.password.length < 8) { setErr('Mot de passe : 8 caractères minimum'); return; }
    setSaving(true); setErr('');
    try {
      await apiFetch('/auth/setup', 'POST', {
        email: form.email, password: form.password,
        companyName: form.companyName, canton: form.canton,
      });
      onDone();
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const F = ({ label, k, type='text', opts=null }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>{label}</label>
      {opts ? (
        <select className="inp" value={form[k]||''} onChange={e=>set(k,e.target.value)}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="inp" type={type} value={form[k]||''} onChange={e=>set(k,e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&step===2&&finish()}/>
      )}
    </div>
  );

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:16 }}>
      <div className="card" style={{ width:'100%', maxWidth:460, padding:36 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <SwissRHLogo height={44}/>
          <div style={{ fontSize:13, fontWeight:700, marginTop:12, marginBottom:4 }}>Configuration initiale</div>
          <div style={{ fontSize:11, color:'var(--tm)' }}>Étape {step} / 2</div>
          <div style={{ display:'flex', gap:4, justifyContent:'center', marginTop:10 }}>
            {[1,2].map(s=>(
              <div key={s} style={{ height:3, width:60, borderRadius:2,
                background: s<=step ? 'var(--blue)' : 'var(--surf2)', transition:'background .3s' }}/>
            ))}
          </div>
        </div>

        {step === 1 ? (
          <>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>🏢 Votre entreprise</div>
            <F label="Raison sociale *" k="companyName"/>
            <F label="Canton" k="canton" opts={CANTONS}/>
            <button className="btn btn-p" style={{ width:'100%', justifyContent:'center', padding:'10px 0' }}
              onClick={() => { if(!form.companyName.trim()) { setErr('Raison sociale requise'); return; } setErr(''); setStep(2); }}>
              Suivant →
            </button>
          </>
        ) : (
          <>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>👤 Compte administrateur</div>
            <F label="Email *" k="email" type="email"/>
            <F label="Mot de passe *" k="password" type="password"/>
            <F label="Confirmer *" k="confirm" type="password"/>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-g" style={{ flex:1 }} onClick={() => { setErr(''); setStep(1); }}>← Retour</button>
              <button className="btn btn-p" style={{ flex:2, justifyContent:'center' }}
                onClick={finish} disabled={saving}>
                {saving ? <Spinner size={14}/> : '🚀 Créer mon compte'}
              </button>
            </div>
          </>
        )}

        {err && <div style={{ color:'var(--red)', fontSize:12, marginTop:10 }}>⚠ {err}</div>}
        <div style={{ marginTop:16, textAlign:'center', fontSize:10, color:'var(--tm)' }}>
          Neukomm Group · WW Finance Group Sàrl
        </div>
      </div>
    </div>
  );
}

/* ══ LOGIN ══════════════════════════════════════════════ */
function Login({ onLogin, onSetup }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd]     = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !pwd) { setErr('Email et mot de passe requis'); return; }
    setLoading(true); setErr('');
    try {
      const res = await apiFetch('/auth/login', 'POST', { email, password: pwd });
      onLogin(res.user);
    } catch(e:any) {
      // Si pas d'utilisateurs → rediriger vers setup
      if (e.message?.includes('setup') || e.message?.includes('introuvable')) {
        onSetup?.();
      } else {
        setErr(e.message || 'Identifiants incorrects');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:16 }}>
      <div className="card" style={{ width:'100%', maxWidth:380, padding:36 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <SwissRHLogo height={44}/>
          <div style={{ fontSize:12, color:'var(--tm)', marginTop:8 }}>Plateforme RH Suisse</div>
        </div>
        {[
          ['Email','email','email',email,(v:string)=>setEmail(v)],
          ['Mot de passe','password','password',pwd,(v:string)=>setPwd(v)]
        ].map(([lbl,type,id,val,fn]:any) => (
          <div key={id} style={{ marginBottom:14 }}>
            <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--tm)', display:'block', marginBottom:4 }}>{lbl}</label>
            <input className="inp" id={id} type={type} value={val}
              onChange={e=>fn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          </div>
        ))}
        {err && <div style={{ color:'var(--red)', fontSize:12, marginBottom:10 }}>⚠ {err}</div>}
        <button className="btn btn-p" style={{ width:'100%', justifyContent:'center', padding:'10px 0', fontSize:13 }}
          onClick={submit} disabled={loading}>
          {loading ? <Spinner size={16}/> : '🔐 Se connecter'}
        </button>
        <div style={{ marginTop:16, textAlign:'center', fontSize:11, color:'var(--tm)' }}>
          Neukomm Group · WW Finance Group Sàrl
        </div>
      </div>
    </div>
  );
}

/* ══ APP ROOT — session persistante + /auth/me ══════════ */
export default function App() {
  const [authState, setAuthState] = useState<'loading'|'setup'|'login'|'ok'>('loading');
  const [user, setUser]    = useState<any>(null);
  const [page, setPage]    = useState('dashboard');
  const [menu, setMenu]    = useState(false);
  const w = useW();

  // Au démarrage : tenter /auth/me (session cookie existant)
  // puis /auth/setup check
  useEffect(() => {
    apiFetch('/auth/me')
      .then(r => { setUser(r.user); setAuthState('ok'); })
      .catch(async () => {
        // Vérifier si setup nécessaire
        try {
          const r = await apiFetch('/auth/setup-check');
          setAuthState(r.needsSetup ? 'setup' : 'login');
        } catch { setAuthState('login'); }
      });
  }, []);

  if (authState === 'loading') return (
    <><style>{CSS}</style>
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
        <div style={{ textAlign:'center' }}>
          <SwissRHLogo height={44}/>
          <div style={{ marginTop:16 }}><Spinner size={24}/></div>
        </div>
      </div>
    </>
  );

  if (authState === 'setup') return (
    <><style>{CSS}</style>
      <SetupWizard onDone={() => setAuthState('login')}/>
    </>
  );

  if (authState === 'login') return (
    <><style>{CSS}</style>
      <Login
        onLogin={(u) => { setUser(u); setAuthState('ok'); }}
        onSetup={() => setAuthState('setup')}
      />
    </>
  );

  const logout = async () => {
    await apiFetch('/auth/logout', 'POST');
    setUser(null); setAuthState('login');
  };

  const PAGES = {
    dashboard: <Dashboard user={user}/>,
    employees: <Employees/>,
    salary:    <SalaryCalc/>,
    absences:  <Absences/>,
    time:      <TimeTracking/>,
    payroll:   <Payroll/>,
    vacations: <Vacations/>,
    reports:   <Reports/>,
    settings:  <Settings/>,
    documents: <Placeholder icon="📄" title="Documents RH" desc="Contrats CO 330a, attestations, certificats de travail."/>,
  };

  return (
    <><style>{CSS}</style>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
        <Sidebar page={page} setPage={setPage} open={menu} setOpen={setMenu} user={user} onLogout={logout}/>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
          {PAGES[page] ?? <Dashboard user={user}/>}
        </div>
      </div>
    </>
  );
}

export { App as AppShell };
