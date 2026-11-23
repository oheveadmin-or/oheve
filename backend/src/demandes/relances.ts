import { pool } from '../config/database';
import { demandesConfig } from './config';
import { renderRelance } from './emails/relance';
import { sendDemandeEmail, unsubscribeLinks } from './mailer';
import { SQL_ABONNE_ACTIF } from './service';
import { signDemandeLink } from './tokens';
import { sqlVisibleEmail } from '../auth/username';

/**
 * Relances des demandes VERROUILLÉES non débloquées :
 *  - après 24 h : « [Prénom] attend toujours votre réponse » (une seule fois) ;
 *  - après 72 h : « Dernier rappel : la demande de [Prénom] » (une seule fois).
 * Jamais si le prestataire a désactivé les e-mails.
 *
 * Chaque relance est « réservée » par un UPDATE … WHERE drapeau=false
 * RETURNING : même avec plusieurs instances du serveur, un e-mail ne part
 * qu'une fois.
 */
export async function envoyerRelances(): Promise<{ r24: number; r72: number }> {
  // Un abonné ne doit pas recevoir de relance : ses demandes sont ouvertes.
  await pool.query(
    `UPDATE demandes d SET statut='abonnement' FROM users u
     WHERE u.id=d.prestataire_id AND d.statut='verrouillee' AND ${SQL_ABONNE_ACTIF}`,
  );

  let r72 = 0;
  let r24 = 0;

  // 72 h d'abord : une demande déjà vieille de 72 h (serveur arrêté, etc.)
  // ne reçoit que le dernier rappel, pas les deux d'affilée.
  const due72 = await pool.query(
    `UPDATE demandes d SET relance_72h_envoyee=true, relance_24h_envoyee=true
     FROM users u
     WHERE u.id=d.prestataire_id AND d.statut='verrouillee' AND d.debloquee_at IS NULL
       AND d.relance_72h_envoyee=false AND d.created_at <= NOW() - INTERVAL '72 hours'
       AND u.notifications_email=true
     RETURNING d.id`,
  );
  for (const row of due72.rows) if (await envoyer(row.id, '72h')) r72++;

  const due24 = await pool.query(
    `UPDATE demandes d SET relance_24h_envoyee=true
     FROM users u
     WHERE u.id=d.prestataire_id AND d.statut='verrouillee' AND d.debloquee_at IS NULL
       AND d.relance_24h_envoyee=false AND d.created_at <= NOW() - INTERVAL '24 hours'
       AND u.notifications_email=true
     RETURNING d.id`,
  );
  for (const row of due24.rows) if (await envoyer(row.id, '24h')) r24++;

  return { r24, r72 };
}

async function envoyer(demandeId: number, etape: '24h' | '72h'): Promise<boolean> {
  try {
    const hasImport = !!(await pool.query(`SELECT to_regclass('public.admin_presta_import') AS t`)).rows[0]?.t;
    const r = (await pool.query(
      `SELECT d.id, d.prestataire_id, d.created_at,
              COALESCE(NULLIF(TRIM(c.prenom),''), 'Un client') AS client_prenom,
              COALESCE(NULLIF(TRIM(p.business_name),''), TRIM(u.prenom || ' ' || u.nom)) AS business_name,
              NULLIF(TRIM(u.prenom),'') AS presta_prenom,
              COALESCE(${sqlVisibleEmail('u.email')}, ${hasImport ? `NULLIF(TRIM(api.contact_email),'')` : 'NULL'},
                       ${sqlVisibleEmail('ow.email')}) AS email
       FROM demandes d
       JOIN users u ON u.id=d.prestataire_id
       JOIN users c ON c.id=d.client_id
       LEFT JOIN prestataire_profiles p ON p.user_id=d.prestataire_id
       LEFT JOIN users ow ON ow.id=u.presta_owner_id
       ${hasImport ? 'LEFT JOIN admin_presta_import api ON api.user_id=u.id' : ''}
       WHERE d.id=$1`,
      [demandeId],
    )).rows[0];
    if (!r?.email) return false;
    const { siteUrl } = demandesConfig;
    const mail = renderRelance({
      etape,
      prestaPrenom: r.presta_prenom || r.business_name,
      ficheNom: r.business_name,
      ficheUrl: `${siteUrl}/prestataire/${r.prestataire_id}`,
      clientPrenom: r.client_prenom,
      dateDemande: r.created_at,
      demandeUrl: `${siteUrl}/demande/${r.id}?t=${encodeURIComponent(signDemandeLink(r.prestataire_id, r.id))}`,
      unsubscribeUrl: unsubscribeLinks(r.prestataire_id).page,
    });
    const res = await sendDemandeEmail({ ...mail, to: r.email, recipientUserId: r.prestataire_id });
    if (!res.ok) console.warn(`[demandes] relance ${etape} demande ${demandeId} non envoyée : ${res.error}`);
    return res.ok;
  } catch (err) {
    console.error(`[demandes] relance ${etape} demande ${demandeId}:`, (err as Error).message);
    return false;
  }
}

let timer: NodeJS.Timeout | null = null;

/** Tâche planifiée : toutes les heures (1er passage 2 min après le démarrage). */
export function startRelancesScheduler(): void {
  if (timer) return;
  const run = () => {
    envoyerRelances()
      .then(({ r24, r72 }) => { if (r24 || r72) console.log(`📨 Relances demandes : ${r24} à 24 h, ${r72} à 72 h`); })
      .catch((err) => console.error('[demandes] relances:', (err as Error).message));
  };
  setTimeout(run, 2 * 60 * 1000);
  timer = setInterval(run, 60 * 60 * 1000);
}
