import { useState, useEffect } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Topbar, SectionHeader, AlertBox, Field } from '../components/UI';
import { calcSalary, fmt, CH_2025 } from '../lib/salary';

export function SalaryCalc() {
  const [gross,     setGross]    = useState(6500);
  const [age,       setAge]      = useState(38);
  const [rate,      setRate]     = useState(100);
  const [hasLaac,   setHasLaac]  = useState(false);
  const [laacRate,  setLaacRate] = useState(0.5);
  const [hasIjm,    setHasIjm]   = useState(true);
  const [salType,   setSalType]  = useState<'monthly' | 'hourly'>('monthly');
  const [hourlyH,   setHourlyH]  = useState(42);
  const [showER,    setShowER]   = useState(false);

  const effectiveGross = gross * (rate / 100);
  const r = calcSalary(effectiveGross, age, { hasLaac, laacRate: laacRate / 100, hasIjm });
  const lppLabel = age < 25 ? '—' : age < 35 ? '7%' : age < 45 ? '10%' : age < 55 ? '15%' : '18%';

  const dedRows = [
    { label: 'AVS — Assurance vieillesse (5.3%)',     emp: r.avs,   er: r.avsEr   },
    { label: 'AI — Invalidité (0.7%)',                 emp: r.ai,    er: r.aiEr    },
    { label: 'APG — Perte de gain (0.225%)',           emp: r.apg,   er: r.apgEr   },
    { label: `AC — Chômage (1.1%) · plaf. 12'350 /m`, emp: r.ac,    er: r.acEr, base: r.acBase },
    r.ace > 0 && { label: 'ACE — Solidarité (0.5%) · dépass. plaf.', emp: r.ace, er: 0 },
    r.lpp > 0 && { label: `LPP — 2e pilier (${lppLabel}) · part emp.`, emp: r.lpp,  er: r.lppEr, base: r.lppBase },
    { label: "LAA NP — Accident non-prof. (1.3%)",   emp: r.laaNp, er: 0,          base: r.laaBase },
    { label: "LAA P — Accident prof. (0.8%)",          emp: 0,       er: r.laaPEr,  base: r.laaBase },
    hasLaac && r.laacBase > 0 && { label: `LAAC — Complémentaire (${laacRate}%)`, emp: r.laac, er: r.laacEr, base: r.laacBase },
    hasIjm && { label: "IJM — Indemnité maladie (0.75%)",            emp: r.ijm,   er: r.ijmEr  },
    { label: "Alloc. familiales (1.4%) — employeur",  emp: 0,       er: r.famEr  },
  ].filter(Boolean) as Array<{ label: string; emp: number; er: number; base?: number }>;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-void)' }}>
      <Topbar title="Calculateur de salaire" subtitle="Taux 2025 officiels — Swissdec 5.0 conforme"
        actions={
          <div className="tab-group">
            <button className={`tab-btn${!showER ? ' active' : ''}`} onClick={() => setShowER(false)}>Employé</button>
            <button className={`tab-btn${showER ? ' active' : ''}`} onClick={() => setShowER(true)}>Coût employeur</button>
          </div>
        }/>

      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionHeader>⚙️ Paramètres</SectionHeader>

            <Field label="Type de salaire">
              <div className="tab-group">
                <button className={`tab-btn${salType==='monthly'?' active':''}`} onClick={() => setSalType('monthly')}>Mensuel</button>
                <button className={`tab-btn${salType==='hourly'?' active':''}`}  onClick={() => setSalType('hourly')}>Horaire</button>
              </div>
            </Field>

            <Field label={salType === 'monthly' ? 'Salaire mensuel brut (CHF)' : 'Taux horaire (CHF/h)'}>
              <input className="inp mono" type="number" value={gross} onChange={e => setGross(+e.target.value)}
                style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}/>
              {salType === 'hourly' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  ≈ CHF {fmt(gross * hourlyH * 4.33, 0)} /m · {hourlyH}h/sem
                </div>
              )}
            </Field>

            {salType === 'hourly' && (
              <Field label="Heures hebdomadaires">
                <input className="inp" type="number" value={hourlyH} onChange={e => setHourlyH(+e.target.value)} min={8} max={45}/>
              </Field>
            )}

            <Field label="Âge de l'employé" hint={`LPP: ${lppLabel} taux global · Part employé: ${r.lppRate > 0 ? (r.lppRate * 100).toFixed(1) + '%' : 'aucune'}`}>
              <input className="inp" type="number" value={age} onChange={e => setAge(+e.target.value)} min={16} max={70}/>
            </Field>

            <Field label={`Taux d'activité — ${rate}%`}>
              <input type="range" min={10} max={100} step={10} value={rate} onChange={e => setRate(+e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)', marginBottom: 4 }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                <span>10%</span><span>50%</span><span>100%</span>
              </div>
            </Field>

            {/* Toggles */}
            {[
              { label: 'IJM — Indemnité journalière maladie', hint: '0.75% emp. + 0.75% er.', val: hasIjm, set: setHasIjm },
              { label: 'LAAC — Assurance complémentaire', hint: `Sur salaire > 12'350 CHF/m`, val: hasLaac, set: setHasLaac },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-deep)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.hint}</div>
                </div>
                <div onClick={() => t.set(!t.val)} style={{ cursor: 'pointer',
                  width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                  background: t.val ? 'var(--accent-cyan)' : 'var(--border-default)',
                  position: 'relative', transition: 'background .2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: t.val ? 20 : 3, width: 16, height: 16,
                    background: 'white', borderRadius: '50%', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.25)' }}/>
                </div>
              </div>
            ))}

            {hasLaac && (
              <Field label={`Taux LAAC — ${laacRate}% chacun`}>
                <input className="inp" type="number" value={laacRate} onChange={e => setLaacRate(+e.target.value)} step={0.1} min={0.1} max={5}/>
              </Field>
            )}
          </div>

          {/* Summary card */}
          <div className="card" style={{ padding: 20 }}>
            <SectionHeader>📋 Résumé</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Salaire brut',         val: r.gross,    color: 'var(--text-primary)', big: false },
                { label: 'Déductions employé',   val: -r.totalDed, color: 'var(--accent-pink)', big: false },
                { label: '→ Net à verser',        val: r.net,      color: 'var(--accent-green)', big: true },
                { label: 'Charges patronales',   val: r.totalEr,  color: 'var(--accent-amber)', big: false },
                { label: 'Coût total employeur', val: r.totalCost,color: 'var(--text-secondary)', big: false },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: `${row.big ? 12 : 8}px 0`,
                  borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                  borderBottom: row.big ? '2px solid var(--border-default)' : undefined }}>
                  <span style={{ fontSize: row.big ? 14 : 12, fontWeight: row.big ? 700 : 500, color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span className="mono" style={{ fontSize: row.big ? 19 : 13, fontWeight: row.big ? 800 : 600, color: row.color }}>
                    {row.val < 0 ? '–' : ''} CHF {fmt(Math.abs(row.val))}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Taux déductions', val: `${(r.totalDed / r.gross * 100).toFixed(1)}%`, color: 'var(--accent-pink)' },
                { label: 'Coût / net',      val: `${(r.totalCost / r.net).toFixed(2)}×`,        color: 'var(--accent-cyan)' },
              ].map((m, i) => (
                <div key={i} style={{ padding: '10px 12px', background: `${m.color}0d`, borderRadius: 8, border: `1px solid ${m.color}22` }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{m.label}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: full breakdown ── */}
        <div className="card animate-slide-up">
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Décompte complet des charges sociales</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Taux 2025 — AVS/AI/APG + AC + ACE + LPP + LAA NP/P + LAAC + IJM
              </div>
            </div>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr',
            gap: 12, padding: '9px 20px', background: 'var(--bg-deep)',
            borderBottom: '1px solid var(--border-subtle)' }}>
            {['Cotisation', 'Base CHF', 'Employé', 'Employeur'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</div>
            ))}
          </div>

          {dedRows.map((row, i) => (
            <div key={i} className="data-row" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr',
              gap: 12, padding: '11px 20px', alignItems: 'center',
              animation: `slideUp .4s cubic-bezier(.16,1,.3,1) ${i * 25}ms both` }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{row.label}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {row.base !== undefined ? `${fmt(row.base, 0)}` : `${fmt(r.gross, 0)}`}
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: row.emp > 0 ? 'var(--accent-pink)' : 'var(--text-muted)' }}>
                {row.emp > 0 ? `– ${fmt(row.emp)}` : '—'}
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: row.er > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                {row.er > 0 ? `– ${fmt(row.er)}` : '—'}
              </div>
            </div>
          ))}

          {/* Total row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr',
            gap: 12, padding: '14px 20px', background: 'var(--bg-deep)',
            borderTop: '2px solid var(--border-default)' }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>TOTAL</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 12 }}>CHF {fmt(r.gross, 0)}</div>
            <div className="mono" style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent-pink)' }}>– CHF {fmt(r.totalDed)}</div>
            <div className="mono" style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent-amber)' }}>– CHF {fmt(r.totalEr)}</div>
          </div>

          {/* Net */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(16,185,129,.04)' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent-green)' }}>Net à verser</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salaire brut – déductions employé</div>
            </div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent-green)' }}>
              CHF {fmt(r.net)}
            </div>
          </div>

          {/* Employer cost */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)' }}>
            <AlertBox type="info">
              <strong>Coût total employeur : CHF {fmt(r.totalCost)}</strong> — soit {(r.totalCost / r.net).toFixed(2)}× le salaire net.
              Les charges patronales représentent {(r.totalEr / r.gross * 100).toFixed(1)}% du salaire brut.
              {hasLaac && r.laacBase > 0 && ` LAAC calculée sur la tranche ${fmt(r.laacBase)} CHF > plafond.`}
              {r.ace > 0 && ` Cotisation de solidarité ACE appliquée sur la tranche excédentaire.`}
            </AlertBox>
          </div>
        </div>
      </div>
    </div>
  );
}
