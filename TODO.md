# SwissRH — TODO List
_Mis à jour : 2026-03-10 (session 2)_

## 🔴 BLOQUANT PROD (Railway)

- [ ] **Railway deploy** — créer projet, GitHub service, PostgreSQL, env vars
- [ ] **Migrations initiales** — vérifier que les 21 patches passent au 1er deploy
- [ ] **Domain** — swissrh.ch → Railway

## ✅ FAIT AUJOURD'HUI

- [x] **Session persistante** — `/auth/me` au démarrage, cookie srh_session
- [x] **Setup Wizard** — onboarding 2 étapes (company + admin) au 1er démarrage
- [x] **Auth/setup-check** — détecte si la DB est vide → redirige vers setup
- [x] **Logout** — bouton dans sidebar, clearCookie
- [x] **User info dans sidebar** — initiales + prénom + rôle depuis session
- [x] **PDF Bulletins de salaire** — PDFKit A4, design professionnel (chargé en production)
  - Layout: header band + blocs company/employé + revenus + déductions + net + charges patronales
  - Footer CONFIDENTIEL + mentions légales
  - Route: `GET /api/salary/payslip/:id/pdf`
- [x] **Bouton PDF** dans page Payroll (📄 par bulletin)
- [x] **pdfkit** ajouté à package.json
- [x] **Seed demo data** — script complet + route `POST /api/admin/seed-demo` (dev only)
  - Company: Dupont Industries Sàrl, JU
  - Login: admin@demo.ch / Demo2025!
  - 5 employés réalistes (CH/B/G), absences, time entries

## 🟠 PROCHAIN SPRINT

- [ ] **Lohnausweis PDF** — certificat de salaire 15 cases (obligatoire fin d'année)
- [ ] **Module paie mensuel** — bouton "Lancer la paie" : calcul automatique pour tous les employés
- [ ] **Email Resend** — alertes permis + demandes congés en attente
- [ ] **Portail employé** — vue lecture seule (fiche de paie, absences, pointage)
- [ ] **Tests E2E Playwright** — login → dashboard → créer employé → calcul salaire

## 🟢 BACKLOG (v2)

- [ ] Stripe billing
- [ ] Intégration WinWin upsell LAA/LPP
- [ ] Swissdec 5.0 certification
- [ ] AVS XML ELM export structuré
- [ ] Mobile PWA

## STATUS GLOBAL

| Couche | État |
|--------|------|
| Backend API | ✅ Production ready |
| Sécurité (7 critiques) | ✅ Corrigé |
| SSO WinWin | ✅ Implémenté |
| Frontend (9 pages) | ✅ Toutes câblées |
| Auth session persistante | ✅ |
| Setup wizard | ✅ |
| PDF bulletins | ✅ |
| Seed demo | ✅ |
| Railway deploy | 🔴 En attente |
