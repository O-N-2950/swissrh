/**
 * SwissRH — Seed Demo Data
 * Crée: 1 company + 1 admin + 5 employés + absences + time entries
 * Usage: npx ts-node server/db/seed-demo.ts
 *        ou via route: POST /api/admin/seed-demo (dev only)
 */
import bcrypt from 'bcryptjs';
import { getSQL, initPool } from './pool.js';

export async function seedDemo(): Promise<{ ok: boolean; message: string }> {
  const sql = getSQL();

  // Vérifier si déjà seedé
  const [{ c }] = await sql`SELECT COUNT(*)::int as c FROM companies`;
  if (c > 0) return { ok: false, message: 'Données déjà présentes — seed ignoré' };

  console.log('[SEED] Création des données de démonstration...');

  // ── Company ──────────────────────────────────────────────────────────
  const [company] = await sql`
    INSERT INTO companies (
      name, legal_form, uid, address, npa, city, canton,
      avs_number, lpp_number, laa_number,
      laa_np_rate, laa_p_rate, ijm_rate, fam_alloc
    ) VALUES (
      'Dupont Industries Sàrl', 'Sàrl',
      'CHE-123.456.789',
      'Route de la Gare 12', '2950', 'Courgenay', 'JU',
      '26.39.000.123', 'LPP-456789', 'SUVA-789012',
      0.013, 0.008, 0.015, 0.014
    ) RETURNING id
  `;

  // ── Admin user ───────────────────────────────────────────────────────
  const hash = await bcrypt.hash('Demo2025!', 12);
  await sql`
    INSERT INTO users (email, password_hash, role, company_id, first_name, last_name)
    VALUES ('admin@demo.ch', ${hash}, 'admin', ${company.id}, 'Admin', 'Demo')
  `;

  // ── Employees ────────────────────────────────────────────────────────
  const EMPLOYEES = [
    {
      first_name: 'Marc', last_name: 'Dupont',
      email: 'marc.dupont@dupont-industries.ch',
      birthdate: '1986-05-14', hire_date: '2019-03-01',
      contract_type: 'CDI', permit_type: 'CH',
      activity_rate: 100, weekly_hours: 42,
      salary_type: 'monthly', salary_amount: 5800,
      department: 'Production', position: 'Chef d\'atelier',
      vacation_weeks: 5,
    },
    {
      first_name: 'Sophie', last_name: 'Müller',
      email: 'sophie.mueller@dupont-industries.ch',
      birthdate: '1995-09-22', hire_date: '2021-06-15',
      contract_type: 'CDI', permit_type: 'B',
      permit_expiry: '2026-09-30',
      activity_rate: 80, weekly_hours: 34,
      salary_type: 'monthly', salary_amount: 4200,
      department: 'Administration', position: 'Assistante RH',
      vacation_weeks: 5,
    },
    {
      first_name: 'Carlos', last_name: 'García',
      email: 'carlos.garcia@dupont-industries.ch',
      birthdate: '1990-03-08', hire_date: '2024-01-01',
      contract_type: 'CDD', permit_type: 'G',
      permit_expiry: '2025-12-31',
      activity_rate: 100, weekly_hours: 42,
      salary_type: 'monthly', salary_amount: 3900,
      department: 'Logistique', position: 'Magasinier',
      vacation_weeks: 5,
    },
    {
      first_name: 'Anna', last_name: 'Schneider',
      email: 'anna.schneider@dupont-industries.ch',
      birthdate: '1979-11-30', hire_date: '2015-11-01',
      contract_type: 'CDI', permit_type: 'CH',
      activity_rate: 100, weekly_hours: 42,
      salary_type: 'monthly', salary_amount: 7200,
      department: 'Direction', position: 'Responsable RH',
      vacation_weeks: 6,
    },
    {
      first_name: 'Lucie', last_name: 'Favre',
      email: 'lucie.favre@dupont-industries.ch',
      birthdate: '2000-04-17', hire_date: '2023-08-01',
      contract_type: 'Horaire', permit_type: 'CH',
      activity_rate: 100, weekly_hours: 42,
      salary_type: 'hourly', salary_amount: 28.5,
      department: 'Production', position: 'Opératrice',
      vacation_weeks: 5,
    },
  ];

  const empIds: number[] = [];
  for (const emp of EMPLOYEES) {
    const [e] = await sql`
      INSERT INTO employees (
        company_id, first_name, last_name, email, birthdate, hire_date,
        contract_type, permit_type, permit_expiry,
        activity_rate, weekly_hours, salary_type, salary_amount,
        department, position, vacation_weeks, is_active
      ) VALUES (
        ${company.id}, ${emp.first_name}, ${emp.last_name}, ${emp.email},
        ${emp.birthdate}, ${emp.hire_date},
        ${emp.contract_type}, ${emp.permit_type}, ${(emp as any).permit_expiry || null},
        ${emp.activity_rate}, ${emp.weekly_hours},
        ${emp.salary_type}, ${emp.salary_amount},
        ${emp.department}, ${emp.position}, ${emp.vacation_weeks}, true
      ) RETURNING id
    `;
    empIds.push(e.id);
  }

  // ── Vacation balances ─────────────────────────────────────────────────
  const BALANCES = [
    { idx: 0, entitled: 25, taken: 8 },
    { idx: 1, entitled: 20, taken: 3 },
    { idx: 2, entitled: 25, taken: 12 },
    { idx: 3, entitled: 30, taken: 15 },
    { idx: 4, entitled: 25, taken: 6 },
  ];

  for (const b of BALANCES) {
    await sql`
      INSERT INTO vacation_balances (
        employee_id, company_id, year,
        entitled_days, taken_days, balance_days, carried_over_days
      ) VALUES (
        ${empIds[b.idx]}, ${company.id}, 2025,
        ${b.entitled}, ${b.taken}, ${b.entitled - b.taken}, 0
      ) ON CONFLICT DO NOTHING
    `;
  }

  // ── Absences ──────────────────────────────────────────────────────────
  const ABS = [
    { idx: 0, type: 'vacation',     start: '2025-03-03', end: '2025-03-07', status: 'approved' },
    { idx: 1, type: 'illness',      start: '2025-02-10', end: '2025-02-12', status: 'approved' },
    { idx: 2, type: 'vacation',     start: '2025-03-24', end: '2025-03-28', status: 'pending'  },
    { idx: 3, type: 'family',       start: '2025-02-20', end: '2025-02-20', status: 'approved' },
    { idx: 4, type: 'vacation',     start: '2025-04-14', end: '2025-04-18', status: 'pending'  },
  ];

  for (const a of ABS) {
    const d1 = new Date(a.start), d2 = new Date(a.end);
    const days = Math.round((d2.getTime()-d1.getTime())/(86400000)) + 1;
    await sql`
      INSERT INTO absence_requests (
        employee_id, company_id, absence_type,
        start_date, end_date, days_count, status, submitted_at
      ) VALUES (
        ${empIds[a.idx]}, ${company.id}, ${a.type},
        ${a.start}, ${a.end}, ${days}, ${a.status}, NOW()
      )
    `;
  }

  // ── Time entries (semaine courante) ───────────────────────────────────
  const TODAY = new Date();
  const MON = new Date(TODAY);
  MON.setDate(TODAY.getDate() - TODAY.getDay() + 1);

  for (let d = 0; d < 5; d++) {
    const dt = new Date(MON);
    dt.setDate(MON.getDate() + d);
    const dateStr = dt.toISOString().split('T')[0];
    // Seulement pour les 3 premiers employés
    for (let i = 0; i < 3; i++) {
      const startH = 8 + (i % 2 === 0 ? 0 : 0.25);
      const endH   = 17 + (d % 3 === 0 ? 0.5 : 0);
      const worked = endH - startH - 0.5; // 30min pause
      const target = EMPLOYEES[i].weekly_hours / 5;
      const ot     = Math.max(0, worked - target);
      await sql`
        INSERT INTO time_entries (
          employee_id, company_id, work_date,
          start_time, end_time, break_minutes,
          worked_hours, overtime_hours, status
        ) VALUES (
          ${empIds[i]}, ${company.id}, ${dateStr},
          ${`${Math.floor(startH).toString().padStart(2,'0')}:${String((startH%1)*60).padStart(2,'0')}`},
          ${`${Math.floor(endH).toString().padStart(2,'0')}:${String((endH%1)*60).padStart(2,'0')}`},
          30, ${worked}, ${ot}, 'approved'
        ) ON CONFLICT DO NOTHING
      `;
    }
  }

  console.log(`[SEED] ✅ ${EMPLOYEES.length} employés créés — company_id=${company.id}`);
  console.log(`[SEED] 🔑 Login: admin@demo.ch / Demo2025!`);

  return {
    ok: true,
    message: `Seed OK: ${EMPLOYEES.length} employés · Login: admin@demo.ch / Demo2025!`
  };
}

// Run standalone
if (process.argv[1].includes('seed-demo')) {
  initPool();
  seedDemo()
    .then(r => { console.log(r.message); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
