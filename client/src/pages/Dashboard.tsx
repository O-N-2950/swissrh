import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, AlertTriangle, Building2, Clock } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KpiCard, Topbar, StatusBadge, SectionHeader, ProgressBar } from '../components/UI';
import { fmt } from '../lib/salary';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const payrollData = MONTHS.slice(0, 7).map((m, i) => ({
  month: m,
  brut:  38200 + Math.round(Math.sin(i * 0.9) * 900),
  net:   29300 + Math.round(Math.sin(i * 0.9) * 700),
  er:    8800  + Math.round(Math.sin(i * 0.9) * 200),
}));

const pieData = [
  { name: 'AVS/AI/APG', value: 3240, color: '#3176A6' },
  { name: 'LPP',        value: 1800, color: '#8b5cf6' },
  { name: 'AC/ACE',     value: 430,  color: '#10b981' },
  { name: 'LAA',        value: 490,  color: '#f59e0b' },
  { name: 'IJM',        value: 290,  color: '#ef4444' },
];

const deptData = [
  { dept: 'Production', n: 3, brut: 14700 },
  { dept: 'IT',         n: 2, brut: 17700 },
  { dept: 'Admin',      n: 2, brut: 10300 },
  { dept: 'RH',         n: 1, brut: 7200  },
];

const ALERTS = [
  { icon: '🪪', msg: 'Müller Sophie — Permis B expire dans 28 jours', color: 'var(--accent-amber)', type: 'warning' },
  { icon: '📋', msg: 'García Carlos — Demande de congés en attente (5j)', color: 'var(--accent-cyan)', type: 'info' },
  { icon: '🏥', msg: 'Rossi Pietro — Certificat médical requis non reçu', color: 'var(--accent-pink)', type: 'error' },
  { icon: '🏖️', msg: 'Favre Lucie — Solde vacances > 20j (alerte report)', color: 'var(--accent-amber)', type: 'warning' },
];

const RECENT_ABS = [
  { emp: 'Dupont Marc',    type: 'Vacances',     days: 5, status: 'approved', date: '03–07 mars' },
  { emp: 'García Carlos',  type: 'Vacances',     days: 5, status: 'pending',  date: '24–28 mars' },
  { emp: 'Müller Sophie',  type: 'Maladie',      days: 3, status: 'approved', date: '10–12 fév' },
  { emp: 'Rossi Pietro',   type: 'Accident NP',  days: 11,status: 'approved', date: '15–29 jan' },
];

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-display)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color }}>
          <span>{p.name === 'brut' ? 'Brut' : p.name === 'net' ? 'Net' : 'Charges'}</span>
          <span style={{ fontWeight: 700 }}>CHF {fmt(p.value, 0)}</span>
        </div>
      ))}
    </div>
  );
};

export function Dashboard() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-void)' }}>
      <Topbar
        title="Dashboard RH"
        subtitle="Mars 2025 · 8 collaborateurs actifs · Canton JU"
        actions={
          <>
            <button className="btn btn-ghost" style={{ fontSize: 12 }}>📤 Exporter</button>
            <button className="btn btn-primary" style={{ fontSize: 12 }}>▶ Lancer la paie</button>
          </>
        }
      />

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── KPIs ── */}
        <div className="stagger-v2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <KpiCard label="Masse salariale brute"  value={38200} isCurrency sub="mars 2025" color="var(--accent-cyan)"   icon={<DollarSign size={16}/>} trend={2.1}  delay={0}/>
          <KpiCard label="Net total versé"         value={29300} isCurrency sub="ce mois"   color="var(--accent-green)"  icon={<TrendingUp size={16}/>} trend={1.8}  delay={60}/>
          <KpiCard label="Charges patronales"      value={8800}  isCurrency sub="≈ 23% brut" color="var(--accent-amber)" icon={<Building2 size={16}/>}  delay={120}/>
          <KpiCard label="Collaborateurs"          value={8}     isCurrency={false} sub="1 alerte permis"  color="var(--accent-purple)" icon={<Users size={16}/>}     delay={180}/>
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

          {/* Area chart */}
          <div className="card animate-slide-up" style={{ padding: 22 }}>
            <SectionHeader>📈 Masse salariale 2025</SectionHeader>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Brut · Net · Charges — CHF/mois</div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={payrollData} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="gBrut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3176A6" stopOpacity=".18"/>
                    <stop offset="100%" stopColor="#3176A6" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity=".15"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<CUSTOM_TOOLTIP/>}/>
                <Area type="monotone" dataKey="brut" stroke="#3176A6" strokeWidth={2} fill="url(#gBrut)"/>
                <Area type="monotone" dataKey="net"  stroke="#10b981" strokeWidth={2} fill="url(#gNet)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie */}
          <div className="card animate-slide-up" style={{ padding: 22, animationDelay: '.08s' }}>
            <SectionHeader>🧮 Déductions employé</SectionHeader>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Mars 2025 — Total</div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={58}
                  dataKey="value" paddingAngle={2}
                  onMouseEnter={(_, i) => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} opacity={hovered === null || hovered === i ? 1 : .4}
                      strokeWidth={hovered === i ? 2 : 0} stroke="var(--bg-surface)"/>
                  ))}
                </Pie>
                <Tooltip formatter={v => [`CHF ${fmt(v as number, 0)}`]}
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }}/>
                    <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>CHF {fmt(d.value, 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* Alerts */}
          <div className="card animate-slide-up" style={{ padding: 20, animationDelay: '.12s' }}>
            <SectionHeader>
              🔔 Alertes
              <span className="badge" style={{ background: 'var(--accent-pink-dim)', color: 'var(--accent-pink)', marginLeft: 6 }}>
                {ALERTS.length}
              </span>
            </SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ALERTS.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 10px',
                  background: `${a.color}0d`, borderRadius: 8, border: `1px solid ${a.color}22` }}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent absences */}
          <div className="card animate-slide-up" style={{ padding: 20, animationDelay: '.18s' }}>
            <SectionHeader>🗓️ Absences récentes</SectionHeader>
            <div>
              {RECENT_ABS.map((a, i) => (
                <div key={i} className="data-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{a.emp}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {a.type} · {a.days}j · {a.date}
                    </div>
                  </div>
                  <StatusBadge status={a.status}/>
                </div>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div className="card animate-slide-up" style={{ padding: 20, animationDelay: '.24s' }}>
            <SectionHeader>🏢 Répartition par service</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deptData.map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600 }}>{d.dept}</span>
                    <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>CHF {fmt(d.brut, 0)}</span>
                  </div>
                  <ProgressBar value={d.brut} max={18000}/>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{d.n} collaborateur{d.n > 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
