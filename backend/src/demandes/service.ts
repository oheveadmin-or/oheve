import type { PoolClient } from 'pg';

import { pool } from '../config/database';
import { sqlVisibleEmail } from '../auth/username';
import { CONTENU_MAX, CONTENU_MIN, demandesConfig, DemandeStatut, STATUTS_OUVERTS } from './config';
import { renderDemandeComplete } from './emails/demande-complete';
import { renderDemandeVerrouillee } from './emails/demande-verrouillee';
import { renderReponseClient } from './emails/reponse-client';
import type { RenderedEmail } from './emails/layout';
import { sendDemandeEmail, unsubscribeLinks } from './mailer';
import { apercu, cleanMessage, extrait } from './sanitize';
import { signDemandeLink } from './tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Types & erreurs
// ─────────────────────────────────────────────────────────────────────────────

export class DemandeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Origine = 'formulaire' | 'chat';

interface DemandeRow {
  id: number;
  prestataire_id: number;
  client_id: number;
  conversation_id: number | null;
  created_at: Date;
  statut: DemandeStatut;
  numero_gratuit: number | null;
  debloquee_at: Date | null;
  consentement_contact: boolean;
  relance_24h_envoyee: boolean;
  relance_72h_envoyee: boolean;
  origine: string;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  is_read: boolean;
  created_at: Date;
  statut_email: string | null;
  resend_email_id: string | null;
}

/** Statuts Stripe/stores qui valent abonnement actif (même règle que prestataire-subscription). */
const SUB_ACTIVE = ['trialing', 'active'];

export function prestaAbonneActif(row: {
  presta_sub_status?: string | null;
  presta_sub_id?: string | null;
  presta_current_period_end?: Date | string | null;
}): boolean {
  if (!row.presta_sub_status || !SUB_ACTIVE.includes(row.presta_sub_status)) return false;
  // Abonnement store (Apple/Google) ou offert par l'admin : la date de fin
  // stockée fait foi (pas de webhook Stripe pour le repasser à « canceled »).
  const id = row.presta_sub_id ?? '';
  const horsStripe = id.startsWith('apple:') || id.startsWith('google:') || id === 'admin:grant';
  if (horsStripe && row.presta_current_period_end && new Date(row.presta_current_period_end).getTime() < Date.now()) {
    return false;
  }
  return true;
}

/** Même règle, en SQL (alias de la table users = u). */
export const SQL_ABONNE_ACTIF = `(
  u.presta_sub_status IN ('trialing','active')
  AND NOT (COALESCE(u.presta_sub_id,'') ~ '^(apple:|google:|admin:grant)'
           AND u.presta_current_period_end IS NOT NULL
           AND u.presta_current_period_end < NOW())
)`;

const CLIENT_LOCK_KEY = 815301; // verrou consultatif : nouvelles demandes d'un même client

function estOuverte(statut: DemandeStatut): boolean {
  return STATUTS_OUVERTS.includes(statut);
}

// ─────────────────────────────────────────────────────────────────────────────
// Création d'une demande / ajout d'un message
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateResult {
  demandeId: number;
  conversationId: number;
  nouvelle: boolean;
  statut: DemandeStatut;
  message: MessageRow;
}

/**
 * Envoi d'un message d'un CLIENT à un prestataire.
 *  - S'il existe déjà une demande entre eux : le message s'y ajoute (aucun
 *    crédit consommé).
 *  - Sinon la demande est créée et son statut fixé DANS UNE TRANSACTION, la
 *    ligne du prestataire verrouillée (FOR UPDATE) : deux demandes simultanées
 *    ne peuvent pas consommer le même crédit offert, ni dépasser la limite.
 */
