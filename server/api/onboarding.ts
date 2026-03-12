/**
 * SWISSRH — Onboarding digital
 * GET  /api/onboarding/templates              — modèles de tâches
 * POST /api/onboarding/templates              — créer modèle
 * POST /api/onboarding/:employeeId/init       — initialiser onboarding depuis templates
 * GET  /api/onboarding/:employeeId            — tâches d'un employé
 * PUT  /api/onboarding/tasks/:taskId          — màj statut tâche
 * GET  /api/onboarding/overview               — vue d'ensemble RH
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireManager, type JwtPayload } from '../auth/middleware.js';

export const onboardingRouter = Router();

// Modèles par défaut
const DEFAULT_TEMPLATES = [
  { title: 'Envoyer contrat signé',        days_offset: -5,  category: 'admin'   },
  { title: 'Créer compte IT / email',       days_offset: -1,  category: 'it'      },
  { title: 'Préparer badge / accès',        days_offset: -1,  category: 'admin'   },
  { title: 'Accueil J1 — tour des locaux',  days_offset: 0,   category: 'manager' },
  { title: 'Remise équipement (PC, tél.)',  days_offset: 0,   category: 'it'      },
  { title: 'Formation règlement interne',   days_offset: 1,   category: 'rh'      },
  { title: 'Formation sécurité au travail', days_offset: 1,   category: 'rh'      },
  { title: 'Inscrire LPP / LAA',            days_offset: 3,   category: 'rh'      },
  { title: 'Mettre à jour organigramme',    days_offset: 3,   category: 'admin'   },
  { title: 'Bilan semaine 1',               days_offset: 7,   category: 'manager' },
  { title: 'Bilan mois 1 — entretien RH',   days_offset: 30,  category: 'rh'      },
  { title: 'Confirmer période d\'essai',    days_offset: 90,  category: 'manager' },
];

// GET /api/onboarding/templates
onboardingRouter.get('/templates', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    const dbTpls = await sql`
      SELECT * FROM onboarding_templates
      WHERE company_id = ${user.companyId} AND is_active = true
      ORDER BY days_offset, category
    `;
    const templates: any[] = dbTpls.length > 0
      ? [...dbTpls]
      : DEFAULT_TEMPLATES.map((t, i) => ({ id: -(i+1), ...t, company_id: user.companyId }));
    res.json({ ok: true, templates });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/onboarding/templates
onboardingRouter.post('/templates', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { title, description, days_offset, category } = req.body;
  if (!title) return res.status(400).json({ error: 'title requis' });
  try {
    const [t] = await sql`
      INSERT INTO onboarding_templates (company_id, title, description, days_offset, category)
      VALUES (${user.companyId}, ${title}, ${description||null}, ${days_offset||0}, ${category||'admin'})
      RETURNING *
    `;
    res.json({ ok: true, template: t });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/onboarding/:employeeId/init — génère les tâches depuis templates
onboardingRouter.post('/:employeeId/init', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const empId = Number(req.params.employeeId);

  try {
    const [emp] = await sql`SELECT hire_date FROM employees WHERE id = ${empId} AND company_id = ${user.companyId}`;
    if (!emp) return res.status(404).json({ error: 'Employé introuvable' });

    const hireDate = emp.hire_date ? new Date(emp.hire_date) : new Date();

    // Charger templates (DB ou défauts)
    let templates = await sql`
      SELECT * FROM onboarding_templates WHERE company_id = ${user.companyId} AND is_active = true
    `;
    let tmplList: any[] = templates.length > 0 ? [...templates] : DEFAULT_TEMPLATES.map((t,i)=>({id:-(i+1),...t}));
    // use tmplList below
    templates = tmplList as any;

    const tasks = [];
    for (const t of templates) {
      const due = new Date(hireDate);
      due.setDate(due.getDate() + (t.days_offset || 0));
      const [task] = await sql`
        INSERT INTO onboarding_tasks (company_id, employee_id, template_id, title, description, due_date, category)
        VALUES (${user.companyId}, ${empId}, ${t.id > 0 ? t.id : null},
                ${t.title}, ${t.description||null}, ${due.toISOString().slice(0,10)}, ${t.category||'admin'})
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      if (task) tasks.push(task);
    }
    res.json({ ok: true, created: tasks.length, tasks });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/onboarding/:employeeId
onboardingRouter.get('/:employeeId', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const empId = Number(req.params.employeeId);
  try {
    const tasks = await sql`
      SELECT t.*, u.first_name as assigned_first, u.last_name as assigned_last
      FROM onboarding_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.employee_id = ${empId} AND t.company_id = ${user.companyId}
      ORDER BY t.due_date NULLS LAST, t.category
    `;
    const done  = tasks.filter((t: any) => t.status === 'done').length;
    const total = tasks.length;
    res.json({ ok: true, tasks, progress: total > 0 ? Math.round(done/total*100) : 0, done, total });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/onboarding/tasks/:taskId
onboardingRouter.put('/tasks/:taskId', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  const { status, notes, assigned_to } = req.body;
  try {
    const [task] = await sql`
      UPDATE onboarding_tasks SET
        status       = COALESCE(${status||null}, status),
        notes        = COALESCE(${notes||null}, notes),
        assigned_to  = COALESCE(${assigned_to??null}, assigned_to),
        completed_at = CASE WHEN ${status||null} = 'done' THEN NOW() ELSE completed_at END,
        updated_at   = NOW()
      WHERE id = ${Number(req.params.taskId)} AND company_id = ${user.companyId}
      RETURNING *
    `;
    if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
    res.json({ ok: true, task });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/onboarding/overview — vue RH globale
onboardingRouter.get('/overview', requireManager, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql = getSQL();
  try {
    const overview = await sql`
      SELECT e.id, e.first_name, e.last_name, e.hire_date,
        COUNT(t.id)::int                                         as total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'done')::int       as done_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'pending'
          AND t.due_date < CURRENT_DATE)::int                   as overdue_tasks,
        MIN(t.due_date) FILTER (WHERE t.status = 'pending')     as next_due
      FROM employees e
      JOIN onboarding_tasks t ON t.employee_id = e.id
      WHERE e.company_id = ${user.companyId}
      GROUP BY e.id, e.first_name, e.last_name, e.hire_date
      ORDER BY e.hire_date DESC
    `;
    res.json({ ok: true, overview });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
