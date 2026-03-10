# SwissRH — TODO List
_Mis à jour : 2026-03-10 (session 3 — UX maximale)_

## 🔴 SEUL BLOQUANT

- [ ] **Railway deploy** — créer projet, GitHub service, PostgreSQL, env vars → DONE en 20min dès que Railway est dispo

## ✅ FAIT AUJOURD'HUI (session 3)

### Système de profils sectoriels
- [x] 4 profils : Restaurant/Hôtellerie · Commerce · Construction · Bureau
- [x] Préconfigure contrat, heures, CCT, DEXTRA selon secteur
- [x] Sélecteur visuel dans Paramètres
- [x] Propagation dans toute l'app via `useSector()`

### DEXTRA & Temps (Restauration)
- [x] Grille visuelle semaine (7 jours, cliquable, navigation semaines)
- [x] Badges DEXTRA en temps réel : 🌙 nuit · ☀ dim · ⏱ suppl.
- [x] Modal saisie avec shift presets (Matin/Midi/Soir/Nuit/Coupure)
- [x] Auto-calcul DEXTRA : +20% nuit CCT / +50% dimanche / +25% suppl.
- [x] Affichage en CHF des suppléments gagnés
- [x] Récap mensuel DEXTRA (total suppléments)
- [x] Champ Pourboires (restauration uniquement)
- [x] Rappels légaux LTr contextuels

### Lancer la paie (one-click)
- [x] Flow 3 étapes : Preview → Lancement → Confirmation
- [x] Calcul batch tous employés avec prévisualisation
- [x] Barre de progression en temps réel
- [x] Bouton "Lancer la paie" dans Payroll quand 0 bulletins
- [x] Export CSV AVS direct depuis confirmation

### Dashboard actionnable
- [x] Zone "Actions requises" : congés en attente · permis · soldes > 20j · paie fin du mois
- [x] Codes urgence (rouge/orange/bleu) avec navigation directe
- [x] Mention secteur dans le sous-titre
- [x] Alertes CCT (rappels légaux secteur)

### Migrations DB
- [x] Patch 022 : sector, has_dextra, cct_name, night/sunday/holiday_hours, tips_amount, notes

## ✅ SESSIONS PRÉCÉDENTES

- [x] Backend API complet (9 modules)
- [x] Sécurité 7 critiques (AES-256, JWT, nLPD, audit log)
- [x] SSO Magic Link WinWin ↔ SwissRH
- [x] Frontend 9 pages câblées API
- [x] Auth session persistante + Setup Wizard
- [x] PDF Bulletins PDFKit (design professionnel A4)
- [x] Seed demo data (admin@demo.ch / Demo2025!)

## 🟠 PROCHAIN SPRINT

- [ ] **Calendrier absences** — vue mois visuelle (drag & drop)
- [ ] **Lohnausweis PDF** — certificat de salaire 15 cases
- [ ] **Email Resend** — alertes permis + demandes congés
- [ ] **Portail employé** — vue lecture seule mobile-first
- [ ] **Module pourboires** — décompte et déclaration mensuelle

## STATUS GLOBAL

| Couche | État |
|--------|------|
| Backend API | ✅ Production ready |
| Sécurité | ✅ Complet |
| SSO WinWin | ✅ Implémenté |
| Frontend (9 pages) | ✅ Toutes câblées |
| Auth / Setup | ✅ |
| PDF bulletins | ✅ |
| Secteurs / DEXTRA | ✅ Restaurant complet |
| Lancer la paie | ✅ Flow complet |
| Seed demo | ✅ |
| Railway | 🔴 En attente |
