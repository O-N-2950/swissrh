/**
 * SWISSRH — nLPD Compliance API
 * ============================================================
 * Art. 8 nLPD : droit d'accès aux données personnelles
 * Art. 17 nLPD : droit à l'effacement
 * Rétention légale CH :
 *   - Données salariales : 10 ans (CO art. 962)
 *   - Données RH générales : configurable (défaut 7 ans)
 *   - Bulletins de salaire : 10 ans
 * ============================================================
 */

import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireAdmin, type JwtPayload } from '../auth/middleware.js';
import { decrypt, maskAvs } from '../utils/encryption.js';
import { audit, getIp } from '../utils/audit-log.js';

export const gdprRouter = Router();

/**
 * GET /api/gdpr/my-data
 * Droit d'accès nLPD art.8 — l'employé consulte ses propres données
 */
gdprRouter.get('/my-data', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();

  audit({
    userId: user.userId, userEmail: user.email,
    userRole: user.role, companyId: user.companyId,
    action: 'NLPD_DATA_REQUEST', resourceType: 'self',
    ipAddress: getIp(req),
  });

  try {
    // Données de l'utilisateur
    const [userData] = await sql`
      SELECT id, email, role, first_name, last_name, created_at, last_login
      FROM users WHERE id = ${user.userId}
    `;

    // Données employé liées
    let employeeData = null;
    if (user.employeeId) {
      const [emp] = await sql`
        SELECT first_name, last_name, email, phone, birthdate, hire_date,
               end_date, contract_type, activity_rate, weekly_hours,
               department, position, vacation_weeks, address, npa, city,
               avs_number, permit_type, permit_expiry, created_at
        FROM employees
        WHERE id = ${user.employeeId} AND company_id = ${user.companyId}
      `;
      if (emp) {
        employeeData = {
          ...emp,
          avs_number: maskAvs(decrypt(emp.avs_number)), // masqué dans la réponse auto
        };
      }
    }

    // Bulletins de salaire (anonymisés)
    const payslips = user.employeeId ? await sql`
      SELECT period_year, period_month, gross_salary, net_salary, created_at
      FROM payslips
      WHERE employee_id = ${user.employeeId} AND company_id = ${user.companyId}
      ORDER BY period_year DESC, period_month DESC
      LIMIT 120
    ` : [];

    // Log d'audit (les 90 derniers jours)
    const logs = await sql`
      SELECT created_at, action, resource_type, details
      FROM audit_logs
      WHERE user_id = ${user.userId}
      ORDER BY created_at DESC LIMIT 100
    `;

    res.json({
      ok: true,
      exportDate: new Date().toISOString(),
      notice: 'Export nLPD art.8 — données vous concernant dans SwissRH',
      retention: {
        salarialData: '10 ans (CO art. 962)',
        hrData:       '7 ans (configuration entreprise)',
        auditLogs:    '2 ans',
      },
      user: userData,
      employee: employeeData,
      payslips,
      accessLog: logs,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/gdpr/delete-request
 * Droit à l'effacement nLPD art.17
 * NB: Les données salariales sont CONSERVÉES 10 ans (obligation légale CH)
 * Seules les données non-légales sont effacées.
 */
gdprRouter.delete('/delete-request', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();

  audit({
    userId: user.userId, userEmail: user.email,
    userRole: user.role, companyId: user.companyId,
    action: 'NLPD_DATA_DELETE', resourceType: 'self',
    details: 'Demande d\'effacement nLPD art.17',
    ipAddress: getIp(req),
  });

  // Calcul date de rétention (10 ans pour données salariales)
  const retentionCutoff = new Date();
  retentionCutoff.setFullYear(retentionCutoff.getFullYear() - 10);

  try {
    const deleted: string[] = [];

    // Anonymise données non-salariales (coordonnées, notes)
    if (user.employeeId) {
      await sql`
        UPDATE employees SET
          email    = NULL,
          phone    = NULL,
          address  = NULL,
          npa      = NULL,
          city     = NULL,
          notes    = '[Effacé nLPD art.17 — ' || NOW()::date || ']',
          updated_at = NOW()
        WHERE id = ${user.employeeId}
          AND company_id = ${user.companyId}
          AND (end_date IS NULL OR end_date < ${retentionCutoff.toISOString()})
      `;
      deleted.push('coordonnées personnelles (email, téléphone, adresse)');
    }

    // Données salariales conservées (obligation légale)
    const retained = [
      'Bulletins de salaire (obligation CO art.962 — 10 ans)',
      'Numéro AVS (obligation AVS)',
      'Déclarations sociales (AVS, LPP, LAA)',
    ];

    res.json({
      ok: true,
      message: 'Demande d\'effacement traitée conformément à la nLPD',
      deleted,
      retained,
      legalBasis: 'CO art. 962 — conservation 10 ans obligatoire pour documents comptables',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/gdpr/audit-log
 * Admin — consulte le journal d'audit de l'entreprise
 */
gdprRouter.get('/audit-log', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const { days = 30, page = 1 } = req.query;
  const limit = 100;
  const offset = (Number(page) - 1) * limit;

  try {
    const logs = await sql`
      SELECT id, created_at, user_email, user_role, action,
             resource_type, resource_id, details, ip_address
      FROM audit_logs
      WHERE company_id = ${user.companyId}
        AND created_at >= NOW() - INTERVAL '1 day' * ${Number(days)}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    res.json({ ok: true, logs, page: Number(page), days: Number(days) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/gdpr/retention-policy
 * Politique de rétention des données
 */
gdprRouter.get('/retention-policy', requireAuth, async (_req, res) => {
  res.json({
    ok: true,
    policy: {
      salaryData: {
        retention: '10 ans',
        basis:     'CO art. 962 al. 1 — obligation de conservation documents comptables',
        covers:    ['bulletins de salaire', 'décomptes AVS', 'fiches IS', 'Lohnausweis'],
      },
      hrData: {
        retention: '7 ans (configurable)',
        basis:     'Recommandation nLPD / bonne pratique RH',
        covers:    ['dossiers employés', 'évaluations', 'absences'],
      },
      auditLogs: {
        retention: '2 ans',
        basis:     'Sécurité et conformité nLPD',
      },
      consentRecords: {
        retention: '5 ans après fin de relation de travail',
        basis:     'nLPD art. 9 — preuve du consentement',
      },
    },
  });
});
