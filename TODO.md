# SwissRH — TODO List
_Mis à jour : 2026-03-10_

## 🔴 BLOQUANT PROD (cette semaine)

- [ ] **Railway deploy** — créer projet, ajouter GitHub service, PostgreSQL, inject env vars
- [ ] **Auth Login réel** — connecter Login.tsx à `POST /api/auth/login` (actuellement `onLogin()` mock)
- [ ] **Migrations initiales** — vérifier que les 21 patches passent au 1er deploy

## 🟠 SEMAINE 1 (prod pilote)

- [ ] **PDF Bulletins de salaire** — PDFKit ou Puppeteer → `GET /api/salary/payslip/:id/pdf`
- [ ] **Seed données demo** — 3-4 employés fictifs pour démo WinWin
- [ ] **Tests E2E basiques** — Playwright : login → dashboard → créer employé → calcul salaire
- [ ] **Domain** — swissrh.ch pointer vers Railway

## 🟡 SEMAINE 2

- [ ] **Portail employé** — vue lecture seule (fiche de paie, absences, pointage)
- [ ] **Email alerts Resend** — permis expirant, demandes congés en attente
- [ ] **AVS XML ELM** — export structuré (non certifié Swissdec) pour fiduciaires
- [ ] **Lohnausweis PDF** — certificat de salaire 15 cases (obligatoire fin d'année)

## 🟢 BACKLOG (v2)

- [ ] **Stripe billing** — abonnement mensuel par entreprise
- [ ] **Intégration WinWin** — upsell LAA/LPP depuis SwissRH
- [ ] **Swissdec 5.0 certification** — après 6 mois de prod
- [ ] **Multi-tenant** — isolation par company_id (base déjà en place)
- [ ] **Mobile app** — React Native ou PWA

## ✅ DONE

- [x] Moteur de salaire Suisse 2025 (47 tests unitaires)
- [x] Sécurité : AES-256, JWT rôles, audit log, nLPD
- [x] SSO Magic Link WinWin ↔ SwissRH
- [x] Frontend toutes pages câblées API réelle
- [x] CRUD Employees avec modal
- [x] Absences approve/reject + soldes
- [x] Time tracking résumé mensuel
- [x] Module Paie (liste payslips par mois)
- [x] Soldes Vacances avec pro-rata
- [x] Rapports + Exports CSV
- [x] Paramètres entreprise
- [x] Branding Neukomm Group corrigé

## PRIORITÉ ABSOLUE POUR WINWIN
1. Railway deploy fonctionnel
2. Login API réel (30 min de code)
3. 3-4 employés seed data
4. Demo live accessible
