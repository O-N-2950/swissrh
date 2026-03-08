/**
 * SWISSRH — Employees API
 * ============================================================
 * Sécurité :
 *   - AVS chiffré AES-256-GCM en base de données
 *   - Masquage AVS dans l'UI (756.XXXX.XXXX.XX)
 *   - Rôles : admin/rh_manager voient tout, employee voit son propre dossier
 *   - Audit log sur chaque accès / modification
 * ============================================================
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager, canAccessEmployee, type JwtPayload } from '../auth/middleware.js';
import { encrypt, decrypt, maskAvs } from '../utils/encryption.js';
import { audit, getIp } from '../utils/audit-log.js';

export const employeesRouter = Router();

// GET /api/employees — Liste (admin/manager) ou employé connecté uniquement
employeesRouter.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const { active, search } = req.query;

  try {
    // Employee : ne voit QUE son propre dossier
    const selfFilter = user.role === 'employee' && user.employeeId
      ? sql`AND e.id = ${user.employeeId}`
      : sql`1=1`;

    const employees = await sql`
      SELECT e.id, e.first_name, e.last_name, e.email, e.phone,
             e.birthdate, e.hire_date, e.end_date,
             e.contract_type, e.permit_type, e.permit_expiry,
             e.activity_rate, e.weekly_hours, e.salary_type, e.salary_amount,
             e.department, e.position, e.vacation_weeks,
             e.avs_number,
             e.address, e.npa, e.city, e.cost_center, e.is_active,
             EXTRACT(YEAR FROM AGE(e.birthdate))::int as age,
             CASE WHEN e.permit_expiry < CURRENT_DATE + 30
                   AND e.permit_expiry > CURRENT_DATE
                  THEN true ELSE false END as permit_expiring_soon
      FROM employees e
      WHERE e.company_id = ${user.companyId}
        AND (${active === 'false' ? sql`1=1` : sql`e.is_active = true`})
        AND (${search ? sql`
          LOWER(e.first_name || ' ' || e.last_name) LIKE ${'%' + String(search).toLowerCase() + '%'}
        ` : sql`1=1`})
        AND ${selfFilter}
      ORDER BY e.last_name, e.first_name
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'VIEW_EMPLOYEE_LIST',
      details: `${employees.length} employés`,
      ipAddress: getIp(req),
    });

    // Masquage AVS selon le rôle
    const isPrivileged = user.role === 'admin' || user.role === 'rh_manager';
    const mapped = employees.map((e: any) => ({
      ...e,
      avs_number: isPrivileged
        ? decrypt(e.avs_number) // admin/manager : valeur déchiffrée
        : maskAvs(decrypt(e.avs_number)), // employee : masqué
    }));

    res.json({ ok: true, employees: mapped });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/employees/:id
employeesRouter.get('/:id', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const targetId = parseInt(req.params.id);

  if (!canAccessEmployee(user, targetId)) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  try {
    const [emp] = await sql`
      SELECT e.*,
             EXTRACT(YEAR FROM AGE(e.birthdate))::int as age
      FROM employees e
      WHERE e.id = ${targetId} AND e.company_id = ${user.companyId}
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'VIEW_EMPLOYEE',
      resourceType: 'employee', resourceId: targetId,
      ipAddress: getIp(req),
    });

    const isPrivileged = user.role === 'admin' || user.role === 'rh_manager';
    res.json({
      ok: true,
      employee: {
        ...emp,
        avs_number: isPrivileged ? decrypt(emp.avs_number) : maskAvs(decrypt(emp.avs_number)),
        avs_masked: maskAvs(decrypt(emp.avs_number)),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/employees — Créer (admin/rh_manager uniquement)
employeesRouter.post('/', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();

  try {
    const {
      firstName, lastName, email, phone, birthdate, hireDate,
      contractType, permitType, permitExpiry, activityRate, weeklyHours,
      salaryType, salaryAmount, department, position, vacationWeeks,
      avsNumber, address, npa, city, costCenter,
    } = req.body;

    if (!firstName || !lastName || !hireDate) {
      return res.status(400).json({ error: 'firstName, lastName et hireDate requis' });
    }

    // Chiffrement AVS avant stockage
    const encryptedAvs = avsNumber ? encrypt(avsNumber) : null;

    const [emp] = await sql`
      INSERT INTO employees (
        company_id, first_name, last_name, email, phone,
        birthdate, hire_date, contract_type, permit_type, permit_expiry,
        activity_rate, weekly_hours, salary_type, salary_amount,
        department, position, vacation_weeks, avs_number,
        address, npa, city, cost_center
      ) VALUES (
        ${user.companyId}, ${firstName}, ${lastName}, ${email || null}, ${phone || null},
        ${birthdate || null}, ${hireDate}, ${contractType || 'CDI'}, ${permitType || 'CH'},
        ${permitExpiry || null},
        ${activityRate || 100}, ${weeklyHours || 42}, ${salaryType || 'monthly'},
        ${salaryAmount || 0}, ${department || null}, ${position || null},
        ${vacationWeeks || 5}, ${encryptedAvs},
        ${address || null}, ${npa || null}, ${city || null}, ${costCenter || null}
      )
      RETURNING *
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'UPDATE_EMPLOYEE',
      resourceType: 'employee', resourceId: emp.id,
      details: `Création: ${firstName} ${lastName}`,
      ipAddress: getIp(req),
    });

    res.json({
      ok: true,
      employee: {
        ...emp,
        avs_number: maskAvs(avsNumber),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/employees/:id — Modifier (admin/rh_manager)
employeesRouter.put('/:id', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const id   = parseInt(req.params.id);

  try {
    const [existing] = await sql`
      SELECT id FROM employees WHERE id = ${id} AND company_id = ${user.companyId}
    `;
    if (!existing) return res.status(404).json({ error: 'Employé introuvable' });

    const {
      firstName, lastName, email, phone, birthdate, hireDate, endDate,
      contractType, permitType, permitExpiry, activityRate, weeklyHours,
      salaryType, salaryAmount, department, position, vacationWeeks,
      avsNumber, address, npa, city, costCenter, isActive, notes,
    } = req.body;

    // Chiffrement AVS si modifié
    const encryptedAvs = avsNumber !== undefined ? encrypt(avsNumber) : undefined;

    const [emp] = await sql`
      UPDATE employees SET
        first_name    = COALESCE(${firstName}, first_name),
        last_name     = COALESCE(${lastName}, last_name),
        email         = ${email ?? null},
        phone         = ${phone ?? null},
        birthdate     = ${birthdate ?? null},
        hire_date     = COALESCE(${hireDate}, hire_date),
        end_date      = ${endDate ?? null},
        contract_type = COALESCE(${contractType}, contract_type),
        permit_type   = COALESCE(${permitType}, permit_type),
        permit_expiry = ${permitExpiry ?? null},
        activity_rate = COALESCE(${activityRate}, activity_rate),
        weekly_hours  = COALESCE(${weeklyHours}, weekly_hours),
        salary_type   = COALESCE(${salaryType}, salary_type),
        salary_amount = COALESCE(${salaryAmount}, salary_amount),
        department    = ${department ?? null},
        position      = ${position ?? null},
        vacation_weeks= COALESCE(${vacationWeeks}, vacation_weeks),
        avs_number    = ${encryptedAvs !== undefined ? encryptedAvs : sql`avs_number`},
        address       = ${address ?? null},
        npa           = ${npa ?? null},
        city          = ${city ?? null},
        cost_center   = ${costCenter ?? null},
        is_active     = COALESCE(${isActive}, is_active),
        notes         = ${notes ?? null},
        updated_at    = NOW()
      WHERE id = ${id} AND company_id = ${user.companyId}
      RETURNING *
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'UPDATE_EMPLOYEE',
      resourceType: 'employee', resourceId: id,
      details: `Modification employé ${id}`,
      ipAddress: getIp(req),
    });

    res.json({
      ok: true,
      employee: {
        ...emp,
        avs_number: maskAvs(decrypt(emp.avs_number)),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/employees/:id — Soft delete
employeesRouter.delete('/:id', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const id   = parseInt(req.params.id);

  try {
    await sql`
      UPDATE employees
      SET is_active = false, end_date = CURRENT_DATE, updated_at = NOW()
      WHERE id = ${id} AND company_id = ${user.companyId}
    `;

    audit({
      userId: user.userId, userEmail: user.email,
      userRole: user.role, companyId: user.companyId,
      action: 'DELETE_EMPLOYEE',
      resourceType: 'employee', resourceId: id,
      ipAddress: getIp(req),
    });

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/employees/alerts/permits
employeesRouter.get('/alerts/permits', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  try {
    const alerts = await sql`
      SELECT id, first_name, last_name, permit_type, permit_expiry,
        (permit_expiry - CURRENT_DATE)::int as days_remaining
      FROM employees
      WHERE company_id = ${user.companyId}
        AND is_active = true
        AND permit_type NOT IN ('CH', 'C')
        AND permit_expiry IS NOT NULL
        AND permit_expiry <= CURRENT_DATE + 60
      ORDER BY permit_expiry ASC
    `;
    res.json({ ok: true, alerts });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
