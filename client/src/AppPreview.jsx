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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;font-family:'Outfit',sans-serif;background:#F3F5F9;color:#1a2332;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}

/* ══ WinWin V2 — LIGHT THEME (identique au dashboard clients) ══ */
:root{
  --bg-void:#F3F5F9;
  --bg-deep:#EBF0F5;
  --bg-surface:#FFFFFF;
  --bg-hover:rgba(49,118,166,.06);

  --border-subtle:rgba(0,0,0,.05);
  --border-default:rgba(0,0,0,.10);
  --border-glow:rgba(49,118,166,.25);

  --text-primary:#1a2332;
  --text-secondary:#5a6578;
  --text-muted:#94a3b8;

  --accent-cyan:#3176A6;
  --accent-cyan-dim:rgba(49,118,166,.10);
  --accent-amber:#f59e0b;
  --accent-amber-dim:rgba(245,158,11,.10);
  --accent-green:#10b981;
  --accent-green-dim:rgba(16,185,129,.10);
  --accent-pink:#ef4444;
  --accent-pink-dim:rgba(239,68,68,.10);
  --accent-purple:#8b5cf6;
  --accent-purple-dim:rgba(139,92,246,.10);

  /* Sidebar — seul élément sombre, comme WinWin V2 */
  --sidebar-bg:#1a2332;
  --sidebar-text:#c8d0dc;
  --sidebar-text-muted:#6b7a8d;
  --sidebar-hover:rgba(255,255,255,.06);
  --sidebar-active:rgba(49,118,166,.25);
  --sidebar-accent:#5BA4D9;

  /* SwissRH brand colors */
  --brand-red:#B32D26;
  --brand-blue:#366389;

  --font-display:'Outfit',sans-serif;
  --font-mono:'JetBrains Mono',monospace;
  --radius:12px;--radius-sm:8px;--radius-lg:16px;
}

/* ── ANIMATIONS (WinWin V2) ── */
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

.au{animation:slideUp .5s cubic-bezier(.16,1,.3,1) both}
.af{animation:fadeIn .4s ease both}

/* Stagger WinWin V2 */
.stg>*{opacity:0;animation:slideUp .5s cubic-bezier(.16,1,.3,1) both}
.stg>*:nth-child(1){animation-delay:.03s}.stg>*:nth-child(2){animation-delay:.06s}
.stg>*:nth-child(3){animation-delay:.09s}.stg>*:nth-child(4){animation-delay:.12s}
.stg>*:nth-child(5){animation-delay:.15s}.stg>*:nth-child(6){animation-delay:.18s}
.stg>*:nth-child(7){animation-delay:.21s}.stg>*:nth-child(8){animation-delay:.24s}

/* ── CARD ── */
.card{
  background:var(--bg-surface);
  border:1px solid var(--border-default);
  border-radius:var(--radius);
  color:var(--text-primary);
}
.card-lift{transition:all .25s cubic-bezier(.16,1,.3,1)}
.card-lift:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(49,118,166,.08),0 2px 8px rgba(0,0,0,.04)}

/* ── KPI CARD (WinWin style) ── */
.kpi{position:relative;overflow:hidden;transition:all .3s cubic-bezier(.16,1,.3,1)}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:var(--kc,var(--accent-cyan));opacity:0;transition:opacity .3s}
.kpi:hover{border-color:var(--border-default);box-shadow:0 4px 20px rgba(0,0,0,.08)}
.kpi:hover::before{opacity:1}

/* ── GLASS ── */
.glass{background:rgba(255,255,255,.75);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid rgba(0,0,0,.06);border-radius:var(--radius)}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--radius-sm);
  font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:var(--font-display);
  transition:all .2s;white-space:nowrap}
