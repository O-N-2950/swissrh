# SwissRH — Contexte Projet
_Dernière mise à jour : 2026-03-10 (session 4)_

## Écosystème Neukomm Group
- **Holding** : Neukomm Group (neukomm-group.ch)
- **Entité FINMA** : WW Finance Group Sàrl (F01042365)
- **Fondateur** : Olivier Neukomm
- **Repo GitHub** : O-N-2950/swissrh
- **Stack** : Node.js + TypeScript + Express / PostgreSQL / React + Vite + Tailwind
- **Deploy cible** : Railway (token: ca6cccac-4eb0-4161-8ece-e93917feac77)
- **SSO partagé** : Magic Link WinWin ↔ SwissRH (cookie `srh_session` JWT)
- **Workspace Railway** : 3bcd3c2b-04d6-4979-95ff-c5862f606fd2

---

## État réel — 2026-03-10

### ✅ Backend — PRODUCTION READY

| Module | Fichier | Endpoints |
|--------|---------|-----------|
| Employees | server/api/employees.ts | 6 (CRUD + AES-256 AVS) |
| Salary | server/api/salary.ts | 4 (calcul + payslips + batch) |
| Absences | server/api/absences.ts | 14 (approve/reject/balances/alerts) |
| Time | server/api/timeentries.ts | 6 (pointage LTr + DEXTRA) |
| Reports | server/api/reports.ts | 2 (dashboard KPI + AVS) |
| Exports | server/api/exports.ts | 3 (CSV employees/payslips/avs) |
| GDPR/nLPD | server/api/gdpr.ts | 4 (accès art.8 / suppression art.17) |
| Company | server/api/company.ts | 2 (get/put + sector) |
| Auth | server/auth/routes.ts | 5 (login/logout/me/setup/setup-check) |
| PDF Payslip | server/api/pdf-payslip.ts | 2 (PDFKit A4) |
| SSO WinWin | server/auth/sso.ts | Magic Link JWT + nonces anti-replay |
| Seed demo | server/db/seed-demo.ts | POST /api/admin/seed-demo |

### ✅ Moteur de salaire — swiss-salary-v2.ts + sector-contributions.ts

**Standard (Swissdec 2025) :**
AVS 5.3% · AI 0.7% · APG 0.225% · AC 1.1% (cap 12'350) · ACE 0.5%
LPP par âge (7/10/15/18%) · LAA NP 1.3% · LAA P 0.8% · LAAC · IJM 0.75% · Alloc. fam. 1.4%

**9 secteurs avec cotisations CCT spécifiques :**
🏗 Construction : FAR 1.5% + Parifonds 0.3%+0.3% + SUVA majoré + 13e obligatoire
🍽 Hôtellerie : REKA 1%+1% + Fonds L-GAV 0.7%+0.3% + LPP sectorielle + nuit dès 00h
⚙️ MEM : Fonds 0.2% + 13e obligatoire
🧹 Nettoyage : Fonds 0.6%+0.2% + nuit dès 20h
✂️ Coiffure : Fonds 0.4%+0.1%
🚛 Transport : FAR 1.3% + OTR2 + 13e
🌾 Agriculture : Alloc. fam. majorées + 48h/sem
🛍 Commerce : Salaires min cantonaux
🏥 Santé/EMS : Fonds + nuit dès 22h + fériés x2 + 13e

**Impôt à la source :** Barèmes A/B/C/D/H × 5 cantons (ZH/BE/GE/VD/JU)
**13e salaire :** 3 modes (provision / décembre / juillet+décembre)
**DEXTRA :** nuit/dimanche/fériés/HS par secteur CCT
**Autres :** RHT · APG · décompte sortie · Lohnausweis 15 cases · CO 324a

### ✅ Sécurité
AES-256-GCM · JWT rôles (admin|rh_manager|employee) · audit log · nLPD · 47 tests vitest

### ✅ Frontend — 9 pages câblées API réelle
Dashboard actionnable · Employees CRUD · SalaryCalc 9 secteurs+IS+13e
TimeTracking grille 7j+shifts+DEXTRA · Payroll + lancer la paie (flow 3 étapes)
Absences approve/reject · Vacations · Reports CSV · Settings secteur

### ✅ Auth
Session persistante · Setup Wizard · SSO WinWin · Logout

### ✅ Seed demo
admin@demo.ch / Demo2025! · Dupont Industries Sàrl JU · 5 employés

---

## 🔴 SEUL BLOQUANT : Railway Deploy
1. Créer projet Railway + service GitHub `O-N-2950/swissrh`
2. Ajouter plugin PostgreSQL
3. Injecter variables d'environnement (ci-dessous)
4. 22 patches migration se jouent au 1er démarrage
5. Pointer `swissrh.ch` → Railway

---

## Variables d'environnement

```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=<64 chars>
ENCRYPTION_KEY=<64 hex>
RESEND_API_KEY=re_...
WINWIN_SSO_SECRET=<même valeur sur winwin>
SWISSRH_APP_URL=https://swissrh.ch
WINWIN_APP_URL=https://winwin.swiss
NODE_ENV=production
```

---

## Git log récent
```
2d06936  feat: cotisations sectorielles complètes — 9 CCT + IS + 13e + salaires min
0fb1309  feat: secteurs + DEXTRA + shifts + lancer la paie + dashboard actionnable
8116821  feat: session persistante + setup wizard + PDF payslips + seed demo
59cd684  feat: frontend 100% câblé API
e610beb  feat: SSO Magic Link WinWin ↔ SwissRH
0041840  security: 7 critiques corrigées
```
