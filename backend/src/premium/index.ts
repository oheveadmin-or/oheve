import Stripe from 'stripe';
import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-05-27.dahlia' as any });

export const premiumRoutes = Router();

const PREMIUM_PRICE_CENTS = 5000; // 50€

// POST /api/premium/purchase — crée un PaymentIntent Stripe pour Oheve Premium
premiumRoutes.post('/purchase', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;

    // Vérifier si déjà premium
    const existing = await pool.query(`SELECT premium FROM users WHERE id=$1`, [userId]);
    if (existing.rows[0]?.premium) {
      return res.json({ success: true, data: { already_premium: true } });
    }

    const userRes = await pool.query(`SELECT email, nom, prenom FROM users WHERE id=$1`, [userId]);
    const u = userRes.rows[0];

    const intent = await stripe.paymentIntents.create({
      amount: PREMIUM_PRICE_CENTS,
      currency: 'eur',
      description: 'Oheve Premium — Accès complet paiement unique',
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: String(userId),
        product: 'oheve_premium',
        user_email: u?.email ?? '',
      },
    });

    return res.json({
      success: true,
      data: {
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
        amount_cents: PREMIUM_PRICE_CENTS,
        currency: 'eur',
        // Clé publique Stripe (pk_…) : filet de sécurité pour l'app Android si
        // EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY n'a pas été injectée au build.
        // Elle doit être du même mode (test/live) que STRIPE_SECRET_KEY.
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
      },
    });
  } catch (err: any) {
    console.error('premium/purchase error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Android : paiement sur la page Stripe Checkout (navigateur) ─────────────
// Le SDK Stripe natif (champ carte) fermait l'app Android à l'ouverture de
// l'écran de paiement. Sur Android, on ouvre donc la page de paiement hébergée
// par Stripe dans le navigateur : aucun code Stripe natif ne tourne dans l'app.

// POST /api/premium/checkout — crée la session Stripe Checkout
premiumRoutes.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;

    const existing = await pool.query(`SELECT premium, email FROM users WHERE id=$1`, [userId]);
    if (existing.rows[0]?.premium) {
      return res.json({ success: true, data: { already_premium: true } });
    }
    const email: string = existing.rows[0]?.email ?? '';

    // Page de retour servie par ce serveur (Stripe n'accepte que des URL https),
    // qui renvoie ensuite vers l'app.
    const returnUrl = `https://${req.get('host')}/api/premium/checkout/return`;
    const metadata = { user_id: String(userId), product: 'oheve_premium', user_email: email };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: PREMIUM_PRICE_CENTS,
          product_data: { name: 'Oheve Premium', description: 'Accès complet — paiement unique' },
        },
      }],
      customer_email: email || undefined,
      client_reference_id: String(userId),
      metadata,
      // Mêmes métadonnées sur le PaymentIntent : le webhook et la réparation
      // automatique (reconcilePremiumFromStripe) le reconnaissent comme avant.
      payment_intent_data: { description: 'Oheve Premium — Accès complet paiement unique', metadata },
      success_url: `${returnUrl}?status=success`,
      cancel_url: `${returnUrl}?status=cancel`,
    });

    return res.json({ success: true, data: { url: session.url, session_id: session.id } });
  } catch (err: any) {
    console.error('premium/checkout error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/premium/checkout/return — fin du paiement : retour dans l'app
premiumRoutes.get('/checkout/return', (req: Request, res: Response) => {
  const status = req.query.status === 'success' ? 'success' : 'cancel';
  const appUrl = `monapp://premium-checkout?status=${status}`;
  const message = status === 'success'
    ? 'Paiement reçu ✅ Vous pouvez revenir dans l\'app Oheve.'
    : 'Paiement annulé. Vous pouvez revenir dans l\'app Oheve.';
  res.set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=${appUrl}">
<title>Oheve</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px 24px;background:#F6F2EA;color:#3D3A35">
<p style="font-size:18px">${message}</p>
<p><a href="${appUrl}" style="display:inline-block;margin-top:16px;padding:14px 24px;border-radius:14px;background:#8F947F;color:#fff;text-decoration:none;font-weight:700">Retour à l'app</a></p>
</body></html>`);
});

// POST /api/premium/checkout/confirm — vérifie la session Checkout auprès de
// Stripe et active le premium (sans attendre le webhook).
premiumRoutes.post('/checkout/confirm', requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const sessionId = String((req.body as { session_id?: string })?.session_id ?? '').trim();
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'session_id requis' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.product !== 'oheve_premium') {
      return res.status(400).json({ success: false, message: 'Paiement non lié à Oheve Premium.' });
    }
    if (String(session.metadata?.user_id ?? '') !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Ce paiement ne vous appartient pas.' });
    }
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ success: false, message: 'Paiement non confirmé.' });
    }

    const piId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    await pool.query(
      `UPDATE users SET
         premium = true,
         premium_purchased_at = COALESCE(premium_purchased_at, NOW()),
         premium_stripe_payment_intent_id = COALESCE($1, premium_stripe_payment_intent_id)
       WHERE id = $2`,
      [piId, userId]
    );

    return res.json({ success: true, data: { premium: true } });
  } catch (err: any) {
    console.error('premium/checkout/confirm error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/premium/confirm — active le premium immédiatement après un paiement
// réussi, sans attendre le webhook Stripe (qui peut ne jamais arriver si mal
// configuré sur Railway → le site publié restait bloqué « activer Premium »
// alors que le client avait payé). On vérifie le PaymentIntent auprès de Stripe
// (source de vérité) : il doit être `succeeded`, appartenir à cet utilisateur et
// concerner le produit premium. Le webhook reste un filet de sécurité.
premiumRoutes.post('/confirm', requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const paymentIntentId = String((req.body as { payment_intent_id?: string })?.payment_intent_id ?? '').trim();

  if (!paymentIntentId) {
    return res.status(400).json({ success: false, message: 'payment_intent_id requis' });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      return res.status(402).json({ success: false, message: 'Paiement non confirmé.' });
    }
    if (pi.metadata?.product !== 'oheve_premium') {
      return res.status(400).json({ success: false, message: 'Paiement non lié à Oheve Premium.' });
    }
    if (String(pi.metadata?.user_id ?? '') !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Ce paiement ne vous appartient pas.' });
    }

    await pool.query(
      `UPDATE users SET
         premium = true,
         premium_purchased_at = COALESCE(premium_purchased_at, NOW()),
         premium_stripe_payment_intent_id = $1
       WHERE id = $2`,
      [pi.id, userId]
    );

    return res.json({ success: true, data: { premium: true } });
  } catch (err: any) {
    console.error('premium/confirm error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/premium/activate — réservé à l'admin. Le webhook Stripe active le
// premium directement (payments/controller). Cette route était ouverte sans
// auth : n'importe qui pouvait s'activer Premium gratuitement.
premiumRoutes.post('/activate/:userId', requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { payment_intent_id } = req.body;

  try {
    await pool.query(
      `UPDATE users SET
         premium = true,
         premium_purchased_at = NOW(),
         premium_stripe_payment_intent_id = $1
       WHERE id = $2`,
      [payment_intent_id ?? null, userId]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** Filet de secours : si la BDD ne connaît pas le premium mais que le client a
 *  bel et bien payé (webhook Stripe jamais reçu), on demande à Stripe s'il
 *  existe un paiement premium `succeeded` pour cet utilisateur et on répare la
 *  BDD. Rend le premium auto-réparant à la prochaine ouverture de l'app OU à la
 *  1re visite du site publié.
 *
 *  On cherche par `user_id` PUIS par email du compte : avec la liaison
 *  multi-méthodes (Apple/Google/e-mail), le site peut avoir été créé sous un id
 *  et le paiement rattaché à un autre id partageant le MÊME e-mail. Sans la
 *  recherche par e-mail, le premium restait bloqué sur le compte propriétaire. */
export async function reconcilePremiumFromStripe(userId: number): Promise<boolean> {
  try {
    // Email du compte propriétaire, pour la recherche de secours.
    const uRes = await pool.query(`SELECT email FROM users WHERE id=$1`, [userId]);
    const email = String(uRes.rows[0]?.email ?? '').trim().toLowerCase();

    const escape = (v: string) => v.replace(/['\\]/g, '\\$&');
    const queries = [
      `status:'succeeded' AND metadata['product']:'oheve_premium' AND metadata['user_id']:'${escape(String(userId))}'`,
    ];
    if (email) {
      queries.push(
        `status:'succeeded' AND metadata['product']:'oheve_premium' AND metadata['user_email']:'${escape(email)}'`
      );
    }

    let pi: Awaited<ReturnType<typeof stripe.paymentIntents.search>>['data'][number] | undefined;
    for (const query of queries) {
      const search = await stripe.paymentIntents.search({ query, limit: 1 });
      if (search.data[0]) { pi = search.data[0]; break; }
    }
    if (!pi) return false;

    await pool.query(
      `UPDATE users SET
         premium = true,
         premium_purchased_at = COALESCE(premium_purchased_at, NOW()),
         premium_stripe_payment_intent_id = COALESCE(premium_stripe_payment_intent_id, $1)
       WHERE id = $2`,
      [pi.id, userId]
    );
    return true;
  } catch (err: any) {
    console.error('reconcilePremiumFromStripe error:', err.message);
    return false;
  }
}

// GET /api/premium/status — vérifie le statut premium de l'utilisateur connecté
premiumRoutes.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;
    let r = await pool.query(
      `SELECT premium, premium_purchased_at FROM users WHERE id=$1`,
      [userId]
    );
    // Non premium en BDD → tenter la réparation depuis Stripe (webhook manqué).
    if (!r.rows[0]?.premium && await reconcilePremiumFromStripe(userId)) {
      r = await pool.query(
        `SELECT premium, premium_purchased_at FROM users WHERE id=$1`,
        [userId]
      );
    }
    const row = r.rows[0];
    return res.json({
      success: true,
      data: {
        premium: row?.premium ?? false,
        purchased_at: row?.premium_purchased_at ?? null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
