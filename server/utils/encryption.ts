/**
 * SWISSRH — Chiffrement PII RH
 * ============================================================
 * AES-256-GCM pour les champs sensibles :
 *   - Numéro AVS (756.XXXX.XXXX.XX)
 *   - IBAN
 *   - Salaire brut
 *   - Évaluations / notes RH
 *
 * Clé depuis ENCRYPTION_KEY (32 octets hex, 64 chars)
 * Format stocké : base64(iv[12] + tag[16] + ciphertext)
 * ============================================================
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[ENCRYPTION] ENCRYPTION_KEY manquante ou invalide (doit être 64 chars hex)');
    }
    // Dev only — ne jamais en prod
    console.warn('[ENCRYPTION] ⚠️  Clé de dev utilisée — ENCRYPTION_KEY manquante');
    return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
  }
  return Buffer.from(keyHex, 'hex');
}

/** Chiffre un texte, retourne null si input null/undefined */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/** Déchiffre, retourne null si input null/invalide */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null) return null;
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, 'base64');
    const iv  = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    console.error('[ENCRYPTION] Déchiffrement échoué — données corrompues ?');
    return null;
  }
}

/** Masque un numéro AVS pour l'affichage (ex: 756.XXXX.XXXX.XX) */
export function maskAvs(avs: string | null | undefined): string {
  if (!avs) return '—';
  const clean = avs.replace(/\D/g, '');
  if (clean.length !== 13) return '756.XXXX.XXXX.XX';
  return `${clean.slice(0, 3)}.XXXX.XXXX.XX`;
}

/** Masque un IBAN pour l'affichage (ex: CH56 XXXX XXXX XXXX XXXX X) */
export function maskIban(iban: string | null | undefined): string {
  if (!iban) return '—';
  const clean = iban.replace(/\s/g, '');
  if (clean.length < 6) return 'CHXX XXXX XXXX XXXX XXXX X';
  return `${clean.slice(0, 4)} XXXX XXXX XXXX XXXX X`;
}

/**
 * Prépare un objet employé pour l'API :
 * - admin/rh_manager : déchiffre les PII
 * - employee (self) : déchiffre ses propres données, masque les autres
 * - employee (other) : retourne uniquement nom/prénom/poste
 */
export function prepareEmployeeForApi(
  raw: Record<string, any>,
  requesterRole: string,
  requesterId: number,
): Record<string, any> {
  const isAdmin   = requesterRole === 'admin';
  const isManager = requesterRole === 'rh_manager';
  const isSelf    = requesterRole === 'employee' && raw.user_id === requesterId;

  if (isAdmin || isManager || isSelf) {
    // Déchiffre toutes les PII
    return {
      ...raw,
      avs_number:    decrypt(raw.avs_number),
      iban:          decrypt(raw.iban),
      salary_amount: raw.salary_amount, // déjà décimal en DB
      avs_masked:    maskAvs(decrypt(raw.avs_number)),
    };
  }

  // Autre employé — données minimales uniquement
  return {
    id:         raw.id,
    first_name: raw.first_name,
    last_name:  raw.last_name,
    department: raw.department,
    position:   raw.position,
    email:      raw.email,
    avs_masked: '756.XXXX.XXXX.XX',
  };
}
