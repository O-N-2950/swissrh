import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { generateHolidays, buildHolidayInserts } from '../utils/public-holidays.js';

export const holidaysRouter = Router();

// GET /api/holidays?canton=JU&year=2025
holidaysRouter.get('/', async (req, res) => {
  try {
    const canton = (req.query.canton as string) || 'JU';
    const year   = parseInt(req.query.year as string) || new Date().getFullYear();
    const sql = getSQL();

    const rows = await sql`
      SELECT * FROM public_holidays
      WHERE (canton = ${canton} OR canton = 'CH') AND year = ${year}
      ORDER BY holiday_date
    `;

    if (rows.length === 0) {
      // Pas encore en DB — générer depuis le code et retourner
      const generated = generateHolidays(year).filter(
        h => h.cantons.includes('CH') || h.cantons.includes(canton),
      );
      return res.json({ ok: true, holidays: generated, source: 'generated' });
    }

    res.json({ ok: true, holidays: rows, source: 'db' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/holidays/seed — Seeder les fériés pour une année
holidaysRouter.post('/seed', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.body;
    const sql = getSQL();
    const rows = buildHolidayInserts(year);
    let inserted = 0;

    for (const row of rows) {
      await sql`
        INSERT INTO public_holidays (canton, holiday_date, name, name_fr, name_de, is_federal, is_paid, year)
        VALUES (${row.canton}, ${row.holiday_date}, ${row.name}, ${row.name_fr}, ${row.name_de},
                ${row.is_federal}, ${row.is_paid}, ${row.year})
        ON CONFLICT (canton, holiday_date) DO NOTHING
      `.catch(() => {}); // ignore constraint violations
      inserted++;
    }

    res.json({ ok: true, year, inserted, total: rows.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/holidays — Ajouter un férié custom (ex: pont décidé par l'entreprise)
holidaysRouter.post('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { canton, holidayDate, nameFr, nameDe, isPaid = true, year } = req.body;

    const [row] = await sql`
      INSERT INTO public_holidays (canton, holiday_date, name, name_fr, name_de, is_federal, is_paid, year)
      VALUES (
        ${canton || 'CH'}, ${holidayDate}, ${nameFr}, ${nameFr}, ${nameDe || nameFr},
        false, ${isPaid}, ${year || new Date(holidayDate).getFullYear()}
      )
      ON CONFLICT (canton, holiday_date) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `;

    res.json({ ok: true, holiday: row });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/holidays/:id
holidaysRouter.delete('/:id', async (req, res) => {
  try {
    const sql = getSQL();
    await sql`DELETE FROM public_holidays WHERE id = ${req.params.id} AND is_federal = false`;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
