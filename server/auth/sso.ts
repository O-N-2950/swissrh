/**
 * SWISSRH — SSO Callback depuis WinWin
 * ============================================================
 * Flow complet cross-domain :
 *
 *  1. Client connecté sur winwin.swiss clique "Accéder à SwissRH"
 *  2. WinWin génère un transfer_token JWT (5 min, usage unique)
 *     signé avec WINWIN_SSO_SECRET
 *  3. Redirect → swissrh.ch/auth/sso?token=xxx
 *  4. Frontend SwissRH appelle GET /api/auth/sso-callback?token=xxx
 *  5. SwissRH vérifie le token, trouve/crée l'utilisateur,
 *     émet le cookie srh_session
 *  6. Redirect → dashboard SwissRH
 *
 * Sécurité :
 *  - Token usage unique (invalidé après vérification)
 *  - Expire dans 5 minutes
 *  - Signé HMAC avec WINWIN_SSO_SECRET partagé
 *  - Audit log de chaque SSO login
 * ============================================================
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getSQL } from '../db/pool.js';
import { signToken } from './middleware.js';
import { audit, getIp } from '../utils/audit-log.js';

export const ssoRouter = Router();

function getSsoSecret(): string {
  const secret = process.env.WINWIN_SSO_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('[SSO] WINWIN_SSO_SECRET manquant en production');
  }
  return secret || 'winwin-sso-dev-secret-CHANGE-IN-PROD';
}

export interface SsoTransferPayload {
  email:       string;
  clientId?:   number;  // ID client WinWin
  companyId?:  number;  // ID company SwissRH (si déjà lié)
  firstName?:  string;
  lastName?:   string;
  app:         'swissrh';
  nonce:       string;  // usage unique
}

/**
 * GET /api/auth/sso-callback?token=xxx
 * Vérifie le transfer token WinWin et crée une session SwissRH
 */
ssoRouter.get('/sso-callback', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token SSO manquant' });
  }

  const sql = getSQL();

  try {
    // 1 — Vérifier la signature du transfer token
    let payload: SsoTransferPayload;
    try {
      payload = jwt.verify(token, getSsoSecret()) as SsoTransferPayload;
    } catch (e: any) {
      console.warn('[SSO] Token invalide ou expiré:', e.message);
      return res.status(401).json({ error: 'Token SSO invalide ou expiré' });
    }

    if (payload.app !== 'swissrh') {
      return res.status(400).json({ error: 'Token SSO non destiné à SwissRH' });
    }

    // 2 — Vérifier que le nonce n'a pas déjà été utilisé (usage unique)
    const [usedNonce] = await sql`
      SELECT id FROM sso_nonces WHERE nonce = ${payload.nonce}
    `.catch(() => [null]);

    if (usedNonce) {
      return res.status(401).json({ error: 'Token SSO déjà utilisé' });
    }

    // 3 — Enregistrer le nonce comme utilisé
    await sql`
      INSERT INTO sso_nonces (nonce, used_at, email)
      VALUES (${payload.nonce}, NOW(), ${payload.email})
    `.catch(() => {}); // Table créée par migration, ignorer si non existante encore

    // 4 — Trouver ou créer l'utilisateur SwissRH
    const email = payload.email.toLowerCase();
    let [user] = await sql`
      SELECT u.*, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${email} AND u.is_active = true
    `;

    if (!user) {
      // Première connexion SSO → créer le compte
      // Chercher si une company est liée au clientId WinWin
      let companyId: number | null = payload.companyId || null;

      if (!companyId && payload.clientId) {
        const [linked] = await sql`
          SELECT id FROM companies WHERE winwin_client_id = ${payload.clientId}
        `.catch(() => [null]);
        if (linked) companyId = linked.id;
      }

      if (!companyId) {
        // Pas encore de company SwissRH liée → informer l'utilisateur
        return res.status(403).json({
          error: 'sso_no_company',
          message: 'Votre entreprise n\'a pas encore de compte SwissRH actif. Contactez votre administrateur.',
        });
      }

      // Créer l'utilisateur avec rôle employee par défaut
      const [newUser] = await sql`
        INSERT INTO users (
          email, role, company_id, first_name, last_name,
          is_active, sso_provider, last_login
        ) VALUES (
          ${email}, 'employee', ${companyId},
          ${payload.firstName || null}, ${payload.lastName || null},
          true, 'winwin', NOW()
        )
        RETURNING *
      `;
      user = newUser;

      console.log(`[SSO] ✅ Nouveau compte SwissRH créé via WinWin: ${email} (company #${companyId})`);
    } else {
      // Mettre à jour la date de connexion
      await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
    }

    // 5 — Émettre le cookie de session SwissRH
    const srhToken = signToken({
      userId:    user.id,
      email:     user.email,
      role:      user.role,
      companyId: user.company_id,
      employeeId: user.employee_id || undefined,
    });

    res.cookie('srh_session', srhToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 jours
    });

    // 6 — Audit log
    audit({
      userId:    user.id,
      userEmail: user.email,
      userRole:  user.role,
      companyId: user.company_id,
      action:    'LOGIN',
      details:   'SSO WinWin Magic Link',
      ipAddress: getIp(req),
    });

    console.log(`[SSO] ✅ Login SSO WinWin: ${email} → role ${user.role}`);

    // 7 — Répondre avec les infos user (le frontend redirige vers /dashboard)
    res.json({
      ok: true,
      user: {
        id:          user.id,
        email:       user.email,
        role:        user.role,
        firstName:   user.first_name,
        lastName:    user.last_name,
        companyId:   user.company_id,
        companyName: user.company_name,
      },
    });

  } catch (e: any) {
    console.error('[SSO] Erreur callback:', e.message);
    res.status(500).json({ error: 'Erreur serveur SSO' });
  }
});

/**
 * GET /api/auth/sso-status
 * Vérifie si le SSO WinWin est configuré
 */
ssoRouter.get('/sso-status', (_req, res) => {
  const configured = !!(process.env.WINWIN_SSO_SECRET);
  res.json({
    ok: true,
    sso: {
      winwin: {
        enabled: configured,
        loginUrl: process.env.WINWIN_APP_URL || 'https://winwin.swiss',
      },
    },
  });
});
