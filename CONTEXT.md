# SwissRH — Contexte Projet
_Dernière mise à jour : 2026-03-12 (session 6 — emails Resend)_

## Écosystème Neukomm Group
- **Holding** : Neukomm Group (neukomm-group.ch)
- **Entité FINMA** : WW Finance Group Sàrl (F01042365)
- **Fondateur** : Olivier Neukomm
- **Repo GitHub** : O-N-2950/swissrh
- **Stack** : Node.js + TypeScript + Express / PostgreSQL / React + Vite + Tailwind
- **Deploy** : Railway (token: ca6cccac-4eb0-4161-8ece-e93917feac77)
- **URL prod** : https://swissrh.ch (DNS propagé) + https://swissrh-app-production.up.railway.app
- **SSO partagé** : Magic Link WinWin ↔ SwissRH (cookie `srh_session` JWT)
- **Workspace Railway** : 3bcd3c2b-04d6-4979-95ff-c5862f606fd2
- **Project ID** : 4fb18dc7-c2da-4658-8b26-7b092ca8ed95
- **Service ID** : 7092882c-e18c-4a71-99b7-bcca6f0e69d5
- **Env ID prod** : dcc78cf4-e5df-433b-837c-c732af537a47

---

## État réel — 2026-03-12 ✅ EN PRODUCTION

### Backend — 13 modules + portail + emails

| Module | Fichier | Endpoints |
|--------|---------|-----------| 
| Employees | server/api/employees.ts | 6 (CRUD + AES-256 AVS) |
| Salary | server/api/salary.ts | 5 (calcul + payslips + batch + **payroll-notify**) |
| Absences | server/api/absences.ts | 14 (approve/reject/balances/alerts) |
| Time | server/api/timeentries.ts | 6 (pointage LTr + DEXTRA) |
| Reports | server/api/reports.ts | 2 (dashboard KPI + AVS) |
| Exports | server/api/exports.ts | 3 (CSV employees/payslips/avs) |
| GDPR/nLPD | server/api/gdpr.ts | 4 (accès art.8 / suppression art.17) |
| Company | server/api/company.ts | 2 (get/put + sector) |
| Auth | server/auth/routes.ts | 5 (login/logout/me/setup/setup-check) |
| PDF Payslip | server/api/pdf-payslip.ts | 2 (PDFKit A4) |
| SSO WinWin | server/auth/sso.ts | Magic Link JWT + nonces anti-replay |
| Terminations | server/api/terminations.ts | 9 (CO 335c/336c complet) |
| **Employee Portal** | **server/api/employee-portal.ts** | **5 (me, payslips, absences, leave, balance)** |
| Seed demo | server/db/seed-demo.ts | POST /api/admin/seed-demo |

### Emails Resend — server/utils/email.ts ✅ SESSION 6
5 templates HTML branded SwissRH :
1. `sendLeaveRequestToRH` — congé soumis → RH (hook: POST /portal/leave)
2. `sendLeaveDecisionToEmployee` — approuvé/refusé → employé (hook: PUT /absences/:id/approve|reject)
3. `sendPermitExpiryAlert` — J-30 / J-7 permis expirant → admin (scheduler 8h00)
4. `sendPayrollLaunched` — paie lancée → admin (hook: POST /salary/payroll-notify)
5. `sendPayslipReady` — bulletin dispo → employé (hook: POST /salary/payroll-notify?notifyEmployees=true)

### Alertes permis — server/utils/permit-alerts.ts ✅ SESSION 6
- Scheduler quotidien à 8h00 (`startPermitAlerts()`)
- Vérifie permis expirant J-30 et J-7 pour toutes les entreprises
- Email groupé par admin/entreprise

### Moteur de salaire — swiss-salary-v2.ts + sector-contributions.ts

**Standard (Swissdec 2025) :**
AVS 5.3% · AI 0.7% · APG 0.225% · AC 1.1% (cap 12'350) · ACE 0.5%
LPP par âge (7/10/15/18%) · LAA NP 1.3% · LAA P 0.8% · LAAC · IJM 0.75% · Alloc. fam. 1.4%

**9 secteurs CCT :** Construction · Hôtellerie · MEM · Nettoyage · Coiffure · Transport · Agriculture · Commerce · Santé/EMS

**IS barèmes A/B/C/D/H × 5 cantons (ZH/BE/GE/VD/JU)**
**13e salaire :** 3 modes (provision / décembre / juillet+décembre)
**DEXTRA :** nuit/dimanche/fériés/HS par secteur CCT

### Sécurité
AES-256-GCM · JWT rôles (admin|rh_manager|employee) · audit log · nLPD · 47 tests vitest

### Frontend — 10 pages admin + portail employé

**Pages admin (sidebar) :**
Dashboard actionnable · Employees CRUD · SalaryCalc 9 secteurs+IS+13e
TimeTracking grille 7j+shifts+DEXTRA · Payroll + lancer la paie (flow 3 étapes)
Absences approve/reject · Vacations · Reports CSV · Settings secteur
Licenciements CO 335c/336c (TerminationNew · SickLeaveModal · TerminationDetail)

**Portail employé mobile-first (rôle employee = accès auto) :**
- 🏠 Accueil — KPIs vacances, dossier RH, alerte permis
- 💶 Bulletins — liste + téléchargement PDF
- 📅 Absences — historique + statuts colorés
- ✉️ Demande — congé avec calcul jours ouvrables temps réel

### Auth
Session persistante · Setup Wizard · SSO WinWin · Logout
Rôle `employee` → portail auto | Admin peut prévisualiser via sidebar

### Seed demo
admin@demo.ch / Demo2025! · Dupont Industries Sàrl JU · 5 employés

---

## DNS swissrh.ch — CONFIGURÉ ✅
- `www.swissrh.ch` → CNAME Railway ✅ validé
- `swissrh.ch` → A record 66.33.22.5 ✅ propagé

**Infomaniak :** Account ID 1569907 | Token API dans les memories

---

## Git log récent
```
61719c5  feat: start permit alerts scheduler on startup
65fa2571 feat: POST /salary/payroll-notify — email admin + employees
1f2d6f4d feat: email leave request → RH on portal POST /leave
6429c558 feat: email approve/reject absences → employee (Resend)
08097c82 feat: permit expiry alerts — daily 8h00 check
764d9b67 feat: email service Resend — 5 templates HTML branded
ddf7c6d  fix: unterminated string literal in server/index.ts
d161b3b  feat: employee portal mobile-first
```

---

## Variables d'environnement (Railway prod)
```
DATABASE_URL=postgresql://...  (Railway plugin PostgreSQL)
JWT_SECRET_KEY=<64 chars>
ENCRYPTION_KEY=<64 hex>
RESEND_API_KEY=re_...
WINWIN_SSO_SECRET=<même valeur sur winwin>
SWISSRH_APP_URL=https://swissrh.ch
WINWIN_APP_URL=https://winwin.swiss
NODE_ENV=production
```