export async function envoyerMessageClient(input: {
  clientId: number;
  prestataireId: number;
  contenu: unknown;
  consentement: boolean;
  origine: Origine;
  /** Longueur minimale (10 pour le formulaire, 1 pour la messagerie). */
  minLength?: number;
}): Promise<CreateResult> {
  const contenu = cleanMessage(input.contenu);
  const min = input.minLength ?? CONTENU_MIN;
  if (contenu.length < min) {
    throw new DemandeError(400, min > 1
      ? `Votre message doit contenir au moins ${min} caractères.`
      : 'Votre message est vide.');
  }
  if (contenu.length > CONTENU_MAX) {
    throw new DemandeError(400, `Votre message ne doit pas dépasser ${CONTENU_MAX} caractères.`);
  }
  if (input.clientId === input.prestataireId) {
    throw new DemandeError(400, 'Vous ne pouvez pas vous envoyer une demande à vous-même.');
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock($1, $2)', [CLIENT_LOCK_KEY, input.clientId]);

    // Ligne du prestataire verrouillée jusqu'au COMMIT.
    const presta = (await db.query(
      `SELECT u.id, u.role, u.is_active, u.presta_sub_status, u.presta_sub_id,
              u.presta_current_period_end, u.demandes_gratuites_utilisees
       FROM users u WHERE u.id = $1 FOR UPDATE`,
      [input.prestataireId],
    )).rows[0];
    if (!presta || presta.role !== 'prestataire' || !presta.is_active) {
      throw new DemandeError(404, 'Ce prestataire est introuvable.');
    }

    const existing: DemandeRow | undefined = (await db.query(
      `SELECT * FROM demandes WHERE client_id=$1 AND prestataire_id=$2 FOR UPDATE`,
      [input.clientId, input.prestataireId],
    )).rows[0];

    const conversationId = await ensureConversation(db, input.clientId, input.prestataireId);

    if (existing) {
      // Même client, même prestataire : simple message de plus.
      await db.query(
        `UPDATE demandes SET conversation_id=$2,
                consentement_contact = consentement_contact OR $3
         WHERE id=$1`,
        [existing.id, conversationId, input.consentement === true],
      );
      const message = await insertMessage(db, conversationId, input.clientId, contenu);
      await db.query('COMMIT');
      return { demandeId: existing.id, conversationId, nouvelle: false, statut: existing.statut, message };
    }

    // Anti-spam : nouvelles demandes de ce client sur 24 h glissantes.
    const recent = (await db.query(
      `SELECT COUNT(*)::int AS n FROM demandes
       WHERE client_id=$1 AND origine <> 'historique' AND created_at > NOW() - INTERVAL '24 hours'`,
      [input.clientId],
    )).rows[0].n as number;
    if (recent >= demandesConfig.maxNewPerClientPerDay) {
      throw new DemandeError(429,
        `Vous avez déjà contacté ${recent} prestataires ces dernières 24 heures. Réessayez demain pour contacter de nouveaux prestataires.`);
    }

    // Statut de la nouvelle demande.
    let statut: DemandeStatut;
    let numero: number | null = null;
    if (prestaAbonneActif(presta)) {
      statut = 'abonnement';
    } else if ((presta.demandes_gratuites_utilisees ?? 0) < demandesConfig.freeLimit) {
      statut = 'gratuite';
      numero = (presta.demandes_gratuites_utilisees ?? 0) + 1;
      await db.query(`UPDATE users SET demandes_gratuites_utilisees=$2 WHERE id=$1`, [presta.id, numero]);
    } else {
      statut = 'verrouillee';
    }

    const demande = (await db.query(
      `INSERT INTO demandes (prestataire_id, client_id, conversation_id, statut, numero_gratuit,
                             consentement_contact, origine)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.prestataireId, input.clientId, conversationId, statut, numero, input.consentement === true, input.origine],
    )).rows[0];
    const message = await insertMessage(db, conversationId, input.clientId, contenu);
    await db.query('COMMIT');
    return { demandeId: demande.id, conversationId, nouvelle: true, statut, message };
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    db.release();
  }
}

async function ensureConversation(db: PoolClient, clientId: number, prestataireId: number): Promise<number> {
  const r = await db.query(
    `INSERT INTO conversations (client_id, prestataire_id, last_message_at) VALUES ($1,$2,NOW())
     ON CONFLICT (client_id, prestataire_id) DO UPDATE SET last_message_at = NOW()
     RETURNING id`,
    [clientId, prestataireId],
  );
  return r.rows[0].id;
}

async function insertMessage(db: PoolClient | typeof pool, conversationId: number, senderId: number, contenu: string): Promise<MessageRow> {
  await db.query(`UPDATE conversations SET last_message_at=NOW() WHERE id=$1`, [conversationId]);
  return (await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3) RETURNING *`,
    [conversationId, senderId, contenu],
  )).rows[0];
}

/** Demande liée à une conversation (null = conversation sans demande). */
export async function demandeDeConversation(conversationId: number): Promise<DemandeRow | null> {
  return (await pool.query(`SELECT * FROM demandes WHERE conversation_id=$1`, [conversationId])).rows[0] ?? null;
}

async function getDemande(id: number): Promise<DemandeRow | null> {
  return (await pool.query(`SELECT * FROM demandes WHERE id=$1`, [id])).rows[0] ?? null;
}

/**
 * Le prestataire est-il autorisé à LIRE / RÉPONDRE à cette demande ?
 * Passe d'abord ses demandes verrouillées en « abonnement » s'il est abonné
 * (abonnement pris via l'App Store, Google Play, l'admin… sans webhook Stripe).
 */
export async function demandeOuvertePourPresta(d: DemandeRow): Promise<DemandeRow> {
  if (d.statut !== 'verrouillee') return d;
  await promouvoirSiAbonne(d.prestataire_id);
  return (await getDemande(d.id)) ?? d;
}

/** Abonné actif → toutes ses demandes verrouillées passent en « abonnement ». */
export async function promouvoirSiAbonne(prestataireId: number): Promise<number> {
  const r = await pool.query(
    `UPDATE demandes d SET statut='abonnement'
     FROM users u
     WHERE u.id = d.prestataire_id AND d.prestataire_id=$1 AND d.statut='verrouillee' AND ${SQL_ABONNE_ACTIF}`,
    [prestataireId],
  );
  return r.rowCount ?? 0;
}

/** Appelé quand un abonnement devient actif (webhook Stripe). */
export async function promouvoirDemandesVerrouillees(prestataireId: number): Promise<number> {
  const r = await pool.query(
    `UPDATE demandes SET statut='abonnement' WHERE prestataire_id=$1 AND statut='verrouillee'`,
    [prestataireId],
  );
  return r.rowCount ?? 0;
}

/** Réponse du PRESTATAIRE (app ou page web). Refusée tant que la demande est verrouillée. */
export async function envoyerMessagePresta(demandeId: number, prestataireId: number, contenuBrut: unknown): Promise<MessageRow> {
  const contenu = cleanMessage(contenuBrut);
  if (!contenu) throw new DemandeError(400, 'Votre message est vide.');
  if (contenu.length > CONTENU_MAX) throw new DemandeError(400, `Votre message ne doit pas dépasser ${CONTENU_MAX} caractères.`);
  let d = await getDemande(demandeId);
  if (!d || d.prestataire_id !== prestataireId) throw new DemandeError(404, 'Demande introuvable.');
  d = await demandeOuvertePourPresta(d);
  if (!estOuverte(d.statut)) {
    throw new DemandeError(402, 'Débloquez cette demande ou activez votre abonnement pour répondre.');
  }
  let convId = d.conversation_id;
  if (!convId) {
    const db = await pool.connect();
    try { convId = await ensureConversation(db, d.client_id, d.prestataire_id); }
    finally { db.release(); }
    await pool.query(`UPDATE demandes SET conversation_id=$2 WHERE id=$1`, [d.id, convId]);
  }
  return insertMessage(pool, convId, prestataireId, contenu);
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications (e-mail + push) après un message
// ─────────────────────────────────────────────────────────────────────────────

let importTableExists: boolean | null = null;
async function hasImportTable(): Promise<boolean> {
  if (importTableExists === null) {
    importTableExists = !!(await pool.query(`SELECT to_regclass('public.admin_presta_import') AS t`)).rows[0]?.t;
  }
  return importTableExists;
}

interface Personnes {
  d: DemandeRow;
  client: { id: number; prenom: string; nom: string; email: string | null; phone: string | null; notifications_email: boolean };
  presta: { id: number; prenom: string; email: string | null; notifications_email: boolean; business_name: string };
}

/** E-mail réel d'un compte (jamais l'e-mail technique des comptes à identifiant). */
async function chargerPersonnes(d: DemandeRow): Promise<Personnes> {
  const withImport = await hasImportTable();
  const presta = (await pool.query(
    `SELECT u.id, u.prenom, u.notifications_email,
            COALESCE(${sqlVisibleEmail('u.email')}, ${withImport ? 'NULLIF(TRIM(api.contact_email), \'\')' : 'NULL'}) AS email,
            COALESCE(NULLIF(TRIM(p.business_name), ''), TRIM(u.prenom || ' ' || u.nom)) AS business_name
     FROM users u
     LEFT JOIN prestataire_profiles p ON p.user_id = u.id
     ${withImport ? 'LEFT JOIN admin_presta_import api ON api.user_id = u.id' : ''}
     WHERE u.id = $1`,
    [d.prestataire_id],
  )).rows[0];
  const client = (await pool.query(
    `SELECT id, prenom, nom, ${sqlVisibleEmail('email')} AS email, NULLIF(TRIM(phone), '') AS phone, notifications_email
     FROM users WHERE id = $1`,
    [d.client_id],
  )).rows[0];
  // Comptes prestataires importés : le prénom est parfois vide → nom de la fiche.
  presta.prenom = presta.prenom?.trim() || presta.business_name;
  client.prenom = client.prenom?.trim() || 'Un client';
  return { d, client, presta };
}

function liens(d: DemandeRow, destinataireId: number) {
  const { siteUrl } = demandesConfig;
  return {
    demandeUrl: `${siteUrl}/demande/${d.id}?t=${encodeURIComponent(signDemandeLink(destinataireId, d.id))}`,
    ficheUrl: `${siteUrl}/prestataire/${d.prestataire_id}`,
    unsubscribeUrl: unsubscribeLinks(destinataireId).page,
  };
}

async function envoyerEtTracer(messageId: number | null, mail: RenderedEmail & { to: string | null; replyTo?: string | null; recipientUserId: number }): Promise<boolean> {
  if (messageId) await pool.query(`UPDATE messages SET statut_email='en_attente' WHERE id=$1`, [messageId]);
  const res = mail.to
    ? await sendDemandeEmail({ ...mail, to: mail.to })
    : { ok: false as const, error: 'Aucune adresse e-mail' };
  if (messageId) {
    await pool.query(
      `UPDATE messages SET statut_email=$2, resend_email_id=$3 WHERE id=$1`,
      [messageId, res.ok ? 'envoye' : 'echec', res.ok ? res.id : null],
    );
  }
  if (!res.ok) console.warn(`[demandes] e-mail non envoyé (message ${messageId ?? '-'}) : ${res.error}`);
  return res.ok;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
async function push(userId: number, title: string, body: string, data: Record<string, unknown>) {
  try {
    const tokens = (await pool.query(`SELECT token FROM push_tokens WHERE user_id=$1`, [userId])).rows.map((r) => r.token);
    if (!tokens.length) return;
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map((to: string) => ({ to, sound: 'default', title, body, data }))),
    });
  } catch (err) {
    console.error('[demandes] push:', (err as Error).message);
  }
}

