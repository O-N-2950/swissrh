# SWISSRH 🇨🇭

**Swiss HR & Payroll SaaS for SMEs — Swissdec 5.0 compliant**

> Built by Groupe NEO · Courgenay, Canton du Jura

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + TypeScript + Express |
| Database | PostgreSQL (Railway) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Auth | JWT (httpOnly cookies) |
| Deploy | Railway |

## Features

- ✅ **Fiches de salaire** conformes Swissdec 5.0
- ✅ **Calcul suisse 2025** — AVS/AI/APG, AC, LPP par tranche d'âge, LAA, IJM
- ✅ **Salaires horaires** — centièmes, HS +25%, nuit +25%, dimanche +50%
- ✅ **Gestion des permis** — B, C, G, L avec alertes expiration
- ✅ **Crash monitor** — heartbeat 5 min, détection downtime, alertes admin
- ✅ **Pool PostgreSQL bulletproof** — keepalive 20s, auto-reconnect
- ✅ **Déclarations AVS** — base annuelle par employé
- 🔜 Export Swissdec XML
- 🔜 Certificats de salaire PDF
- 🔜 Portail employé
- 🔜 Intégration WIN WIN (LAA/LPP/IJM upsell)

## Démarrage local

```bash
cp .env.example .env
# Remplir DATABASE_URL et JWT_SECRET

npm install
npm run dev
```

Premier accès → `POST /api/auth/setup` avec `{ email, password, companyName }`.

## Deploy Railway

1. Connecter le repo GitHub à Railway
2. Ajouter PostgreSQL comme service
3. Variables d'environnement : `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`
4. Les migrations se lancent automatiquement au démarrage

## Architecture — Patterns WIN WIN V2

| Pattern | Description |
|---------|-------------|
| `process.on('uncaughtException')` | Serveur ne meurt jamais |
| `startPoolKeepalive()` | Ping DB toutes les 20s |
| `forceReconnect()` | Auto-reconnect si pool mort |
| `startupCheck()` | Détecte downtime au redémarrage |
| `startPeriodicMonitoring()` | Heartbeat 5 min en DB |
| `GET /health` | Railway health check — toujours 200 |
| `prepare: false` | Évite prepared statement errors |

---

*SWISSRH est développé par [Groupe NEO](https://www.winwin.swiss) — WW Finance Group SARL, FINMA F01042365*
