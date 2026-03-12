# SwissRH — TODO List
_Mis à jour : 2026-03-12 (session 6 — Sprint 1 complet)_

---

## ✅ ACQUIS (sessions 1–6)

| Couche | État |
|--------|------|
| Backend API (13 modules) | ✅ |
| Sécurité AES-256 / JWT / nLPD | ✅ |
| Moteur salaire Swissdec 2025 | ✅ |
| 9 secteurs CCT + IS + 13e + DEXTRA | ✅ |
| SSO Magic Link WinWin | ✅ |
| Frontend 10 pages admin | ✅ |
| PDF bulletins / Licenciements CO | ✅ |
| Railway deploy + DNS swissrh.ch | ✅ |
| Portail employé mobile-first | ✅ SESSION 5 |
| **Emails Resend — 5 templates branded** | ✅ **SESSION 6** |
| **Calendrier absences — grille mois** | ✅ **SESSION 6** |
| **Calendrier absences — vue équipe** | ✅ **SESSION 6** |
| **Toggle notifier employés (paie)** | ✅ **SESSION 6** |

---

## 🟠 SPRINT 1 — TERMINÉ ✅

- [x] Emails Resend — 5 templates (leave/approve/reject/permis/paie/bulletin)
- [x] Calendrier absences — vue grille mois avec couleurs par type
- [x] Vue équipe superposée — initiales + compteur par jour
- [x] Tooltip flottant sur hover (dates, type, statut, motif)
- [x] Toggle 📅 Liste / 📅 Calendrier sur la page Absences
- [x] Toggle "Notifier les employés" sur la page Paie

---

## 🟡 SPRINT 2 — Devenir sérieux (avantage concurrentiel)

### 1. Export ELM / Swissdec XML ← **PRIORITÉ FIDUCIAIRES**
- [ ] Format XML ELM 5.0 (standard caisses AVS suisses)
- [ ] Export mensuel déclaration AVS/AC/LAA
- [ ] Validation schéma XSD officiel
- [ ] **Clé différenciante — les fiduciaires l'exigeront**

### 2. Lohnausweis PDF complet
- [ ] 15 cases Swissdec remplies automatiquement
- [ ] Export PDF A4 officiel
- [ ] Signature employeur

### 3. Multi-mandants (fiduciaires) ← **CANAL ×40**
- [ ] Table  — isolation par mandat
- [ ] Interface fiduciaire : switcher entre clients
- [ ] Droits granulaires par mandat
- [ ] Facturation par mandat (Stripe)

### 4. Export comptable
- [ ] CSV Banana Comptabilité / Abacus

---

## 🟢 SPRINT 3 — Dominer la niche

- [ ] Planning shifts (restauration / nettoyage / santé)
- [ ] Onboarding employé digital (invitation + signature)
- [ ] Module notes de frais (photo ticket + remboursement)
- [ ] IA anomalies salaires (variation >15%, sous minimum CCT)

---

## 🔵 BACKLOG v2

- [ ] Swissdec 5.0 certification
- [ ] Stripe billing + plans
- [ ] Intégration WinWin upsell LAA/LPP
- [ ] PWA mobile + push notifications
- [ ] API publique (webhooks)
