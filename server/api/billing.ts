/**
 * SWISSRH — Stripe Billing
 * ============================================================
 * Plans :
 *   starter    — 1 entreprise,  ≤10 employés   → CHF  49/mois
 *   pro        — 1 entreprise,  ≤50 employés   → CHF  99/mois
 *   fiduciaire — N entreprises, illimité        → CHF 199/mois
 *
 * GET  /api/billing/plans            — liste plans + prix
 * GET  /api/billing/subscription     — abonnement actif
 * POST /api/billing/checkout         — créer session Stripe Checkout
 * POST /api/billing/portal           — ouvrir Customer Portal Stripe
 * POST /api/billing/webhook          — webhook Stripe (signature validée)
 * POST /api/billing/cancel           — annuler abonnement
 * ============================================================
 */
import { Router } from 'express';
import { getSQL } from '../db/pool.js';
import { requireAuth, requireAdmin, type JwtPayload } from '../auth/middleware.js';

export const billingRouter = Router();

// ── Plan config ─────────────────────────────────────────────
const PLANS = {
  starter: {
    id: 'starter', label: 'Starter',
    price_chf: 49, max_employees: 10, max_companies: 1,
    stripe_price_id: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    features: ['1 entreprise', '≤10 employés', 'Bulletins PDF', 'Exports CSV', 'Portail employé'],
  },
  pro: {
    id: 'pro', label: 'Pro',
    price_chf: 99, max_employees: 50, max_companies: 1,
    stripe_price_id: process.env.STRIPE_PRICE_PRO || 'price_pro',
    features: ['1 entreprise', '≤50 employés', 'Tout Starter +', 'ELM XML Swissdec', 'Lohnausweis', 'IA Anomalies', 'Shifts'],
  },
  fiduciaire: {
    id: 'fiduciaire', label: 'Fiduciaire',
    price_chf: 199, max_employees: -1, max_companies: -1,
    stripe_price_id: process.env.STRIPE_PRICE_FIDUCIAIRE || 'price_fiduciaire',
    features: ['Mandats illimités', 'Employés illimités', 'Tout Pro +', 'Multi-mandants', 'Switcher client', 'Support prioritaire'],
  },
} as const;

type PlanId = keyof typeof PLANS;

// Helper Stripe avec lazy import
async function getStripe() {
  const Stripe = (await import('stripe')).default;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY manquante');
  return new Stripe(key, { apiVersion: '2025-06-30.basil' as any });
}

// ── GET /api/billing/plans ──────────────────────────────────
billingRouter.get('/plans', (_req, res) => {
  res.json({ ok: true, plans: Object.values(PLANS) });
});

