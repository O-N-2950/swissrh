# SwissRH — Contexte Projet
_Dernière mise à jour : 2026-03-10_

## Écosystème Neukomm Group
- **Holding** : Neukomm Group (neukomm-group.ch)
- **Entité FINMA** : WW Finance Group Sàrl (F01042365)
- **Fondateur** : Olivier Neukomm
- **Repo** : O-N-2950/swissrh
- **Stack** : Node.js + TypeScript + Express / PostgreSQL / React + Vite + Tailwind
- **Deploy** : Railway (token: ca6cccac-4eb0-4161-8ece-e93917feac77)
- **SSO partagé** : Magic Link WinWin ↔ SwissRH (cookie `ww_session` JWT)

## État actuel — 2026-03-10

### ✅ Backend — PRODUCTION READY
| Module | Fichier | Endpoints |
|--------|---------|-----------|
| Employees | server/api/employees.ts | 6 (CRUD + chiffrement AVS AES-256) |
| Salary | server/api/salary.ts | 4 (calcul + payslips) |
| Absences | server/api/absences.ts | 14 (approve/reject/balances/alerts) |
| Time | server/api/timeentries.ts | 6 (pointage LTr) |
| Reports | server/api/reports.ts | 2 (dashboard + AVS) |
| Exports | server/api/exports.ts | 3 (CSV employees/payslips/avs) |
| GDPR/nLPD | server/api/gdpr.ts | 4 (accès/suppression/audit) |
| Company | server/api/company.ts | 2 (get/put) |
| Auth SSO | server/auth/sso.ts | SSO Magic Link WinWin |

### ✅ Sécurité (audit 7 critiques — commit 0041840)
- Chiffrement AES-256-GCM pour AVS/IBAN
- JWT avec rôles : admin | rh_manager | employee
- Audit log sur toutes les actions sensibles
- nLPD : droit d'accès (art.8) + suppression (art.17)
- Variables d'environnement documentées + check au startup
- Tests unitaires : 47 tests vitest (taux 2025)
- Exports sécurisés : requireManager + watermark CONFIDENTIEL

### ✅ SSO Magic Link (commits e610beb + 85bbd33)
- WinWin émet un `transfer_token` JWT (5min, nonce anti-replay)
- SwissRH valide et crée/retrouve l'utilisateur → `srh_session`
- Table `sso_nonces` pour anti-replay

### ✅ Frontend — TOUTES PAGES CÂBLÉES (2026-03-10)
| Page | État |
|------|------|
| Dashboard | ✅ Données réelles API `/reports/dashboard` |
| Employees | ✅ CRUD complet + modal + delete |
| SalaryCalc | ✅ Calcul temps réel (moteur local + API) |
| Absences | ✅ Approve/reject + soldes vacances API |
| TimeTracking | ✅ Résumé mensuel API |
| Payroll | ✅ Liste payslips par mois/année |
| Vacations | ✅ Soldes + pro-rata par année |
| Reports | ✅ Export CSV AVS + employees + payslips |
| Settings | ✅ Paramètres entreprise + taux assurance |

### 🔴 Manquant (bloquant prod)
1. **Railway deploy** — projet pas encore créé (incident résolu ?)
2. **PDF bulletins de salaire** — Puppeteer/PDFKit pas implémenté
3. **Auth réelle** — Login connecté API (actuellement mock `onLogin()`)

## Taux officiels 2025
| Assurance | Employé | Employeur |
|-----------|---------|-----------|
| AVS/AI/APG | 5.3% + 0.7% + 0.225% | idem |
| AC | 1.1% (cap 12'350/m) | idem |
| ACE | 0.5% solidarité (> 148'200) | — |
| LPP (25-34) | 3.5% | 3.5% |
| LPP (35-44) | 5% | 5% |
| LPP (45-54) | 7.5% | 7.5% |
| LPP (55+) | 9% | 9% |
| LAA NP | 1.3% | — |
| LAA P | — | 0.8% |
| IJM | 0.75% | 0.75% |
| All. familiales | — | 1.4% |

## Variables d'environnement requises
```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=64chars
ENCRYPTION_KEY=64hex
RESEND_API_KEY=re_...
WINWIN_SSO_SECRET=same_both_apps
SWISSRH_APP_URL=https://swissrh.ch
WINWIN_APP_URL=https://winwin.swiss
```
