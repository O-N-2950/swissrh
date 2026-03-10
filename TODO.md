# SwissRH — TODO List
_Mis à jour : 2026-03-10 (session 4 — analyse concurrentielle honnête)_

---

## 🔴 SEUL BLOQUANT PROD

- [ ] **Railway deploy** — projet + GitHub service + PostgreSQL + env vars → 20 min

---

## ✅ ACQUIS (sessions 1–4)

| Couche | État |
|--------|------|
| Backend API (12 modules) | ✅ Production ready |
| Sécurité (AES-256, JWT, nLPD, audit) | ✅ |
| Moteur salaire Swissdec 2025 | ✅ |
| 9 secteurs CCT + cotisations spécifiques | ✅ |
| IS barèmes A/B/C/D/H × 5 cantons | ✅ |
| 13e salaire 3 modes | ✅ |
| DEXTRA par secteur (nuit/dim/férié/HS) | ✅ |
| SSO Magic Link WinWin ↔ SwissRH | ✅ |
| Frontend 9 pages câblées API réelle | ✅ |
| TimeTracking grille 7j + shifts | ✅ |
| Lancer la paie (flow 3 étapes batch) | ✅ |
| PDF bulletins PDFKit A4 | ✅ |
| Dashboard actionnable | ✅ |
| Auth session persistante + Setup Wizard | ✅ |
| Seed demo data | ✅ |
| Migrations DB (22 patches) | ✅ |

---

## 🟠 SPRINT 1 — Devenir vendable (priorité maximale)

_Objectif : premier client payant possible_

### 1. Railway deploy (🔴 bloquant)
- [ ] Créer projet Railway
- [ ] Connecter repo GitHub + PostgreSQL
- [ ] Injecter toutes les env vars
- [ ] Vérifier migrations + seed demo
- [ ] DNS swissrh.ch → Railway

### 2. Portail employé mobile-first
- [ ] Route `/employee` — vue lecture seule JWT employé
- [ ] Voir ses bulletins + télécharger PDF
- [ ] Voir son solde vacances + absences
- [ ] Soumettre une demande de congé
- [ ] Responsive mobile iPhone (priorité)
- [ ] Notification par email (Resend) à la réception

### 3. Emails Resend — alertes critiques
- [ ] Alerte permis de travail expirant (J-30, J-7)
- [ ] Notification demande de congé → RH
- [ ] Confirmation congé approuvé/refusé → employé
- [ ] Notification paie lancée → admin
- [ ] Template HTML branded SwissRH

### 4. Calendrier absences visuel
- [ ] Vue mois (grille) avec absences colorées par employé
- [ ] Drag & drop pour modifier dates
- [ ] Vue superposée équipe (qui est absent quel jour)

---

## 🟡 SPRINT 2 — Devenir sérieux (avantage concurrentiel)

_Objectif : convaincre les fiduciaires_

### 5. Export ELM / Swissdec XML
- [ ] Format XML ELM 5.0 (standard caisses AVS suisses)
- [ ] Export mensuel déclaration AVS/AC/LAA
- [ ] Validation schéma XSD officiel
- [ ] **Clé différenciante vs concurrents PME**

### 6. Lohnausweis PDF complet
- [ ] 15 cases Swissdec remplies automatiquement
- [ ] Export PDF A4 officiel
- [ ] Signature employeur
- [ ] **Obligatoire fin d'année pour déclaration fiscale employé**

### 7. Multi-mandants (fiduciaires)
- [ ] Table `tenants` — isolation par mandat
- [ ] Interface fiduciaire : switcher entre clients
- [ ] Droits granulaires par mandat
- [ ] Facturation par mandat (Stripe)
- [ ] **Canal de distribution ×40 clients par fiduciaire**

### 8. Export comptable
- [ ] Écriture comptable par bulletin (débit/crédit)
- [ ] Export CSV format Banana Comptabilité
- [ ] Export format Abacus (optionnel)
- [ ] **Élimine la ressaisie manuelle du comptable**

---

## 🟢 SPRINT 3 — Dominer la niche (différenciation forte)

### 9. Planning shifts (restauration / nettoyage / santé)
- [ ] Vue planning semaine par équipe
- [ ] Glisser-déposer pour assigner shifts
- [ ] Détection automatique conflits (repos obligatoire)
- [ ] Génération automatique pointage depuis planning
- [ ] Export PDF planning semaine

### 10. Onboarding employé digital
- [ ] Lien d'invitation → formulaire auto-remplissage
- [ ] Upload documents (carte AVS, permis, contrat signé)
- [ ] Signature électronique contrat (Swiss eSign / DocuSign)
- [ ] Dossier employé complet dès J+1

### 11. Module notes de frais
- [ ] Saisie mobile (photo ticket)
- [ ] Validation manager
- [ ] Remboursement intégré au bulletin suivant
- [ ] Respect forfaits CCT par secteur

### 12. IA anomalies salaires
- [ ] Détection variation > 15% vs mois précédent
- [ ] Alerte "salaire sous minimum CCT"
- [ ] Suggestion optimisation 13e / bonus
- [ ] **Aucun concurrent PME suisse ne le fait encore**

---

## 🔵 BACKLOG v2 (post-product-market-fit)

- [ ] Swissdec 5.0 certification officielle
- [ ] Connexion directe caisses AVS cantonales (API)
- [ ] Stripe billing + plans (Starter / Pro / Fiduciaire)
- [ ] Intégration WinWin — upsell LAA/LPP
- [ ] PWA mobile (notifications push)
- [ ] Rapports OFS (statistique structure salaires)
- [ ] ATS basique (recrutement intégré)
- [ ] API publique (webhooks, intégrations tierces)

---

## Analyse concurrentielle honnête

| Feature | SwissRH | Abacus | Sage | Crésus | Datorama |
|---------|---------|--------|------|--------|----------|
| Moteur calcul Swissdec | ✅ Excellent | ✅ | ✅ | ✅ | ⚠️ |
| 9 secteurs CCT | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| IS barèmes complets | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Export ELM XML | ❌ **manque** | ✅ | ✅ | ✅ | ❌ |
| Multi-mandants | ❌ **manque** | ✅ | ✅ | ✅ | ❌ |
| Portail employé mobile | ❌ **manque** | ✅ | ✅ | ⚠️ | ✅ |
| Planning shifts | ❌ **manque** | ⚠️ | ⚠️ | ❌ | ✅ |
| Prix PME | 🟢 Compétitif | 🔴 Cher | 🟡 Moyen | 🟢 OK | 🟡 |
| UX moderne | ✅ Meilleur | ❌ | ❌ | ❌ | ✅ |
| Niche restauration | ✅ Meilleur | ⚠️ | ❌ | ❌ | ❌ |

**Notre fenêtre d'opportunité :**
1. UX la plus moderne du marché suisse PME
2. Seul outil avec DEXTRA + CCT restaurant vraiment intégré
3. Prix futur compétitif vs Abacus (licence annuelle lourde)
4. Intégré à l'écosystème WinWin (assurances) — upsell naturel

**Nos lacunes critiques à combler avant d'être vendable sérieusement :**
1. Export ELM (comptables et fiduciaires l'exigeront)
2. Portail employé mobile (les employés l'attendent)
3. Multi-mandants (pour le canal fiduciaires)
