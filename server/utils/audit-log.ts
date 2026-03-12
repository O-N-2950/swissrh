/**
 * SWISSRH — Audit Log
 * ============================================================
 * Journalise chaque accès aux données sensibles et exports.
 * Table: audit_logs
 *
 * Obligatoire nLPD (art. 8 + 9) et bonnes pratiques RH.
 * ============================================================
 */

import { getSQL } from '../db/pool.js';

export type AuditAction =
  | 'VIEW_EMPLOYEE'
  | 'VIEW_EMPLOYEE_LIST'
  | 'UPDATE_EMPLOYEE'
  | 'DELETE_EMPLOYEE'
  | 'VIEW_PAYSLIP'
  | 'VIEW_SALARY'
  | 'EXPORT_CSV'
  | 'EXPORT_PDF'
  | 'EXPORT_AVS_XML'
  | 'EXPORT_ACCOUNTING_BANANA'
  | 'EXPORT_ACCOUNTING_ABACUS'
  | 'EXPORT_ELM_XML'
  | 'EXPORT_LOHNAUSWEIS'
  | 'VIEW_AVS_NUMBER'
  | 'NLPD_DATA_REQUEST'
  | 'NLPD_DATA_DELETE'
  | 'PORTAL_VIEW_PROFILE'
  | 'PORTAL_VIEW_PAYSLIPS'
  | 'PORTAL_LEAVE_REQUEST'
  | 'TERMINATION_CREATE'
  | 'TERMINATION_UPDATE'
  | 'ABSENCE_APPROVE'
  | 'ABSENCE_REJECT'
  | 'GDPR_REQUEST'
  | 'GDPR_DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN';

export interface AuditEntry {
  userId:      number;
  userEmail:   string;
  userRole:    string;
  companyId:   number;
  action:      AuditAction;
  resourceType?: string;
  resourceId?:   number | string;
  details?:      string;
  ipAddress?:    string;
}

/** Crée la table audit_logs si elle n'existe pas */
export async function migrateAuditLog(): Promise<void> {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            BIGSERIAL PRIMARY KEY,
      created_at    TIMESTAMP DEFAULT NOW(),
      user_id       INTEGER,
      user_email    VARCHAR(255),
      user_role     VARCHAR(50),
      company_id    INTEGER,
      action        VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100),
      resource_id   VARCHAR(100),
      details       TEXT,
      ip_address    VARCHAR(45)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
    ON audit_logs (company_id, created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user
    ON audit_logs (user_id, created_at DESC)
  `;
}

/** Écrit une entrée d'audit (fire-and-forget — ne bloque pas la requête) */
export function audit(entry: AuditEntry): void {
  const sql = getSQL();
  sql`
    INSERT INTO audit_logs
      (user_id, user_email, user_role, company_id, action,
       resource_type, resource_id, details, ip_address)
    VALUES (
      ${entry.userId}, ${entry.userEmail}, ${entry.userRole},
      ${entry.companyId}, ${entry.action},
      ${entry.resourceType ?? null}, ${String(entry.resourceId ?? '') || null},
      ${entry.details ?? null}, ${entry.ipAddress ?? null}
    )
  `.catch(err => console.error('[AUDIT] Write failed:', err?.message));
}

/** Helper pour extraire l'IP réelle (derrière proxy Railway) */
export function getIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}
