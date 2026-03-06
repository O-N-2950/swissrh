import { Router } from 'express';
import { getSQL } from '../db/pool.js';

export const companyRouter = Router();

companyRouter.get('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const [company] = await sql`SELECT * FROM companies WHERE id = ${companyId}`;
    res.json({ ok: true, company });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

companyRouter.put('/', async (req, res) => {
  try {
    const { companyId } = (req as any).user;
    const sql = getSQL();
    const { name, legalForm, uid, address, npa, city, canton,
            avsNumber, lppNumber, laaNumber, ijmRate, laaP, famAlloc } = req.body;
    const [company] = await sql`
      UPDATE companies SET
        name        = COALESCE(${name}, name),
        legal_form  = ${legalForm ?? null},
        uid         = ${uid ?? null},
        address     = ${address ?? null},
        npa         = ${npa ?? null},
        city        = ${city ?? null},
        canton      = COALESCE(${canton}, canton),
        avs_number  = ${avsNumber ?? null},
        lpp_number  = ${lppNumber ?? null},
        laa_number  = ${laaNumber ?? null},
        ijm_rate    = COALESCE(${ijmRate}, ijm_rate),
        laa_p_rate  = COALESCE(${laaP}, laa_p_rate),
        fam_alloc   = COALESCE(${famAlloc}, fam_alloc),
        updated_at  = NOW()
      WHERE id = ${companyId}
      RETURNING *
    `;
    res.json({ ok: true, company });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