// ── GET /api/billing/subscription ──────────────────────────
billingRouter.get('/subscription', requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  try {
    const [co] = await sql`
      SELECT id, name, billing_plan, billing_status, stripe_customer_id,
             stripe_subscription_id, billing_period_end, employee_count
      FROM companies WHERE id = ${user.companyId}
    `;
    const [empCount] = await sql`
      SELECT COUNT(*)::int as cnt FROM employees
      WHERE company_id = ${user.companyId} AND is_active = true
    `;
    const plan = co?.billing_plan ? PLANS[co.billing_plan as PlanId] : null;
    res.json({
      ok: true,
      subscription: co ? {
        plan:        co.billing_plan  || 'trial',
        status:      co.billing_status || 'trial',
        periodEnd:   co.billing_period_end,
        hasStripe:   !!co.stripe_subscription_id,
        employeeCount: empCount?.cnt || 0,
        maxEmployees:  plan?.max_employees || 10,
      } : null,
      planDetails: plan,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/billing/checkout ──────────────────────────────
billingRouter.post('/checkout', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  const { planId, successUrl, cancelUrl } = req.body;

  if (!planId || !PLANS[planId as PlanId])
    return res.status(400).json({ error: 'Plan invalide' });

  try {
    const plan = PLANS[planId as PlanId];
    const [co]  = await sql`SELECT name, stripe_customer_id FROM companies WHERE id = ${user.companyId}`;

    const stripe = await getStripe();

    // Créer ou récupérer customer Stripe
    let customerId = co?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        name:     co?.name || 'SwissRH Client',
        metadata: { companyId: String(user.companyId) },
      });
      customerId = customer.id;
      await sql`UPDATE companies SET stripe_customer_id = ${customerId} WHERE id = ${user.companyId}`;
    }

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: successUrl || `${process.env.SWISSRH_APP_URL || 'https://swissrh.ch'}/?billing=success`,
      cancel_url:  cancelUrl  || `${process.env.SWISSRH_APP_URL || 'https://swissrh.ch'}/?billing=cancelled`,
      metadata:   { companyId: String(user.companyId), planId },
      subscription_data: {
        metadata: { companyId: String(user.companyId), planId },
      },
      locale: 'fr',
      currency: 'chf',
      allow_promotion_codes: true,
    });

    res.json({ ok: true, url: session.url, sessionId: session.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/billing/portal ────────────────────────────────
billingRouter.post('/portal', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  try {
    const [co] = await sql`SELECT stripe_customer_id FROM companies WHERE id = ${user.companyId}`;
    if (!co?.stripe_customer_id) return res.status(400).json({ error: 'Aucun abonnement Stripe actif' });

    const stripe   = await getStripe();
    const session  = await stripe.billingPortal.sessions.create({
      customer:   co.stripe_customer_id,
      return_url: `${process.env.SWISSRH_APP_URL || 'https://swissrh.ch'}/settings`,
    });
    res.json({ ok: true, url: session.url });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/billing/cancel ────────────────────────────────
billingRouter.post('/cancel', requireAdmin, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const sql  = getSQL();
  try {
    const [co] = await sql`SELECT stripe_subscription_id FROM companies WHERE id = ${user.companyId}`;
    if (!co?.stripe_subscription_id) return res.status(400).json({ error: 'Aucun abonnement actif' });

    const stripe = await getStripe();
    await stripe.subscriptions.update(co.stripe_subscription_id, { cancel_at_period_end: true });
    await sql`UPDATE companies SET billing_status = 'cancelling' WHERE id = ${user.companyId}`;
    res.json({ ok: true, message: 'Abonnement annulé à la fin de la période' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/billing/webhook (public — pas de requireAuth) ─
billingRouter.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[BILLING] STRIPE_WEBHOOK_SECRET manquant — webhook ignoré');
    return res.json({ ok: true });
  }

  let event: any;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (e: any) {
    console.error('[BILLING] Webhook signature invalide:', e.message);
    return res.status(400).json({ error: `Webhook error: ${e.message}` });
  }

  const sql = getSQL();

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session   = event.data.object;
        const companyId = Number(session.metadata?.companyId);
        const planId    = session.metadata?.planId as PlanId;
        if (companyId && planId) {
          await sql`
            UPDATE companies SET
              billing_plan           = ${planId},
              billing_status         = 'active',
              stripe_subscription_id = ${session.subscription || null}
            WHERE id = ${companyId}
          `;
          console.log(`[BILLING] ✅ checkout.session.completed — company #${companyId} → ${planId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv       = event.data.object;
        const subId     = inv.subscription;
        if (subId) {
          const periodEnd = new Date(inv.period_end * 1000).toISOString();
          await sql`
            UPDATE companies SET
              billing_status     = 'active',
              billing_period_end = ${periodEnd}
            WHERE stripe_subscription_id = ${subId}
          `;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object;
        if (inv.subscription) {
          await sql`
            UPDATE companies SET billing_status = 'past_due'
            WHERE stripe_subscription_id = ${inv.subscription}
          `;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await sql`
          UPDATE companies SET
            billing_status         = 'cancelled',
            billing_plan           = 'trial',
            stripe_subscription_id = NULL
          WHERE stripe_subscription_id = ${sub.id}
        `;
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status === 'active' ? 'active'
          : sub.cancel_at_period_end ? 'cancelling' : sub.status;
        await sql`
          UPDATE companies SET billing_status = ${status}
          WHERE stripe_subscription_id = ${sub.id}
        `;
        break;
      }
    }

    res.json({ ok: true, received: event.type });
  } catch (e: any) {
    console.error('[BILLING] Webhook handler error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
