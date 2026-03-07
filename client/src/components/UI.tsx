import { useState, useEffect, ReactNode } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { fmt } from '../lib/salary';

// ── SPINNER ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '2px solid var(--border-default)',
      borderTop: '2px solid var(--accent)',
      animation: 'spin .7s linear infinite',
    }} />
  );
}

// ── STATUS BADGE ─────────────────────────────────────────────────────────────
const BADGE_CFG: Record<string, { bg: string; color: string; label: string }> = {
  approved:  { bg: 'var(--accent-green-dim)', color: 'var(--accent-green)', label: 'Approuvé' },
  pending:   { bg: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', label: 'En attente' },
  rejected:  { bg: 'var(--accent-pink-dim)',  color: 'var(--accent-pink)',  label: 'Refusé' },
  cancelled: { bg: 'var(--bg-deep)',          color: 'var(--text-muted)',   label: 'Annulé' },
  active:    { bg: 'var(--accent-green-dim)', color: 'var(--accent-green)', label: 'Actif' },
  inactive:  { bg: 'var(--bg-deep)',          color: 'var(--text-muted)',   label: 'Inactif' },
  draft:     { bg: 'var(--bg-deep)',          color: 'var(--text-muted)',   label: 'Brouillon' },
  paid:      { bg: 'var(--accent-green-dim)', color: 'var(--accent-green)', label: 'Payé' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = BADGE_CFG[status] ?? { bg: 'var(--bg-deep)', color: 'var(--text-muted)', label: status };
  return <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

// ── PERMIT BADGE ─────────────────────────────────────────────────────────────
export function PermitBadge({ permit, expiry }: { permit: string; expiry?: string }) {
  const soon = expiry && (new Date(expiry).getTime() - Date.now()) < 60 * 24 * 3600 * 1000;
  return (
    <div>
      <span className={`badge permit-${permit}`}>{permit}</span>
      {soon && <div style={{ fontSize: 10, color: 'var(--accent-amber)', marginTop: 2 }}>⚠ {expiry}</div>}
    </div>
  );
}

// ── KPI CARD ─────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let cur = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return val;
}

interface KpiProps {
  label: string;
  value: number | string;
  unit?: string;
  sub?: string;
  color?: string;
  icon: ReactNode;
  trend?: number;
  delay?: number;
  isCurrency?: boolean;
}

export function KpiCard({ label, value, unit, sub, color = 'var(--accent-cyan)', icon, trend, delay = 0, isCurrency = true }: KpiProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  const animated = useCountUp(visible && typeof value === 'number' ? value : 0);

  const display = typeof value === 'string' ? value
    : isCurrency ? `CHF ${fmt(animated, 0)}` : animated.toLocaleString('fr-CH');

  return (
    <div className="card kpi" style={{ padding: 20, '--kpi-color': color } as any}
      style={{ padding: 20, opacity: visible ? 1 : 0, animation: visible ? `slideUp .5s cubic-bezier(.16,1,.3,1) ${delay}ms both` : 'none',
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)', position: 'relative', overflow: 'hidden',
        transition: 'all .3s' }}>

      {/* Accent line on hover via CSS class */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0, transition: 'opacity .3s' }}
        className="kpi-accent-line"/>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      </div>

      <div className="mono" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--text-primary)' }}>
        {display}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: trend >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)' }}>
            {trend >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</span>}
      </div>
    </div>
  );
}

// ── TOPBAR ────────────────────────────────────────────────────────────────────
export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 28px', borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.02em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 540 }: {
  title: string; onClose: () => void; children: ReactNode; width?: number;
}) {
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ padding: '22px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function Empty({ icon, title, desc, action }: { icon: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>{desc}</div>}
      {action}
    </div>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'var(--accent-cyan)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: 'var(--bg-deep)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .8s cubic-bezier(.16,1,.3,1)' }}/>
    </div>
  );
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border-subtle), transparent)' }}/>
    </div>
  );
}

// ── FORM FIELD ────────────────────────────────────────────────────────────────
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ── ALERT BOX ────────────────────────────────────────────────────────────────
export function AlertBox({ type = 'info', children }: { type?: 'info' | 'warning' | 'error' | 'success'; children: ReactNode }) {
  const cfg = {
    info:    { bg: 'var(--accent-cyan-dim)',   border: 'var(--accent-cyan)',   icon: 'ℹ' },
    warning: { bg: 'var(--accent-amber-dim)',  border: 'var(--accent-amber)',  icon: '⚠' },
    error:   { bg: 'var(--accent-pink-dim)',   border: 'var(--accent-pink)',   icon: '✗' },
    success: { bg: 'var(--accent-green-dim)',  border: 'var(--accent-green)',  icon: '✓' },
  }[type];
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: cfg.bg,
      border: `1px solid ${cfg.border}33`, borderRadius: 'var(--radius-sm)', fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
      <div style={{ color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}
