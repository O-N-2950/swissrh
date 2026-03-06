import { Router } from 'express';
import { getSQL } from '../db/pool.js';

export const employeesRouter = Router();

// GET /api/employees
employeesRouter.get('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { active, search } = req.query;

    const employees = await sql`
      SELECT e.*,
        EXTRACT(YEAR FROM AGE(e.birthdate))::int as age,
        CASE WHEN e.permit_expiry < CURRENT_DATE + 30 AND e.permit_expiry > CURRENT_DATE
          THEN true ELSE false END as permit_expiring_soon
      FROM employees e
      WHERE e.company_id = ${companyId}
        AND (${active === 'false' ? sql`1=1` : sql`e.is_active = true`})
        AND (${search ? sql`
          LOWER(e.first_name || ' ' || e.last_name) LIKE ${'%' + String(search).toLowerCase() + '%'}
          OR e.avs_number LIKE ${'%' + String(search) + '%'}
        ` : sql`1=1`})
      ORDER BY e.last_name, e.first_name
    `;

    res.json({ ok: true, employees });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/employees/:id
employeesRouter.get('/:id', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const [emp] = await sql`
      SELECT e.*,
        EXTRACT(YEAR FROM AGE(e.birthdate))::int as age
      FROM employees e
      WHERE e.id = ${req.params.id} AND e.company_id = ${companyId}
    `;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });
    res.json({ ok: true, employee: emp });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/employees — Create
employeesRouter.post('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const {
      firstName, lastName, email, phone, birthdate, hireDate,
      contractType, permitType, permitExpiry, activityRate, weeklyHours,
      salaryType, salaryAmount, department, position, vacationWeeks,
      avsNumber, address, npa, city, costCenter,
    } = req.body;

    if (!firstName || !lastName || !hireDate) {
      return res.status(400).json({ error: 'firstName, lastName et hireDate requis' });
    }

    const [emp] = await sql`
      INSERT INTO employees (
        company_id, first_name, last_name, email, phone,
        birthdate, hire_date, contract_type, permit_type, permit_expiry,
        activity_rate, weekly_hours, salary_type, salary_amount,
        department, position, vacation_weeks, avs_number,
        address, npa, city, cost_center
      ) VALUES (
        ${companyId}, ${firstName}, ${lastName}, ${email || null}, ${phone || null},
        ${birthdate || null}, ${hireDate}, ${contractType || 'CDI'}, ${permitType || 'CH'},
        ${permitExpiry || null},
        ${activityRate || 100}, ${weeklyHours || 42}, ${salaryType || 'monthly'},
        ${salaryAmount || 0}, ${department || null}, ${position || null},
        ${vacationWeeks || 5}, ${avsNumber || null},
        ${address || null}, ${npa || null}, ${city || null}, ${costCenter || null}
      )
      RETURNING *
    `;

    res.json({ ok: true, employee: emp });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/employees/:id — Update
employeesRouter.put('/:id', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const id = parseInt(req.params.id);

    // Verify ownership
    const [existing] = await sql`SELECT id FROM employees WHERE id = ${id} AND company_id = ${companyId}`;
    if (!existing) return res.status(404).json({ error: 'Employé introuvable' });

    const {
      firstName, lastName, email, phone, birthdate, hireDate, endDate,
      contractType, permitType, permitExpiry, activityRate, weeklyHours,
      salaryType, salaryAmount, department, position, vacationWeeks,
      avsNumber, address, npa, city, costCenter, isActive, notes,
    } = req.body;

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
        avs_number    = ${avsNumber ?? null},
        address       = ${address ?? null},
        npa           = ${npa ?? null},
        city          = ${city ?? null},
        cost_center   = ${costCenter ?? null},
        is_active     = COALESCE(${isActive}, is_active),
        notes         = ${notes ?? null},
        updated_at    = NOW()
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `;

    res.json({ ok: true, employee: emp });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/employees/:id — Soft delete
employeesRouter.delete('/:id', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    await sql`
      UPDATE employees SET is_active = false, end_date = CURRENT_DATE, updated_at = NOW()
      WHERE id = ${req.params.id} AND company_id = ${companyId}
    `;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/employees/alerts/permits — Permis expirant dans 60 jours
employeesRouter.get('/alerts/permits', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const alerts = await sql`
      SELECT id, first_name, last_name, permit_type, permit_expiry,
        (permit_expiry - CURRENT_DATE)::int as days_remaining
      FROM employees
      WHERE company_id = ${companyId}
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
