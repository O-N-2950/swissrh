import { useState } from 'react';
import {
  LayoutDashboard, Users, Calculator, CreditCard, CalendarOff,
  Umbrella, Clock, BarChart2, FileText, Settings,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { Page } from '../lib/types';

const NAV: Array<{ id: Page; icon: any; label: string; badge?: number }> = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard'      },
  { id: 'employees',  icon: Users,           label: 'Collaborateurs' },
  { id: 'salary',     icon: Calculator,      label: 'Calculateur'    },
  { id: 'payroll',    icon: CreditCard,      label: 'Paie'           },
  { id: 'absences',   icon: CalendarOff,     label: 'Absences'       },
  { id: 'vacations',  icon: Umbrella,        label: 'Vacances'       },
  { id: 'time',       icon: Clock,           label: 'Pointage'       },
  { id: 'reports',    icon: BarChart2,       label: 'Rapports'       },
  { id: 'documents',  icon: FileText,        label: 'Documents'      },
  { id: 'settings',   icon: Settings,        label: 'Paramètres'     },
];

interface Props { page: Page; setPage: (p: Page) => void; }

export function Sidebar({ page, setPage }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div style={{
      width: collapsed ? 58 : 220,
      background: 'var(--sidebar-bg)',
      height: '100vh', display: 'flex', flexDirection: 'column',
      transition: 'width .25s cubic-bezier(.16,1,.3,1)',
      overflow: 'hidden', flexShrink: 0,
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? '20px 14px' : '20px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,.06)', marginBottom: 8, flexShrink: 0,
      }}>
        {/* Swiss cross */}
        <div style={{ width: 32, height: 32, background: '#D4232A', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="19" height="19" viewBox="0 0 20 20" fill="white">
            <rect x="8.5" y="2" width="3" height="16"/><rect x="2" y="8.5" width="16" height="3"/>
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'white', letterSpacing: '-.02em', lineHeight: 1 }}>SWISSRH</div>
            <div style={{ fontSize: 9, color: 'var(--sidebar-text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 1 }}>Payroll Suite</div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <div style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {NAV.map(n => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <div key={n.id}
              className={`sidebar-item${active ? ' active' : ''}`}
              onClick={() => setPage(n.id)}
              title={collapsed ? n.label : undefined}
              style={{ justifyContent: collapsed ? 'center' : undefined, gap: collapsed ? 0 : 10, padding: collapsed ? '9px 0' : '9px 14px' }}>
              <Icon size={16} style={{ flexShrink: 0 }}/>
              {!collapsed && <span style={{ fontSize: 13 }}>{n.label}</span>}
              {!collapsed && n.badge && (
                <span style={{ marginLeft: 'auto', background: 'var(--accent-cyan)', color: 'white',
                  borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{n.badge}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom ── */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        {/* Collapse toggle */}
        <div className="sidebar-item" onClick={() => setCollapsed(!collapsed)}
          style={{ justifyContent: collapsed ? 'center' : undefined, gap: collapsed ? 0 : 10, padding: collapsed ? '8px 0' : '8px 14px' }}>
          {collapsed ? <ChevronRight size={15}/> : <><ChevronLeft size={15}/><span style={{ fontSize: 12, color: 'var(--sidebar-text-muted)' }}>Réduire</span></>}
        </div>

        {/* User */}
        <div className="sidebar-item" onClick={logout}
          style={{ marginTop: 4, justifyContent: collapsed ? 'center' : undefined, gap: collapsed ? 0 : 10, padding: collapsed ? '8px 0' : '8px 14px' }}
          title={collapsed ? 'Déconnexion' : undefined}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sidebar-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#1a2332', flexShrink: 0 }}>
            {user ? (user.first_name[0] + user.last_name[0]).toUpperCase() : 'AD'}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user ? `${user.first_name} ${user.last_name}` : 'Admin'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--sidebar-text-muted)' }}>Déconnexion</div>
            </div>
          )}
          {!collapsed && <LogOut size={13} style={{ color: 'var(--sidebar-text-muted)', flexShrink: 0 }}/>}
        </div>
      </div>
    </div>
  );
}