/** Un message du même auteur dans cette conversation il y a moins de 5 min ? (rafale → 1 seul e-mail) */
async function rafale(message: MessageRow): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM messages
     WHERE conversation_id=$1 AND sender_id=$2 AND id <> $3
       AND created_at > $4::timestamptz - INTERVAL '5 minutes'
     LIMIT 1`,
    [message.conversation_id, message.sender_id, message.id, message.created_at],
  );
  return !!r.rowCount;
}

/**
 * E-mail + push après un message d'une demande. Ne lève jamais.
 *  - client → prestataire : 1re demande = e-mail complet ou verrouillé ;
 *    message suivant = e-mail complet si la demande est ouverte (rien si verrouillée) ;
 *  - prestataire → client : « [Prestataire] vous a répondu ».
 */
export async function notifierMessage(demandeId: number, message: MessageRow, nouvelle: boolean): Promise<void> {
  try {
    const d = await getDemande(demandeId);
    if (!d) return;
    const p = await chargerPersonnes(d);
    const deClient = message.sender_id === d.client_id;

    if (deClient) {
      const ouverte = estOuverte(d.statut);
      await push(d.prestataire_id,
        nouvelle ? `Nouvelle demande de ${p.client.prenom}` : `Nouveau message de ${p.client.prenom}`,
        ouverte ? extrait(message.content, 100) : 'Ouvrez Ohevé pour voir la demande.',
        { type: 'demande', demandeId: d.id });

      if (!p.presta.notifications_email) return;
      if (!nouvelle && (!ouverte || await rafale(message))) return;

      const l = liens(d, d.prestataire_id);
      const ctx = {
        prestaPrenom: p.presta.prenom,
        ficheNom: p.presta.business_name,
        ficheUrl: l.ficheUrl,
        clientPrenom: p.client.prenom,
        dateDemande: d.created_at,
        demandeUrl: l.demandeUrl,
        unsubscribeUrl: l.unsubscribeUrl,
      };
      if (ouverte) {
        const coords = coordonneesClient(d, p);
        await envoyerEtTracer(message.id, {
          ...renderDemandeComplete({
            ...ctx,
            message: message.content,
            clientEmail: coords.email,
            clientPhone: coords.phone,
            numeroGratuit: d.statut === 'gratuite' ? d.numero_gratuit : null,
            freeLimit: demandesConfig.freeLimit,
            suite: !nouvelle,
          }),
          to: p.presta.email,
          replyTo: coords.email,
          recipientUserId: d.prestataire_id,
        });
      } else {
        const premier = await premierMessageClient(d);
        await envoyerEtTracer(message.id, {
          ...renderDemandeVerrouillee({ ...ctx, apercu: apercu(premier ?? message.content), freeLimit: demandesConfig.freeLimit }),
          to: p.presta.email,
          // Pas de Reply-To vers le client : ses coordonnées restent masquées.
          replyTo: null,
          recipientUserId: d.prestataire_id,
        });
      }
      return;
    }

    // Prestataire → client
    await push(d.client_id, `${p.presta.business_name} vous a répondu`, extrait(message.content, 100),
      { type: 'demande', demandeId: d.id });
    if (!p.client.notifications_email || await rafale(message)) return;
    const l = liens(d, d.client_id);
    await envoyerEtTracer(message.id, {
      ...renderReponseClient({
        clientPrenom: p.client.prenom,
        prestaNom: p.presta.business_name,
        ficheUrl: l.ficheUrl,
        message: message.content,
        conversationUrl: l.demandeUrl,
        unsubscribeUrl: l.unsubscribeUrl,
      }),
      to: p.client.email,
      // Le client répond sur Ohevé : pas d'adresse du prestataire en Reply-To.
      replyTo: null,
      recipientUserId: d.client_id,
    });
  } catch (err) {
    console.error('[demandes] notification:', (err as Error).message);
  }
}

/** Coordonnées transmises au prestataire : seulement avec le consentement du client. */
function coordonneesClient(d: DemandeRow, p: Personnes): { email: string | null; phone: string | null } {
  if (!d.consentement_contact) return { email: null, phone: null };
  return { email: p.client.email || null, phone: p.client.phone || null };
}

async function premierMessageClient(d: DemandeRow): Promise<string | null> {
  if (!d.conversation_id) return null;
  const r = await pool.query(
    `SELECT content FROM messages WHERE conversation_id=$1 AND sender_id=$2 ORDER BY created_at ASC, id ASC LIMIT 1`,
    [d.conversation_id, d.client_id],
  );
  return r.rows[0]?.content ?? null;
}

/** Après un déblocage payé : le prestataire reçoit la demande complète par e-mail. */
export async function notifierDeblocage(demandeId: number): Promise<void> {
  try {
    const d = await getDemande(demandeId);
    if (!d) return;
    const p = await chargerPersonnes(d);
    if (!p.presta.notifications_email) return;
    const l = liens(d, d.prestataire_id);
    const coords = coordonneesClient(d, p);
    const premier = await premierMessageClient(d);
    await envoyerEtTracer(null, {
      ...renderDemandeComplete({
        prestaPrenom: p.presta.prenom,
        ficheNom: p.presta.business_name,
        ficheUrl: l.ficheUrl,
        clientPrenom: p.client.prenom,
        dateDemande: d.created_at,
        demandeUrl: l.demandeUrl,
        unsubscribeUrl: l.unsubscribeUrl,
        message: premier ?? '',
        clientEmail: coords.email,
        clientPhone: coords.phone,
        numeroGratuit: null,
        freeLimit: demandesConfig.freeLimit,
        debloquee: true,
      }),
      to: p.presta.email,
      replyTo: coords.email,
      recipientUserId: d.prestataire_id,
    });
  } catch (err) {
    console.error('[demandes] notification déblocage:', (err as Error).message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecture (filtrée côté serveur)
// ─────────────────────────────────────────────────────────────────────────────

async function messagesDe(d: DemandeRow) {
  if (!d.conversation_id) return [];
  const r = await pool.query(
    `SELECT id, sender_id, content, file_url, file_name, file_type, created_at
     FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC, id ASC`,
    [d.conversation_id],
  );
  return r.rows.map((m) => ({
    id: m.id,
    auteur: m.sender_id === d.client_id ? 'client' : 'prestataire',
    contenu: m.content,
    file_url: m.file_url,
    file_name: m.file_name,
    file_type: m.file_type,
    created_at: m.created_at,
  }));
}

async function totalRecues(prestataireId: number): Promise<number> {
  return (await pool.query(
    `SELECT COUNT(*)::int AS n FROM demandes WHERE prestataire_id=$1 AND origine <> 'historique'`,
    [prestataireId],
  )).rows[0].n;
}

async function marquerLu(d: DemandeRow, lecteurId: number) {
  if (!d.conversation_id) return;
  await pool.query(
    `UPDATE messages SET is_read=true WHERE conversation_id=$1 AND sender_id<>$2 AND is_read=false`,
    [d.conversation_id, lecteurId],
  );
}

/**
 * Détail d'une demande pour la personne qui la regarde. Pour un prestataire
 * dont la demande est verrouillée, la réponse ne contient NI le message
 * complet NI les coordonnées du client : le flou de l'écran n'est qu'un décor,
 * la donnée n'a jamais quitté le serveur.
 */
export async function vueDemande(demandeId: number, userId: number) {
  let d = await getDemande(demandeId);
  if (!d || (d.client_id !== userId && d.prestataire_id !== userId)) {
    throw new DemandeError(404, 'Demande introuvable.');
  }

  if (d.prestataire_id === userId) {
    d = await demandeOuvertePourPresta(d);
    const p = await chargerPersonnes(d);
    const total = await totalRecues(d.prestataire_id);
    const presta = (await pool.query(
      `SELECT u.presta_sub_status, u.presta_sub_id, u.presta_current_period_end, u.demandes_gratuites_utilisees FROM users u WHERE id=$1`,
      [userId],
    )).rows[0];
    const base = {
      id: d.id,
      role: 'prestataire' as const,
      statut: d.statut,
      verrouillee: d.statut === 'verrouillee',
      created_at: d.created_at,
      debloquee_at: d.debloquee_at,
      numero_gratuit: d.numero_gratuit,
      free_limit: demandesConfig.freeLimit,
      gratuites_utilisees: presta?.demandes_gratuites_utilisees ?? 0,
      abonne: prestaAbonneActif(presta ?? {}),
      total_demandes_recues: total,
      fiche: { user_id: d.prestataire_id, business_name: p.presta.business_name },
      deblocage_unite_disponible: !!demandesConfig.stripePriceDeblocage,
    };
    if (d.statut === 'verrouillee') {
      const premier = await premierMessageClient(d);
      return {
        ...base,
        client: { prenom: p.client.prenom },
        apercu: apercu(premier ?? ''),
        messages: [],
        conversation_id: null,
      };
    }
    await marquerLu(d, userId);
    const coords = coordonneesClient(d, p);
    return {
      ...base,
      client: { prenom: p.client.prenom, nom: p.client.nom, email: coords.email, phone: coords.phone },
      consentement_contact: d.consentement_contact,
      apercu: null,
      messages: await messagesDe(d),
      conversation_id: d.conversation_id,
    };
  }

  // Côté client : sa conversation, jamais l'état commercial du prestataire.
  await marquerLu(d, userId);
  const messages = await messagesDe(d);
  const fiche = (await pool.query(
    `SELECT p.business_name, p.category, p.location_city, u.prenom, u.nom, u.avatar_url
     FROM users u LEFT JOIN prestataire_profiles p ON p.user_id=u.id WHERE u.id=$1`,
    [d.prestataire_id],
  )).rows[0] ?? {};
  const aRepondu = messages.some((m) => m.auteur === 'prestataire');
  return {
    id: d.id,
    role: 'client' as const,
    created_at: d.created_at,
    prestataire: {
      user_id: d.prestataire_id,
      business_name: fiche.business_name || `${fiche.prenom ?? ''} ${fiche.nom ?? ''}`.trim(),
      category: fiche.category ?? null,
      city: fiche.location_city ?? null,
      avatar_url: fiche.avatar_url ?? null,
    },
    messages,
    conversation_id: d.conversation_id,
    a_repondu: aRepondu,
    sans_reponse_48h: !aRepondu && Date.now() - new Date(d.created_at).getTime() > 48 * 3600 * 1000,
  };
}

/** Liste « Mes demandes » (prestataire ou client). */
export async function listeDemandes(userId: number) {
  await promouvoirSiAbonne(userId);
  const recues = await pool.query(
    `SELECT d.id, d.statut, d.created_at, d.numero_gratuit, d.origine, c.prenom AS client_prenom,
            fm.content AS premier_message,
            lm.content AS dernier_message, lm.created_at AS dernier_message_at, lm.sender_id AS dernier_auteur,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=d.conversation_id AND m.sender_id<>$1 AND m.is_read=false)::int AS non_lus
     FROM demandes d
     JOIN users c ON c.id = d.client_id
     LEFT JOIN LATERAL (SELECT content FROM messages WHERE conversation_id=d.conversation_id AND sender_id=d.client_id ORDER BY created_at ASC, id ASC LIMIT 1) fm ON true
     LEFT JOIN LATERAL (SELECT content, created_at, sender_id FROM messages WHERE conversation_id=d.conversation_id ORDER BY created_at DESC, id DESC LIMIT 1) lm ON true
     WHERE d.prestataire_id=$1
     ORDER BY COALESCE(lm.created_at, d.created_at) DESC`,
    [userId],
  );
  const envoyees = await pool.query(
    `SELECT d.id, d.created_at,
            COALESCE(NULLIF(TRIM(p.business_name),''), TRIM(u.prenom || ' ' || u.nom)) AS prestataire_nom,
            d.prestataire_id, p.category,
            lm.content AS dernier_message, lm.created_at AS dernier_message_at,
            EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id=d.conversation_id AND m.sender_id=d.prestataire_id) AS a_repondu,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=d.conversation_id AND m.sender_id<>$1 AND m.is_read=false)::int AS non_lus
     FROM demandes d
     JOIN users u ON u.id = d.prestataire_id
     LEFT JOIN prestataire_profiles p ON p.user_id = d.prestataire_id
     LEFT JOIN LATERAL (SELECT content, created_at FROM messages WHERE conversation_id=d.conversation_id ORDER BY created_at DESC, id DESC LIMIT 1) lm ON true
     WHERE d.client_id=$1
     ORDER BY COALESCE(lm.created_at, d.created_at) DESC`,
    [userId],
  );

  const presta = (await pool.query(
    `SELECT presta_sub_status, presta_sub_id, presta_current_period_end, demandes_gratuites_utilisees, role FROM users WHERE id=$1`,
    [userId],
  )).rows[0] ?? {};

  return {
    recues: recues.rows.map((r) => {
      const verrouillee = r.statut === 'verrouillee';
      return {
        id: r.id,
        statut: r.statut as DemandeStatut,
        verrouillee,
        created_at: r.created_at,
        numero_gratuit: r.numero_gratuit,
        client_prenom: r.client_prenom?.trim() || 'Un client',
        // Verrouillée : jamais plus que l'aperçu du 1er message.
        apercu: verrouillee ? apercu(r.premier_message ?? '') : extrait(r.dernier_message),
        dernier_message_at: r.dernier_message_at ?? r.created_at,
        a_repondre: !verrouillee && r.dernier_auteur !== userId,
        non_lus: verrouillee ? 0 : r.non_lus,
      };
    }),
    envoyees: envoyees.rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      prestataire_id: r.prestataire_id,
      prestataire_nom: r.prestataire_nom,
      category: r.category,
      dernier_message: r.dernier_message,
      dernier_message_at: r.dernier_message_at ?? r.created_at,
      a_repondu: r.a_repondu,
      sans_reponse_48h: !r.a_repondu && Date.now() - new Date(r.created_at).getTime() > 48 * 3600 * 1000,
      non_lus: r.non_lus,
    })),
    stats: presta.role === 'prestataire' ? {
      total_recues: recues.rows.filter((r) => r.origine !== 'historique').length,
      gratuites_utilisees: presta.demandes_gratuites_utilisees ?? 0,
      free_limit: demandesConfig.freeLimit,
      abonne: prestaAbonneActif(presta),
    } : null,
  };
}

/**
 * « Pas encore de réponse ? » : prestataires de la même catégorie (et ville si
 * renseignée), abonnés d'abord, puis ceux qui répondent vite. Le délai affiché
 * est calculé sur leurs vraies demandes des 90 derniers jours.
 */
export async function prestatairesSimilaires(demandeId: number, clientId: number) {
  const d = await getDemande(demandeId);
  if (!d || d.client_id !== clientId) throw new DemandeError(404, 'Demande introuvable.');
  const ref = (await pool.query(
    `SELECT category, location_city FROM prestataire_profiles WHERE user_id=$1`, [d.prestataire_id],
  )).rows[0];
  if (!ref?.category) return { titre_rapides: false, prestataires: [] };

  const r = await pool.query(
    `WITH delais AS (
       SELECT d.prestataire_id,
              AVG(EXTRACT(EPOCH FROM (fr.created_at - d.created_at)) / 3600.0) AS delai_h,
              COUNT(fr.created_at) AS nb_reponses
       FROM demandes d
       JOIN LATERAL (
         SELECT m.created_at FROM messages m
         WHERE m.conversation_id = d.conversation_id AND m.sender_id = d.prestataire_id
         ORDER BY m.created_at ASC LIMIT 1
       ) fr ON true
       WHERE d.created_at > NOW() - INTERVAL '90 days'
       GROUP BY d.prestataire_id
     )
     SELECT p.user_id, p.business_name, p.category, p.location_city, u.avatar_url,
            ${SQL_ABONNE_ACTIF} AS abonne,
            dl.delai_h, COALESCE(dl.nb_reponses, 0)::int AS nb_reponses,
            ph.url AS cover_url
     FROM prestataire_profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN delais dl ON dl.prestataire_id = p.user_id
     LEFT JOIN LATERAL (
       SELECT url FROM prestataire_photos
       WHERE prestataire_id = p.id AND COALESCE(media_type,'image')='image'
       ORDER BY is_cover DESC, created_at ASC LIMIT 1
     ) ph ON true
     WHERE p.category = $1
       AND p.user_id <> $2
       AND u.is_active = true AND u.role = 'prestataire'
       AND COALESCE(p.is_hidden,false) = false AND COALESCE(p.is_suspended,false) = false
       AND NOT EXISTS (SELECT 1 FROM demandes x WHERE x.client_id = $3 AND x.prestataire_id = p.user_id)
       AND ($4::text IS NULL OR p.location_city ILIKE $4)
     ORDER BY ${SQL_ABONNE_ACTIF} DESC,
              (dl.delai_h IS NOT NULL AND dl.delai_h <= 24) DESC,
              dl.delai_h ASC NULLS LAST,
              p.rating DESC NULLS LAST
     LIMIT 4`,
    [ref.category, d.prestataire_id, clientId, ref.location_city ? `%${ref.location_city.trim()}%` : null],
  );
  const prestataires = r.rows.map((x) => ({
    user_id: x.user_id,
    business_name: x.business_name,
    category: x.category,
    city: x.location_city,
    avatar_url: x.avatar_url,
    cover_url: x.cover_url,
    abonne: x.abonne,
    repond_vite: x.delai_h !== null && Number(x.delai_h) <= 24 && x.nb_reponses > 0,
  }));
  return { titre_rapides: prestataires.length > 0 && prestataires.some((x) => x.repond_vite), prestataires };
}

// ─────────────────────────────────────────────────────────────────────────────
// Déblocage payé (appelé par le webhook Stripe uniquement)
// ─────────────────────────────────────────────────────────────────────────────

export async function enregistrerDeblocage(opts: {
  sessionId: string;
  demandeId: number;
  prestataireId: number;
  amountTotal: number | null;
  currency: string | null;
}): Promise<'debloquee' | 'deja_traitee' | 'deja_ouverte' | 'introuvable'> {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const ins = await db.query(
      `INSERT INTO demande_deblocages (stripe_session_id, demande_id, prestataire_id, amount_total, currency)
       SELECT $1, d.id, d.prestataire_id, $4, $5 FROM demandes d WHERE d.id=$2 AND d.prestataire_id=$3
       ON CONFLICT (stripe_session_id) DO NOTHING
       RETURNING demande_id`,
      [opts.sessionId, opts.demandeId, opts.prestataireId, opts.amountTotal, opts.currency],
    );
    if (!ins.rowCount) {
      await db.query('COMMIT');
      const exists = await getDemande(opts.demandeId);
      return exists ? 'deja_traitee' : 'introuvable';
    }
    const upd = await db.query(
      `UPDATE demandes SET statut='debloquee', debloquee_at=NOW()
       WHERE id=$1 AND prestataire_id=$2 AND statut='verrouillee' RETURNING id`,
      [opts.demandeId, opts.prestataireId],
    );
    await db.query('COMMIT');
    return upd.rowCount ? 'debloquee' : 'deja_ouverte';
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    db.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Préférences e-mail
// ─────────────────────────────────────────────────────────────────────────────

export async function desactiverEmails(userId: number): Promise<boolean> {
  const r = await pool.query(`UPDATE users SET notifications_email=false WHERE id=$1`, [userId]);
  return !!r.rowCount;
}

