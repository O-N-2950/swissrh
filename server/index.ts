/**
 * SWISSRH — Server Entry Point
 * ============================================================
 * Patterns repris de WIN WIN V2 :
 *   ✅ uncaughtException + unhandledRejection → serveur ne meurt JAMAIS
 *   ✅ SIGTERM/SIGINT graceful shutdown
 *   ✅ Railway health check always 200
 *   ✅ Pool keepalive (évite idle disconnects)
 *   ✅ Crash monitor périodique (5 min)
 *   ✅ Migrations auto au démarrage
 *   ✅ Security headers
 *   ✅ Global async error handler
 * ============================================================
 */

// ===== GLOBAL CRASH PROTECTION — NE JAMAIS LAISSER LE PROCESS MOURIR =====
process.on('uncaughtException', (err) => {
  try { console.error('🔴 [UNCAUGHT EXCEPTION] (server survived):', err?.message || err); } catch {}
  try { console.error(err?.stack?.split('\n').slice(0, 4).join('\n')); } catch {}
  // NE PAS appeler process.exit() — le serveur continue
});
process.on('unhandledRejection', (reason: any) => {
  try { console.error('🟡 [UNHANDLED REJECTION] (server survived):', reason?.message || reason); } catch {}
});
process.on('SIGTERM', () => { console.log('🛑 SIGTERM — graceful shutdown'); process.exit(0); });
process.on('SIGINT',  () => { console.log('🛑 SIGINT  — graceful shutdown'); process.exit(0); });
// ==========================================================================

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import { migrateOnStart }           from './db/migrate.js';
import { migrateSecurityPatches, migrateSso, migrateSectorDextra } from './db/migrate-security.js';
import { startPoolKeepalive }       from './db/pool.js';
import { startupCheck, startPeriodicMonitoring } from './monitoring/crash-monitor.js';
import { monitoringRouter }         from './monitoring/routes.js';
import { authRouter }               from './auth/routes.js';
import { requireAuth, requireAdmin } from './auth/middleware.js';
import { employeesRouter }          from './api/employees.js';
import { salaryRouter }             from './api/salary.js';
import { pdfRouter }               from './api/pdf-payslip.js';
import { reportsRouter }            from './api/reports.js';
import { companyRouter }            from './api/company.js';
import { exportRouter }             from './api/exports.js';
import { gdprRouter }               from './api/gdpr.js';
import { ssoRouter }                from './auth/sso.js';      // SSO WinWin
import { terminationsRouter }      from './api/terminations.js';
import { migrateTerminations }     from './db/migrate-terminations.js';
import { portalRouter }            from './api/employee-portal.js';
import { elmRouter }               from './api/elm-lohnausweis.js';
import { tenantRouter }            from './api/tenants.js';
import { migrateMultiTenant }      from './db/migrate-multitenant.js';
import { startPermitAlerts }         from './utils/permit-alerts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ===== Stripe webhook needs raw body BEFORE json parser =====
// (prévu pour Stripe billing futur — même pattern que WinWin)
// app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ===== SECURITY HEADERS =====
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ===== RAILWAY HEALTH CHECK — always 200 even if DB is down =====
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', ts: Date.now(), service: 'swissrh' });
});

// ===== ROUTES =====
app.use('/api/auth',       authRouter);
app.use('/api/monitoring', requireAdmin, monitoringRouter);
app.use('/api/employees',  requireAuth, employeesRouter);
app.use('/api/salary',     requireAuth, salaryRouter);
app.use('/api/salary',     requireAuth, pdfRouter);
app.use('/api/reports',    requireAuth, reportsRouter);
app.use('/api/company',    requireAuth, companyRouter);
app.use('/api/exports',    requireAuth, exportRouter);   // exports sécurisés (CRITIQUE 5)
app.use('/api/gdpr',       requireAuth, gdprRouter);     // nLPD (CRITIQUE 7)
app.use('/api/terminations', requireAuth, terminationsRouter); // CO 336c licenciements
app.use('/api/portal',       requireAuth, portalRouter);       // Employee portal
app.use('/api/exports',    requireAuth, elmRouter);            // ELM XML + Lohnausweis
app.use('/api/salary',     requireAuth, elmRouter);            // Lohnausweis PDF routes
app.use('/api/tenants',    requireAuth, tenantRouter);         // Multi-mandants fiduciaires
app.use('/api/auth',       ssoRouter);                   // SSO WinWin (public — vérifie transfer token)

// ===== STATIC (production) =====
if (process.env.NODE_ENV === 'production') {
  app.use('/assets', express.static(path.join(__dirname, 'client/assets'), {
    maxAge: '1y', immutable: true,
  }));
  app.use(express.static(path.join(__dirname, 'client'), { maxAge: '1h' }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'client/index.html'));
  });
}

// ===== GLOBAL ASYNC ERROR HANDLER =====
app.use((err: any, req: any, res: any, _next: any) => {
  console.error(`❌ [GLOBAL ERROR] ${req?.method} ${req?.path}:`, err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Erreur serveur interne',
      details: process.env.NODE_ENV !== 'production' ? err?.message : undefined,
    });
  }
});

// ===== STARTUP =====
async function start() {
  console.log('📋 SWISSRH — ENV check:');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? `SET (${process.env.DATABASE_URL.slice(0, 30)}...)` : 'NOT SET ❌');
  console.log('  JWT_SECRET:',  process.env.JWT_SECRET  ? 'SET ✅' : 'NOT SET ⚠️');
  console.log('  NODE_ENV:',    process.env.NODE_ENV);

  if (process.env.DATABASE_URL) {
    // Auto-migrate at startup
    try {
      // ── Vérification variables d'environnement critiques ──────────────────
  const missingEnv: string[] = [];
  if (!process.env.JWT_SECRET_KEY)  missingEnv.push('JWT_SECRET_KEY');
  if (!process.env.ENCRYPTION_KEY)  missingEnv.push('ENCRYPTION_KEY');
  if (!process.env.DATABASE_URL)    missingEnv.push('DATABASE_URL');
  if (missingEnv.length && process.env.NODE_ENV === 'production') {
    console.error('🔴 [STARTUP] Variables manquantes en PROD:', missingEnv.join(', '));
    process.exit(1);
  } else if (missingEnv.length) {
    console.warn('⚠️  [STARTUP] Variables manquantes (dev mode):', missingEnv.join(', '));
  }

  await migrateOnStart();
  await migrateSecurityPatches();
  await migrateSso();
  await migrateSectorDextra();
  await migrateTerminations();
  await migrateMultiTenant();
      console.log('✅ Migrations OK');
    } catch (e: any) {
      console.error('💥 Migration error:', e.message);
    }

    // Crash monitor (pattern WIN WIN)
    try {
      await startupCheck();
      startPeriodicMonitoring();
    } catch (e: any) {
      console.error('⚠️  Crash monitor init error:', e.message);
    }

    // Alertes permis de travail expirants (quotidien 8h00)
    try {
      startPermitAlerts();
    } catch (e: any) {
      console.error('⚠️  Permit alerts init error:', e.message);
    }
  }

  // Pool keepalive — prevent Railway idle disconnections (pattern WIN WIN)
  startPoolKeepalive();

  app.listen(PORT, () => {
    console.log(`🚀 SWISSRH running on port ${PORT}`);
  });
}

start();

// POST /api/admin/seed-demo — Dev/demo only
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/admin/seed-demo', async (_req, res) => {
    try {
      const { seedDemo } = await import('./db/seed-demo.js');
      const result = await seedDemo();
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}

// cache-bust: 1773133617


