import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { SalaryCalc } from './pages/SalaryCalc';
import { Spinner } from './components/UI';
import type { Page } from './lib/types';

// ── Placeholder ──────────────────────────────────────────────────────────────
function ComingSoon({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
      <div style={{ fontSize: 56 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>{desc}</div>
      <button className="btn btn-primary" style={{ marginTop: 8 }}>Bientôt disponible</button>
    </div>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────
function Login() {
  const { login } = useAuth();
  const [email, setEmail]   = useState('admin@swissrh.ch');
  const [pass, setPass]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleLogin() {
    setLoading(true); setError('');
    try { await login(email, pass); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="theme-dark" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(49,118,166,.08) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(91,164,217,.05) 0%, transparent 50%), #06070e' }}/>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at center,black 30%,transparent 70%)' }}/>

      <div className="animate-fade-in" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, background: '#D4232A', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 20 20" fill="white"><rect x="8.5" y="2" width="3" height="16"/><rect x="2" y="8.5" width="16" height="3"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-.03em', lineHeight: 1 }}>SWISSRH</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 2 }}>Payroll Suite 2025</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(15,18,32,.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: 32 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'white', marginBottom: 4 }}>Connexion</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Accès sécurisé à votre espace RH</div>

          {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, fontSize: 12, color: '#ef4444', marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {[['Email', email, setEmail, 'email'], ['Mot de passe', pass, setPass, 'password']].map(([lbl, val, setter, type]) => (
              <div key={lbl as string}>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{lbl as string}</label>
                <input className="inp" type={type as string} value={val as string} onChange={e => (setter as any)(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ background: 'rgba(255,255,255,.06)', borderColor: 'rgba(255,255,255,.1)', color: 'white', fontSize: 14 }}/>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleLogin} disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, fontWeight: 700 }}>
            {loading ? <><Spinner size={16}/>&nbsp;Connexion…</> : '→ Se connecter'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
            🔒 TLS · Données hébergées en Suisse · SWISSRH by Groupe NEO
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={28}/>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</span>
      </div>
    </div>
  );

  if (!user) return <Login/>;

  const PAGES: Record<Page, JSX.Element> = {
    dashboard: <Dashboard/>,
    salary:    <SalaryCalc/>,
    employees: <ComingSoon icon="👥" title="Collaborateurs" desc="Fiche employé complète, historique salaires, gestion des permis de séjour et alertes d'expiration."/>,
    payroll:   <ComingSoon icon="💳" title="Module Paie" desc="Création et validation des bulletins de salaire mensuels avec génération PDF Swissdec."/>,
    absences:  <ComingSoon icon="🗓️" title="Gestion des absences" desc="Workflow complet : vacances, maladie, accident, maternité, militaire avec calcul automatique CO 324a."/>,
    vacations: <ComingSoon icon="🏖️" title="Soldes vacances" desc="Gestion des soldes, pro-rata à l'entrée/sortie, report max 5j, alertes dépassement."/>,
    time:      <ComingSoon icon="⏱️" title="Pointage" desc="Feuilles de temps hebdomadaires en centièmes ou H:MM, vérification pauses LTr Art. 15."/>,
    reports:   <ComingSoon icon="📊" title="Rapports" desc="Déclaration AVS, Lohnausweis 15 cases, impôt à la source, export Swissdec ELM XML."/>,
    documents: <ComingSoon icon="📄" title="Documents RH" desc="Contrats, attestations CO 330a, certificats de travail, archivage numérique."/>,
    settings:  <ComingSoon icon="⚙️" title="Paramètres" desc="Configuration entreprise, taux d'assurance, jours fériés cantonaux, intégrations."/>,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-void)' }}>
      <Sidebar page={page} setPage={setPage}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {PAGES[page]}
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <AppInner/>
    </AuthProvider>
  );
}
