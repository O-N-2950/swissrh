# SwissRH — TODO List
_Mis à jour : 2026-03-12 (session 6 — emails Resend livrés)_

---

## ✅ ACQUIS (sessions 1–6)

| Couche | État |
|--------|------|
| Backend API (13 modules) | ✅ Production ready |
| Sécurité (AES-256, JWT, nLPD, audit) | ✅ |
| Moteur salaire Swissdec 2025 | ✅ |
| 9 secteurs CCT + cotisations spécifiques | ✅ |
| IS barèmes A/B/C/D/H × 5 cantons | ✅ |
| 13e salaire 3 modes | ✅ |
| DEXTRA par secteur (nuit/dim/férié/HS) | ✅ |
| SSO Magic Link WinWin ↔ SwissRH | ✅ |
| Frontend 10 pages admin câblées API | ✅ |
| TimeTracking grille 7j + shifts | ✅ |
| Lancer la paie (flow 3 étapes batch) | ✅ |
| PDF bulletins PDFKit A4 | ✅ |
| Dashboard actionnable | ✅ |
| Auth session persistante + Setup Wizard | ✅ |
| Seed demo data | ✅ |
| Migrations DB (22 patches) | ✅ |
| Licenciements CO 335c/336c (full UI) | ✅ |
| Railway deploy + CI/CD GitHub | ✅ |
| DNS swissrh.ch → Railway | ✅ |
| Portail employé mobile-first | ✅ SESSION 5 |
| JWT enrichi avec employeeId | ✅ SESSION 5 |
| API /api/portal (5 routes) | ✅ SESSION 5 |
| **Emails Resend — 5 templates branded** | ✅ **SESSION 6** |
| **sendLeaveRequestToRH** | ✅ **SESSION 6** |
| **sendLeaveDecisionToEmployee** | ✅ **SESSION 6** |
| **sendPermitExpiryAlert (J-30/J-7)** | ✅ **SESSION 6** |
| **sendPayrollLaunched** | ✅ **SESSION 6** |
| **sendPayslipReady** | ✅ **SESSION 6** |
| **Scheduler permis quotidien 8h00** | ✅ **SESSION 6** |
| **POST /salary/payroll-notify** | ✅ **SESSION 6** |

---

## 🟠 SPRINT 1 — Compléter le portail

### 1. Emails Resend — alertes critiques
- [x] Notification demande de congé soumise → RH (email)
- [x] Confirmation congé approuvé/refusé → employé
- [x] Alerte permis de travail expirant (J-30, J-7) → admin
- [x] Notification paie lancée → admin
- [x] Template HTML branded SwissRH (logo + couleurs)
- [ ] **Hooker POST /salary/payroll-notify dans le frontend (Payroll page)**
- [ ] Toggle "Notifier les employés" sur la page Payroll

### 2. Calendrier absences visuel
- [ ] Vue mois (grille) avec absences colorées par employé
- [ ] Vue superposée équipe (qui est absent quel jour)
- [ ] Drag & drop pour modifier dates

### 3. Amélioration portail employé
- [ ] Accès pointage (voir ses entrées time tracking)
- [ ] Vue Lohnausweis annuel (résumé fiscal employé)
- [ ] Mode sombre (toggle)

---

## 🟡 SPRINT 2 — Devenir sérieux (avantage concurrentiel)

### 4. Export ELM / Swissdec XML ← **PRIORITÉ FIDUCIAIRES**
- [ ] Format XML ELM 5.0 (standard caisses AVS suisses)
- [ ] Export mensuel déclaration AVS/AC/LAA
- [ ] Validation schéma XSD officiel
- [ ] **Clé différenciante — les fiduciaires l'exigeront**

### 5. Lohnausweis PDF complet
- [ ] 15 cases Swissdec remplies automatiquement
- [ ] Export PDF A4 officiel
- [ ] Signature employeur
- [ ] **Obligatoire fin d'année pour déclaration fiscale**

### 6. Multi-mandants (fiduciaires) ← **CANAL ×40**
- [ ] Table `tenants` — isolation par mandat
- [ ] Interface fiduciaire : switcher entre clients
- [ ] Droits granulaires par mandat
- [ ] Facturation par mandat (Stripe)

### 7. Export comptable
- [ ] Écriture comptable par bulletin (débit/crédit)
- [ ] Export CSV format Banana Comptabilité
- [ ] Export format Abacus (optionnel)

---

## 🟢 SPRINT 3 — Dominer la niche

### 8. Planning shifts (restauration / nettoyage / santé)
- [ ] Vue planning semaine par équipe
- [ ] Glisser-déposer pour assigner shifts
- [ ] Détection automatique conflits (repos obligatoire LTr)
- [ ] Génération automatique pointage depuis planning
- [ ] Export PDF planning semaine

### 9. Onboarding employé digital
- [ ] Lien d'invitation → formulaire auto-remplissage
- [ ] Upload documents (carte AVS, permis, contrat signé)
- [ ] Signature électronique contrat (Swiss eSign)
- [ ] Dossier employé complet dès J+1

### 10. Module notes de frais
- [ ] Saisie mobile (photo ticket)
- [ ] Validation manager
- [ ] Remboursement intégré au bulletin suivant
- [ ] Respect forfaits CCT par secteur

### 11. IA anomalies salaires
- [ ] Détection variation > 15% vs mois précédent
- [ ] Alerte "salaire sous minimum CCT"
- [ ] Suggestion optimisation 13e / bonus
- [ ] **Aucun concurrent PME suisse ne le fait encore**

---

## 🔵 BACKLOG v2 (post-product-market-fit)

- [ ] Swissdec 5.0 certification officielle
- [ ] Connexion directe caisses AVS cantonales (API)
- [ ] Stripe billing + plans (Starter / Pro / Fiduciaire)
- [ ] Intégration WinWin — upsell LAA/LPP dans portail employé
- [ ] PWA mobile (notifications push)
- [ ] Rapports OFS (statistique structure salaires)
- [ ] ATS basique (recrutement intégré)
- [ ] API publique (webhooks, intégrations tierces)

---

## Analyse concurrentielle — situation actuelle

| Feature | SwissRH | Abacus | Sage | Crésus |
|---------|---------|--------|------|--------|
| Moteur calcul Swissdec | ✅ | ✅ | ✅ | ✅ |
| 9 secteurs CCT | ✅ | ✅ | ⚠️ | ⚠️ |
| IS barèmes complets | ✅ | ✅ | ✅ | ✅ |
| Portail employé mobile | ✅ | ✅ | ✅ | ⚠️ |
| Emails notifications | ✅ **NOUVEAU** | ✅ | ✅ | ⚠️ |
| Licenciements CO 336c | ✅ | ❌ | ❌ | ❌ |
| Export ELM XML | ❌ **manque** | ✅ | ✅ | ✅ |
| Multi-mandants | ❌ **manque** | ✅ | ✅ | ✅ |
| UX moderne | ✅ Meilleur | ❌ | ❌ | ❌ |
| Prix PME | 🟢 Compétitif | 🔴 Cher | 🟡 Moyen | 🟢 OK |

**Lacunes critiques restantes :**
1. Export ELM (fiduciaires l'exigeront — Sprint 2)
2. Multi-mandants (canal ×40 — Sprint 2)