.btn-p{background:var(--accent-cyan);color:#fff}
.btn-p:hover{filter:brightness(1.08);transform:translateY(-1px);box-shadow:0 4px 14px rgba(49,118,166,.3)}
.btn-g{background:transparent;color:var(--text-secondary);border:1px solid var(--border-default)}
.btn-g:hover{background:var(--bg-deep);color:var(--text-primary)}
.btn-ok{background:var(--accent-green);color:#fff;padding:5px 10px;font-size:11px;border-radius:6px}
.btn-ko{background:var(--accent-pink);color:#fff;padding:5px 10px;font-size:11px;border-radius:6px}

/* ── INPUTS ── */
.inp{width:100%;background:var(--bg-surface);border:1px solid var(--border-default);
  border-radius:var(--radius-sm);padding:9px 12px;color:var(--text-primary);
  font-family:var(--font-display);font-size:13px;outline:none;transition:all .2s}
.inp:focus{border-color:var(--accent-cyan);box-shadow:0 0 0 3px var(--accent-cyan-dim)}
.inp::placeholder{color:var(--text-muted)}
select.inp{appearance:auto;cursor:pointer}

/* ── MONO ── */
.mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}

/* ── BADGES ── */
.badge{font-size:.7rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
  padding:3px 8px;border-radius:6px;white-space:nowrap;flex-shrink:0}
/* Status */
.s-approved{background:var(--accent-green-dim);color:#059669}
.s-pending{background:var(--accent-amber-dim);color:#d97706}
.s-rejected{background:var(--accent-pink-dim);color:#dc2626}
.s-cancelled{background:var(--bg-deep);color:var(--text-muted)}
/* Permit */
.p-CH,.p-C{background:var(--accent-green-dim);color:#059669}
.p-B{background:var(--accent-amber-dim);color:#d97706}
.p-G{background:var(--accent-cyan-dim);color:var(--accent-cyan)}
.p-L{background:var(--accent-purple-dim);color:#7c3aed}
.p-F{background:var(--accent-pink-dim);color:#dc2626}

/* ── TABLE ROWS ── */
.row{border-bottom:1px solid var(--border-subtle);transition:background .15s}
.row:hover{background:var(--bg-hover)}

/* ── PROGRESS ── */
.prog{height:5px;background:var(--bg-deep);border-radius:3px;overflow:hidden}
.prog-f{height:100%;border-radius:3px;transition:width .8s cubic-bezier(.16,1,.3,1)}

/* ── TABS (WinWin style) ── */
.tabs{display:flex;background:var(--bg-surface);border:1px solid var(--border-subtle);
  border-radius:10px;padding:3px;gap:2px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tab{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;
  color:var(--text-muted);background:transparent;border:none;font-family:var(--font-display);
  white-space:nowrap;transition:all .2s}
.tab:hover{color:var(--text-secondary);background:var(--bg-hover)}
.tab.on{color:#fff;background:var(--accent-cyan);box-shadow:0 2px 8px rgba(49,118,166,.2)}

/* ── SIDEBAR (dark, comme WinWin V2) ── */
.sbi{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:var(--radius-sm);
  color:var(--sidebar-text-muted);font-size:13px;font-weight:500;cursor:pointer;
  transition:all .2s;white-space:nowrap;position:relative}
.sbi::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
  width:2px;height:0;background:var(--sidebar-accent);border-radius:1px;transition:height .2s}
.sbi:hover{background:var(--sidebar-hover);color:var(--sidebar-text)}
.sbi:hover::before,.sbi.on::before{height:60%}
.sbi.on{background:var(--sidebar-active);color:var(--sidebar-accent)}

/* ── MODAL ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);
  z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
.modal{background:var(--bg-surface);border-radius:var(--radius-lg);border:1px solid var(--border-default);
  width:100%;max-width:520px;max-height:90vh;overflow-y:auto;animation:scaleIn .25s cubic-bezier(.16,1,.3,1)}

/* ── SECTION HEADER (WinWin style) ── */
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sh::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--border-subtle),transparent);margin-left:10px}

/* ── SHIMMER ── */
.shimmer{background:linear-gradient(90deg,var(--bg-surface) 25%,var(--bg-deep) 50%,var(--bg-surface) 75%);
  background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite}

/* ── LOGIN PAGE — fond clair WinWin (pas de fond noir) ── */
.login-bg{
  min-height:100vh;
  background:
    radial-gradient(ellipse 70% 50% at 15% 40%, rgba(49,118,166,.07) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 85% 20%, rgba(179,45,38,.05) 0%, transparent 50%),
    #F3F5F9;
}
.login-card{
  background:#fff;
  border:1px solid var(--border-default);
  border-radius:var(--radius-lg);
  box-shadow:0 8px 40px rgba(49,118,166,.10),0 2px 8px rgba(0,0,0,.04);
}

/* ── GRIDS RESPONSIVE ── */
.g4{display:grid;gap:14px;grid-template-columns:repeat(4,1fr)}
.g3{display:grid;gap:14px;grid-template-columns:repeat(3,1fr)}
.g2{display:grid;gap:12px;grid-template-columns:repeat(2,1fr)}
.g21{display:grid;gap:16px;grid-template-columns:2fr 1fr}
.gcalc{display:grid;gap:16px;grid-template-columns:290px 1fr;align-items:start}
.gabs{display:grid;gap:16px;grid-template-columns:1fr 260px;align-items:start}
.gtime{display:grid;gap:16px;grid-template-columns:260px 1fr;align-items:start}

@media(max-width:900px){
  .g4{grid-template-columns:repeat(2,1fr)}
  .g3{grid-template-columns:repeat(2,1fr)}
  .g21{grid-template-columns:1fr}
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

/* ═══ SWISSRH LOGO — IMAGE OFFICIELLE ══════════════════
   Logo réel intégré en base64 WebP (7kb)
   Fond gris texturé conservé — s'affiche sur fond light WinWin V2
══════════════════════════════════════════════════════ */

const LOGO_B64 = "data:image/webp;base64,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"; // RGBA transparent WebP

function SwissRHLogo({ height = 36 }) {
  // Ratio original: 1024x559 ≈ 1.83:1
  const width = Math.round(height * 4.11);
  return (
    <img
      src={LOGO_B64}
      width={width}
      height={height}
      alt="SwissRH.ch"
      style={{ objectFit:"contain", display:"block", flexShrink:0,
        imageRendering:"crisp-edges", background:"transparent" }}
    />
  );
}

/* Icône écusson seul pour sidebar réduite */
function SwissRHIcon({ size = 32 }) {
  const R = "#B32D26", B = "#366389";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink:0, display:"block" }}>
      <path d="M10 8 L70 8 Q76 8 76 16 L76 50 Q76 70 40 78 Q4 70 4 50 L4 16 Q4 8 10 8 Z" fill={R}/>
      <path d="M10 8 L70 8 Q76 8 76 16 L76 35 Q62 18 40 20 Q18 18 4 35 L4 16 Q4 8 10 8 Z" fill="rgba(255,255,255,.15)"/>
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

const ProgBar = ({ val, max, color = "var(--accent-cyan)", h = 5 }) => (
  <div className="prog" style={{ height: h }}>
    <div className="prog-f" style={{ width: `${max > 0 ? Math.min(100, val / max * 100) : 0}%`, background: color }} />
  </div>
);

const Toggle = ({ val, set, label, hint }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"10px 12px", background:"var(--bg-deep)", borderRadius:8 }}>
    <div>
      <div style={{ fontSize:12, fontWeight:600 }}>{label}</div>
      {hint && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:1 }}>{hint}</div>}
    </div>
    <div onClick={() => set(!val)} style={{ cursor:"pointer", flexShrink:0,
      width:38, height:21, borderRadius:11,
      background: val ? "var(--accent-cyan)" : "var(--border-default)", position:"relative", transition:"background .2s" }}>
      <div style={{ position:"absolute", top:2.5, left: val ? 18 : 2.5, width:16, height:16,
        background:"#fff", borderRadius:"50%", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
    </div>
  </div>
);

function Spinner({ size = 18 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0,
    border:"2px solid var(--border-default)", borderTop:"2px solid var(--accent-cyan)", animation:"spin .7s linear infinite" }} />;
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
      borderBottom:"1px solid var(--border-subtle)", background:"var(--bg-surface)",
      position:"sticky", top:0, zIndex:10, gap:10, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {onMenu && (
          <button onClick={onMenu} className="btn btn-g" style={{ padding:"6px 10px", flexShrink:0 }}>☰</button>
        )}
        <div>
          <div style={{ fontWeight:800, fontSize: w < 480 ? 14 : 16, letterSpacing:"-.02em", lineHeight:1.2 }}>{title}</div>
          {sub && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{sub}</div>}
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

function KpiCard({ label, value, sub, color = "var(--accent-cyan)", icon, trend, delay = 0, isNum = false }) {
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
          textTransform:"uppercase", color:"var(--text-muted)", lineHeight:1.3, flex:1 }}>
          {label}
        </div>
        <div style={{ width:30, height:30, borderRadius:7, background:`${color}1a`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color, flexShrink:0 }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="mono" style={{ fontSize:numSz, fontWeight:900,
        letterSpacing:"-.03em", lineHeight:1, color:"var(--text-primary)", wordBreak:"break-all" }}>
        {display}
      </div>

      {/* Trend + sub */}
      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
        {trend !== undefined && (
          <span style={{ fontSize:10, fontWeight:800,
            color: trend >= 0 ? "var(--accent-green)" : "var(--accent-pink)" }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ fontSize:10, color:"var(--text-muted)", lineHeight:1.3 }}>{sub}</span>}
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
            <div style={{ width:240, height:"100%", background:"var(--sidebar-bg)", padding:"18px 9px", overflowY:"auto" }}
              onClick={e => e.stopPropagation()} className="au">
              {/* Logo sur fond blanc — sidebar sombre */}
              <div style={{ padding:"4px 6px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", marginBottom:10 }}>
                <div style={{ background:"#fff", borderRadius:8, padding:"6px 8px", display:"inline-flex" }}>
                  <SwissRHLogo height={24}/>
                </div>
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
          background:"var(--sidebar-bg)", borderTop:"1px solid rgba(255,255,255,.08)",
          display:"flex", paddingBottom:"env(safe-area-inset-bottom)" }}>
          {TOP.map(n => (
            <div key={n.id} onClick={() => setPage(n.id)} style={{ flex:1,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:2, cursor:"pointer", padding:"4px 2px",
              color: page === n.id ? "var(--sidebar-accent)" : "rgba(255,255,255,.35)", transition:"color .15s" }}>
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
    <div style={{ width: col ? 54 : 210, background:"var(--sidebar-bg)", height:"100vh",
      display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden",
      transition:"width .25s cubic-bezier(.16,1,.3,1)" }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", justifyContent: col ? "center" : undefined,
        padding: col ? "12px 0" : "10px 12px",
        borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0, minHeight:56 }}>
        {col
          ? <SwissRHIcon size={30}/>
          : <div style={{ background:"#fff", borderRadius:8, padding:"5px 8px", display:"inline-flex" }}>
              <SwissRHLogo height={26}/>
            </div>
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
          <div style={{ width:26, height:26, borderRadius:"50%", background:"var(--sidebar-accent)", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"var(--sidebar-bg)" }}>AD</div>
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
    <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-default)", borderRadius:8,
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
          <KpiCard label="Masse salariale brute" value={38200} sub="mars 2025"   color="var(--accent-cyan)"   icon="💰" trend={2.1} delay={0}/>
          <KpiCard label="Net total versé"        value={29300} sub="ce mois"    color="var(--accent-green)"  icon="✅" trend={1.8} delay={60}/>
          <KpiCard label="Charges patronales"     value={8800}  sub="≈ 23% brut" color="var(--accent-amber)"  icon="🏛" delay={120}/>
          <KpiCard label="Collaborateurs"         value={8}     sub="1 alerte permis" isNum color="var(--accent-purple)" icon="👥" delay={180}/>
        </div>

        {/* ── Charts ── */}
        <div className="g21">
          <div className="card au" style={{ padding: w < 480 ? 14 : 18 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>📈 Masse salariale 2025</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:12 }}>Brut vs Net — CHF/mois</div>
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
                <XAxis dataKey="m" tick={{ fontSize:11, fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="brut" stroke="#3176A6" strokeWidth={2} fill="url(#gB)"/>
                <Area type="monotone" dataKey="net"  stroke="#10b981" strokeWidth={2} fill="url(#gN)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card au" style={{ padding: w < 480 ? 14 : 18, animationDelay:".06s" }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>🧮 Déductions employé</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:8 }}>Mars 2025</div>
            <ResponsiveContainer width="100%" height={w < 480 ? 110 : 130}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%"
                  innerRadius={w < 480 ? 28 : 34} outerRadius={w < 480 ? 46 : 56}
                  dataKey="v" paddingAngle={2}
                  onMouseEnter={(_,i) => setHp(i)} onMouseLeave={() => setHp(null)}>
                  {PIE_DATA.map((e, i) => (
                    <Cell key={i} fill={e.c} opacity={hp === null || hp === i ? 1 : .4}
                      strokeWidth={hp === i ? 2 : 0} stroke="var(--bg-surface)"/>
                  ))}
                </Pie>
                <Tooltip formatter={v => [`CHF ${fmt(v, 0)}`]}
                  contentStyle={{ background:"var(--bg-surface)", border:"1px solid var(--border-default)", borderRadius:8, fontFamily:"var(--mono)", fontSize:11 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:4 }}>
              {PIE_DATA.map((d, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:d.c, flexShrink:0 }}/>
                    <span style={{ color:"var(--text-secondary)" }}>{d.name}</span>
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
                { i:"🪪", m:"Müller Sophie — Permis B expire dans 28j", c:"var(--accent-amber)" },
                { i:"📋", m:"García Carlos — Congés en attente (5j)",   c:"var(--accent-cyan)" },
                { i:"🏥", m:"Rossi Pietro — Certificat manquant",        c:"var(--accent-pink)" },
                { i:"🏖", m:"Favre Lucie — Solde vacances > 20j",        c:"var(--accent-amber)" },
              ].map((a, i) => (
                <div key={i} style={{ display:"flex", gap:8, padding:"8px 10px",
                  background:`${a.c}0d`, borderRadius:7, border:`1px solid ${a.c}22` }}>
                  <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>{a.i}</span>
                  <span style={{ fontSize:11, color:"var(--text-secondary)", lineHeight:1.4 }}>{a.m}</span>
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
                  <div style={{ fontSize:10, color:"var(--text-muted)" }}>{a.type} · {a.days}j</div>
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
                    <span className="mono" style={{ color: v.bal < 5 ? "var(--accent-pink)" : "var(--accent-cyan)", fontWeight:700 }}>
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
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)" }}>🔍</span>
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
                  <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--accent-cyan-dim)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:13, fontWeight:900, color:"var(--accent-cyan)", flexShrink:0 }}>
                    {emp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{emp.name}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)" }}>{emp.dept} · {emp.ct}</div>
                  </div>
                  <span className={`badge p-${emp.pm}`}>{emp.pm}</span>
                </div>
                <div className="g2" style={{ gap:8 }}>
                  <div style={{ background:"var(--bg-deep)", borderRadius:7, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--text-muted)", letterSpacing:".04em" }}>Salaire</div>
                    <div className="mono" style={{ fontSize: w < 380 ? 15 : 17, fontWeight:900, color:"var(--accent-cyan)", marginTop:3 }}>
                      {emp.ct === "Horaire" ? `${emp.sal}/h` : fmt(emp.sal, 0)}
                      <span style={{ fontSize:10, color:"var(--text-muted)", fontWeight:400 }}> CHF</span>
                    </div>
                  </div>
                  <div style={{ background:"var(--bg-deep)", borderRadius:7, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--text-muted)", letterSpacing:".04em" }}>Activité</div>
                    <div style={{ marginTop:6, marginBottom:3 }}><ProgBar val={emp.rt} max={100}/></div>
                    <div className="mono" style={{ fontSize:14, fontWeight:800, color:"var(--accent-cyan)" }}>{emp.rt}%</div>
                  </div>
                </div>
                {emp.exp && (
                  <div style={{ marginTop:8, padding:"6px 10px", background:"var(--accent-amber-dim)",
                    borderRadius:6, fontSize:10, color:"var(--accent-amber)", fontWeight:700 }}>
                    ⚠ Permis expire le {emp.exp}
                  </div>
                )}
                {sel?.id === emp.id && (
                  <div className="g2" style={{ marginTop:12, paddingTop:12, borderTop:"1px solid var(--border-subtle)", gap:8 }}>
                    {[["Âge", `${emp.age} ans`], ["Embauché", emp.hire],
                      ["Statut", "Actif"], ["Département", emp.dept]].map(([k, v]) => (
                      <div key={k} style={{ background:"var(--accent-cyan-dim)", padding:"8px 10px", borderRadius:7 }}>
                        <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:"var(--text-muted)", letterSpacing:".04em" }}>{k}</div>
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
              gap:10, padding:"9px 16px", background:"var(--bg-deep)",
              borderBottom:"1px solid var(--border-subtle)", borderRadius:"var(--r) var(--r) 0 0" }}>
              {["Collaborateur", "Département", "Contrat", "Permis", "Salaire CHF", "Activité"].map(h => (
                <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"var(--text-muted)" }}>{h}</div>
              ))}
            </div>
            {list.map((emp, i) => (
              <div key={emp.id} className="row" style={{ display:"grid",
                gridTemplateColumns:"2fr 1fr 1fr 80px 120px 100px",
                gap:10, padding:"12px 16px", alignItems:"center", cursor:"pointer",
                animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i * 30}ms both` }}
                onClick={() => setSel(sel?.id === emp.id ? null : emp)}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--accent-cyan-dim)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:11, fontWeight:900, color:"var(--accent-cyan)", flexShrink:0 }}>
                    {emp.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{emp.name}</div>
                    {emp.exp && <div style={{ fontSize:9, color:"var(--accent-amber)" }}>⚠ {emp.exp}</div>}
                  </div>
                </div>
                <div style={{ fontSize:12, color:"var(--text-secondary)" }}>{emp.dept}</div>
                <span className="badge" style={{ background:"var(--accent-cyan-dim)", color:"var(--accent-cyan)" }}>{emp.ct}</span>
                <span className={`badge p-${emp.pm}`}>{emp.pm}</span>
                <div className="mono" style={{ fontSize:13, fontWeight:800 }}>
                  {emp.ct === "Horaire" ? `${emp.sal}/h` : fmt(emp.sal, 0)}
                </div>
                <div>
                  <ProgBar val={emp.rt} max={100}/>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{emp.rt}%</div>
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
                cursor:"pointer", fontSize:18, color:"var(--text-muted)", lineHeight:1 }}>×</button>
            </div>
            <div className="g4" style={{ gap:10 }}>
              {[["Département", sel.dept], ["Contrat", sel.ct], ["Permis", sel.pm],
                ["Taux activité", `${sel.rt}%`], ["Âge", `${sel.age} ans`], ["Embauché", sel.hire],
                ["Salaire", sel.ct === "Horaire" ? `${sel.sal} CHF/h` : `${fmt(sel.sal, 0)} CHF/m`],
                ["Statut", "Actif"]
              ].map(([k, v]) => (
                <div key={k} style={{ padding:"10px 12px", background:"var(--bg-deep)", borderRadius:8 }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".04em", color:"var(--text-muted)", marginBottom:3 }}>{k}</div>
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
                  color:"var(--text-muted)", display:"block", marginBottom:6 }}>Salaire mensuel brut (CHF)</label>
                <input className="inp mono" type="number" value={gross} onChange={e => setGross(+e.target.value)}
                  style={{ fontSize: w < 480 ? 19 : 23, fontWeight:900, letterSpacing:"-.02em" }}/>
              </div>

              <div>
                <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                  color:"var(--text-muted)", display:"block", marginBottom:6 }}>
                  Âge — <span style={{ color:"var(--accent-cyan)" }}>LPP: {lppLbl}</span>
                </label>
                <input className="inp" type="number" value={age} onChange={e => setAge(+e.target.value)} min={16} max={70}/>
              </div>

              <div>
                <label style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em",
                  color:"var(--text-muted)", display:"block", marginBottom:6 }}>
                  Taux d'activité — <span className="mono" style={{ color:"var(--accent-cyan)", fontWeight:800 }}>{rate}%</span>
                </label>
                <input type="range" min={10} max={100} step={10} value={rate}
                  onChange={e => setRate(+e.target.value)}
                  style={{ width:"100%", accentColor:"var(--accent-cyan)", cursor:"pointer", marginBottom:4 }}/>
                <ProgBar val={rate} max={100}/>
              </div>

              <Toggle label="IJM — Indemnité journalière" hint="0.75% emp. + 0.75% er." val={hasIjm} set={setHasIjm}/>
              <Toggle label="LAAC — Assurance complémentaire" hint="Sur salaire > 12'350 CHF/m" val={hasLaac} set={setHasLaac}/>
            </div>

            {/* Summary */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:800, fontSize:13, marginBottom:14 }}>📋 Résumé</div>
              {[
                { l:"Salaire brut",        v:r.gross,     c:"var(--text-primary)",   big:false },
                { l:"Déductions employé",  v:-r.totalDed, c:"var(--accent-pink)",  big:false },
                { l:"Net à verser",        v:r.net,       c:"var(--accent-green)",big:true  },
                { l:"Charges patronales",  v:r.totalEr,   c:"var(--accent-amber)",big:false },
                { l:"Coût total employeur",v:r.totalCost, c:"var(--text-secondary)",   big:false },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:`${row.big ? 12 : 8}px 0`,
                  borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                  borderBottom: row.big ? "2px solid var(--border-default)" : undefined }}>
                  <span style={{ fontSize: row.big ? 13 : 12, fontWeight: row.big ? 700 : 500, color:"var(--text-secondary)" }}>{row.l}</span>
                  <span className="mono" style={{ fontSize: row.big ? (w < 480 ? 16 : 20) : 13,
                    fontWeight: row.big ? 900 : 700, color:row.c }}>
                    {row.v < 0 ? "–" : ""} {fmt(Math.abs(row.v))} CHF
                  </span>
                </div>
              ))}
              <div className="g2" style={{ gap:8, marginTop:12 }}>
                {[
                  { l:"Taux déductions", v:`${(r.totalDed / r.gross * 100).toFixed(1)}%`, c:"var(--accent-pink)" },
                  { l:"Coût / net",      v:`${(r.totalCost / r.net).toFixed(2)}×`,        c:"var(--accent-cyan)" },
                ].map((m, i) => (
                  <div key={i} style={{ padding:"10px 11px", background:`${m.c}0d`, borderRadius:8, border:`1px solid ${m.c}22` }}>
                    <div style={{ fontSize:9, color:"var(--text-muted)", marginBottom:3 }}>{m.l}</div>
                    <div className="mono" style={{ fontSize: w < 480 ? 15 : 18, fontWeight:900, color:m.c }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: full breakdown ── */}
          <div className="card au">
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border-subtle)" }}>
              <div style={{ fontWeight:800, fontSize:13 }}>Décompte complet — charges sociales 2025</div>
              <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>AVS/AI/APG · AC · ACE · LPP · LAA NP/P · LAAC · IJM</div>
            </div>
            {/* cols: 3 on desktop, 2 on mobile */}
            <div style={{ display:"grid",
              gridTemplateColumns: w < 540 ? "1fr 90px" : "2.4fr 100px 100px",
              gap:8, padding:"8px 16px", background:"var(--bg-deep)", borderBottom:"1px solid var(--border-subtle)",
              fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"var(--text-muted)" }}>
              {(w < 540 ? ["Cotisation","Employé"] : ["Cotisation","Employé","Employeur"]).map(h => <div key={h}>{h}</div>)}
            </div>
            {rows.map((row, i) => (
              <div key={i} className="row" style={{ display:"grid",
                gridTemplateColumns: w < 540 ? "1fr 90px" : "2.4fr 100px 100px",
                gap:8, padding:"10px 16px", alignItems:"center",
                animation:`slideUp .4s cubic-bezier(.16,1,.3,1) ${i * 20}ms both` }}>
                <div style={{ fontSize: w < 480 ? 11 : 12, color:"var(--text-secondary)" }}>{row.l}</div>
                <div className="mono" style={{ fontSize: w < 480 ? 12 : 13, fontWeight:800,
                  color: row.e > 0 ? "var(--accent-pink)" : "var(--text-muted)" }}>
                  {row.e > 0 ? `–${fmt(row.e)}` : "—"}
                </div>
                {w >= 540 && (
                  <div className="mono" style={{ fontSize:13, fontWeight:800,
                    color: row.er > 0 ? "var(--accent-amber)" : "var(--text-muted)" }}>
                    {row.er > 0 ? `–${fmt(row.er)}` : "—"}
                  </div>
                )}
              </div>
            ))}
            {/* Total */}
            <div style={{ display:"grid",
              gridTemplateColumns: w < 540 ? "1fr 90px" : "2.4fr 100px 100px",
              gap:8, padding:"12px 16px", background:"var(--bg-deep)", borderTop:"2px solid var(--border-default)", fontWeight:800 }}>
              <div style={{ fontSize:12 }}>TOTAL</div>
              <div className="mono" style={{ fontSize:14, color:"var(--accent-pink)" }}>–{fmt(r.totalDed)}</div>
              {w >= 540 && <div className="mono" style={{ fontSize:14, color:"var(--accent-amber)" }}>–{fmt(r.totalEr)}</div>}
            </div>
            {/* Net */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 16px", borderTop:"1px solid var(--border-subtle)", background:"rgba(16,185,129,.04)" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:"var(--accent-green)" }}>Net à verser</div>
                <div style={{ fontSize:10, color:"var(--text-muted)" }}>Brut – déductions employé</div>
              </div>
              <div className="mono" style={{ fontSize: w < 480 ? 20 : 26, fontWeight:900, color:"var(--accent-green)" }}>
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
                  background: COLORS[a.type] || "var(--accent-cyan)" }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:2 }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>{a.emp}</span>
                    <span className="badge" style={{ background:(COLORS[a.type]||"var(--accent-cyan)")+"1a",
                      color:COLORS[a.type]||"var(--accent-cyan)", fontSize:8 }}>{a.type}</span>
                    {a.cert && <span className="badge s-approved" style={{ fontSize:8 }}>Cert ✓</span>}
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)" }}>
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
                      color: v.bal < 5 ? "var(--accent-pink)" : "var(--accent-cyan)" }}>{v.bal}j</span>
                  </div>
                  <ProgBar val={v.taken} max={v.ent} color={v.bal < 5 ? "var(--accent-pink)" : "var(--accent-cyan)"}/>
                  <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:1 }}>{v.taken} / {v.ent}j</div>
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
                color:"var(--text-muted)", display:"block", marginBottom:8 }}>Collaborateur</label>
              <select className="inp" value={emp.id} onChange={e => setEmp(EMPLOYEES.find(x => x.id === +e.target.value))}>
                {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="card" style={{ padding:16 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>📅 Semaine 03–07 mars</div>
              {[
                { l:"Travaillées",    v:hToHMM(totalH),   c:"var(--accent-cyan)" },
                { l:"Contractuelles", v:hToHMM(target),   c:"var(--text-muted)" },
                { l:"Heures supp.",   v:hToHMM(totalOT),  c:"var(--accent-amber)" },
                { l:"Solde",          v:(totalH - target >= 0 ? "+" : "") + hToHMM(totalH - target),
                  c: totalH >= target ? "var(--accent-green)" : "var(--accent-pink)" },
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0",
                  borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined }}>
                  <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{row.l}</span>
                  <span className="mono" style={{ fontSize:14, fontWeight:900, color:row.c }}>{row.v}</span>
                </div>
              ))}
            </div>

            <div style={{ padding:12, background:"var(--accent-amber-dim)", borderRadius:8,
              border:"1px solid rgba(245,158,11,.2)", fontSize:11 }}>
              <div style={{ fontWeight:700, color:"var(--accent-amber)", marginBottom:4 }}>⚖️ Pauses légales</div>
              <div style={{ color:"var(--text-secondary)", lineHeight:1.7 }}>
                {"> "}5h30 → 15 min<br/>{"> "}7h → 30 min<br/>{"> "}9h → 60 min
              </div>
            </div>
          </div>

          {/* Right: timesheet */}
          <div className="card">
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border-subtle)", fontWeight:700, fontSize:13 }}>
              Feuille de temps — Mars 2025
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns: w < 500 ? "70px 1fr 1fr 60px" : "80px 80px 80px 50px 70px 60px",
              gap:6, padding:"8px 14px", background:"var(--bg-deep)", borderBottom:"1px solid var(--border-subtle)",
              fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color:"var(--text-muted)" }}>
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
                <div className="mono" style={{ fontSize:13, fontWeight:900, color:"var(--accent-cyan)" }}>{hToHMM(e.worked)}</div>
                {w >= 500 && <div className="mono" style={{ fontSize:12, fontWeight:800, color: e.ot > 0 ? "var(--accent-amber)" : "var(--text-muted)" }}>
                  {e.ot > 0 ? hToHMM(e.ot) : "—"}
                </div>}
              </div>
            ))}
            <div style={{ display:"grid",
              gridTemplateColumns: w < 500 ? "70px 1fr 1fr 60px" : "80px 80px 80px 50px 70px 60px",
              gap:6, padding:"12px 14px", background:"var(--bg-deep)", borderTop:"2px solid var(--border-default)" }}>
              <div style={{ fontWeight:800, fontSize:11 }}>TOTAL</div>
              <div/><div/>
              {w >= 500 && <div/>}
              <div className="mono" style={{ fontWeight:900, fontSize:14, color:"var(--accent-cyan)" }}>{hToHMM(totalH)}</div>
              {w >= 500 && <div className="mono" style={{ fontWeight:800, fontSize:12, color:"var(--accent-amber)" }}>{hToHMM(totalOT)}</div>}
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
      <div style={{ fontSize:13, color:"var(--text-muted)", maxWidth:320, lineHeight:1.6 }}>{desc}</div>
      <button className="btn btn-p">Bientôt disponible</button>
    </div>
  );
}

/* ═══ LOGIN ══════════════════════════════════════════════ */

function Login({ onLogin }) {
  const [email,   setEmail]   = useState("");
  const [mode,    setMode]    = useState("magic"); // "magic" | "winwin"
  const [state,   setState]   = useState("idle"); // idle | sending | sent | error | demo
  const [msg,     setMsg]     = useState("");
  const w = useW();

  /* ── Détection auto WinWin Sérénité ── */
  const isWinWinEmail = email.trim().toLowerCase().includes("winwin") ||
    email.trim().toLowerCase().includes("ww-");

  /* ── Demo login (preview) ── */
  function demoLogin() {
    setState("demo");
    setTimeout(() => onLogin(), 800);
  }

  /* ── Magic link SwissRH ── */
  async function sendMagicLink() {
    if (!email.trim()) return;
    setState("sending");
    await new Promise(r => setTimeout(r, 1200));
    setState("sent");
    setMsg(`Un lien de connexion a été envoyé à ${email.trim()}`);
  }

  /* ── SSO WinWin Sérénité → redirect vers winwin.swiss ── */
  function connectWinWin() {
    setState("sending");
    const returnUrl = encodeURIComponent(window.location.origin + "/auth/sso-callback");
    const ssoUrl = `https://winwin.swiss/login?sso=swissrh&return=${returnUrl}&email=${encodeURIComponent(email.trim())}`;
    setTimeout(() => {
      // En production → window.location.href = ssoUrl;
      // En démo → simule le retour SSO
      setState("idle");
      setMode("winwin_ok");
      setTimeout(() => onLogin(), 1000);
    }, 1000);
  }

  const isSent  = state === "sent";
  const isLoading = state === "sending" || state === "demo";
  const isWWOk  = mode === "winwin_ok";

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      position:"relative", overflow:"hidden",
      background:"linear-gradient(135deg, #F3F5F9 0%, #EBF0F5 50%, #F3F5F9 100%)" }}>

      {/* Fond — cercles lumineux */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:"60vw", height:"60vw",
          borderRadius:"50%", background:"radial-gradient(circle, rgba(49,118,166,.07) 0%, transparent 70%)" }}/>
        <div style={{ position:"absolute", bottom:"-10%", right:"-5%", width:"50vw", height:"50vw",
          borderRadius:"50%", background:"radial-gradient(circle, rgba(179,45,38,.05) 0%, transparent 70%)" }}/>
        <div style={{ position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(49,118,166,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(49,118,166,.035) 1px,transparent 1px)",
          backgroundSize:"44px 44px",
          maskImage:"radial-gradient(ellipse 90% 75% at 50% 50%, black 20%, transparent 80%)" }}/>
      </div>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420,
        padding: w < 480 ? "20px 16px" : "24px" }}>

        {/* Logo — fond transparent, s'intègre parfaitement */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:32, gap:6 }}>
          <SwissRHLogo height={w < 420 ? 42 : 52}/>
          <div style={{ fontSize:10, letterSpacing:".18em", textTransform:"uppercase",
            color:"var(--text-muted)", fontWeight:600, marginTop:2 }}>
            Espace RH Sécurisé
          </div>
        </div>

        {/* Card principale */}
        <div style={{ background:"rgba(255,255,255,.95)", backdropFilter:"blur(20px)",
          border:"1px solid rgba(49,118,166,.12)",
          borderRadius:"var(--radius-lg)", padding: w < 480 ? "24px 20px" : "32px 30px",
          boxShadow:"0 4px 6px rgba(0,0,0,.02), 0 20px 60px rgba(49,118,166,.10), 0 1px 0 rgba(255,255,255,.8) inset" }}>

          {/* Header */}
          {!isSent && !isWWOk && (
            <div style={{ marginBottom:24, textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:22, color:"var(--text-primary)", letterSpacing:"-.025em" }}>
                Connexion
              </div>
              <div style={{ fontSize:12, color:"var(--text-secondary)", marginTop:5, lineHeight:1.5 }}>
                Entrez votre email pour recevoir un lien magique<br/>
                ou connectez-vous via <strong style={{ color:"var(--accent-cyan)" }}>WIN WIN</strong> si vous êtes client Sérénité
              </div>
            </div>
          )}

          {/* State: Lien envoyé */}
          {isSent && (
            <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
              <div style={{ width:56, height:56, borderRadius:"50%",
                background:"linear-gradient(135deg, rgba(16,185,129,.15), rgba(16,185,129,.05))",
                border:"2px solid rgba(16,185,129,.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
                margin:"0 auto 16px", fontSize:24 }}>✓</div>
              <div style={{ fontWeight:800, fontSize:18, color:"var(--text-primary)", marginBottom:8 }}>
                Lien envoyé !
              </div>
              <div style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.6 }}>
                {msg}<br/>
                <span style={{ color:"var(--text-muted)", fontSize:11 }}>
                  Vérifiez vos spams si vous ne le recevez pas.
                </span>
              </div>
              <button onClick={() => { setState("idle"); setMsg(""); }}
                style={{ marginTop:20, fontSize:12, color:"var(--accent-cyan)",
                  background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                ← Utiliser une autre adresse
              </button>
            </div>
          )}

          {/* State: SSO WinWin OK */}
          {isWWOk && (
            <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
              <div style={{ width:56, height:56, borderRadius:"50%",
                background:"linear-gradient(135deg, rgba(49,118,166,.15), rgba(49,118,166,.05))",
                border:"2px solid rgba(49,118,166,.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
                margin:"0 auto 16px", fontSize:22 }}>🔑</div>
              <div style={{ fontWeight:800, fontSize:18, color:"var(--text-primary)", marginBottom:8 }}>
                Authentification WIN WIN
              </div>
              <div style={{ fontSize:12, color:"var(--text-secondary)" }}>
                Connexion via votre compte WIN WIN Sérénité…
              </div>
              <Spinner/>
            </div>
          )}

          {/* Formulaire principal */}
          {!isSent && !isWWOk && (
            <>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:".08em", color:"var(--text-muted)", display:"block", marginBottom:7 }}>
                  Adresse email
                </label>
                <input className="inp" type="email" placeholder="votre@email.ch"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMagicLink()}
                  autoFocus
                  style={{ fontSize:14 }}/>
              </div>

              {/* CTA principal — Magic Link */}
              <button className="btn btn-p" onClick={sendMagicLink} disabled={isLoading || !email.trim()}
                style={{ width:"100%", justifyContent:"center", padding:"13px",
                  fontSize:13, fontWeight:700, marginBottom:10,
                  borderRadius:10, gap:8,
                  opacity: (!email.trim() || isLoading) ? .6 : 1 }}>
                {isLoading && mode === "magic" ? <><Spinner/>&nbsp;Envoi en cours…</> : <>
                  <span style={{ fontSize:16 }}>✉</span> Envoyer un lien magique
                </>}
              </button>

              {/* Séparateur OU */}
              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0" }}>
                <div style={{ flex:1, height:1, background:"var(--border-subtle)" }}/>
                <span style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:".1em" }}>ou</span>
                <div style={{ flex:1, height:1, background:"var(--border-subtle)" }}/>
              </div>

              {/* CTA WIN WIN Sérénité SSO */}
              <button onClick={connectWinWin} disabled={isLoading}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                  gap:10, padding:"12px", borderRadius:10, cursor:"pointer",
                  background:"var(--bg-deep)", border:"1.5px solid rgba(49,118,166,.20)",
                  fontSize:13, fontWeight:700, color:"var(--text-primary)",
                  transition:"all .2s" }}>
                {isLoading && mode === "winwin" ? <><Spinner/>&nbsp;Redirection…</> : <>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:"var(--accent-cyan)" }}>W</span>
                    <span style={{ fontSize:10, lineHeight:1, color:"var(--text-secondary)" }}>
                      Connexion avec<br/>
                      <strong style={{ color:"var(--text-primary)", fontSize:12 }}>WIN WIN</strong>
                      <span style={{ color:"var(--text-muted)", fontSize:10 }}> Sérénité</span>
                    </span>
                  </div>
                  <span style={{ marginLeft:"auto", fontSize:10, color:"var(--text-muted)" }}>→</span>
                </>}
              </button>

              <div style={{ marginTop:6, fontSize:10, color:"var(--text-muted)", textAlign:"center" }}>
                Client WIN WIN sous gestion Sérénité ? Vos accès RH sont inclus.
              </div>

              {/* Demo button */}
              <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid var(--border-subtle)",
                display:"flex", justifyContent:"center" }}>
                <button onClick={demoLogin} disabled={isLoading}
                  style={{ fontSize:11, color:"var(--text-muted)", background:"none",
                    border:"none", cursor:"pointer", textDecoration:"underline", opacity:.7 }}>
                  {state === "demo" ? "Chargement…" : "Accès démo (preview)"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign:"center", marginTop:20, display:"flex", alignItems:"center",
          justifyContent:"center", gap:8 }}>
          <div style={{ width:5, height:5, borderRadius:"50%",
            background:"var(--accent-green)", boxShadow:"0 0 6px rgba(16,185,129,.6)" }}/>
          <span style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:".04em" }}>
            Chiffrement TLS · Hébergé en Suisse ·{" "}
            <span style={{ color:"var(--accent-cyan)", fontWeight:600 }}>Neukomm Group</span>
          </span>
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
