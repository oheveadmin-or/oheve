import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { C, RADIUS } from '@/constants/OheveTheme';
import { ThemedText } from './themed-text';

/**
 * Bloc légal obligatoire sur TOUT écran qui vend quelque chose (Apple
 * Guideline 3.1.2(c)). Apple exige que ces informations soient visibles
 * DANS l'app, sur l'écran d'achat lui-même :
 *
 *   1. le titre de l'offre (identique au nom du produit App Store) ;
 *   2. sa durée (1 mois / achat unique) ;
 *   3. son prix (et le prix par période) ;
 *   4. des liens FONCTIONNELS vers les Conditions d'utilisation (EULA) et
 *      la politique de confidentialité.
 *
 * Les liens ouvrent les écrans internes `/(app)/cgu` et
 * `/(app)/privacy-policy` : contrairement à un lien web, ils ne peuvent pas
 * échouer (pas de navigateur, pas de réseau, pas de redirection) — c'est ce
 * que le reviewer doit pouvoir taper devant lui.
 */

type LegalLinksProps = {
  /** Appelé avant la navigation — sert à fermer une modale ouverte. */
  onNavigate?: () => void;
  /** Version compacte (dans une bottom-sheet). */
  compact?: boolean;
};

export function LegalLinks({ onNavigate, compact }: LegalLinksProps) {
  const go = (path: string) => {
    onNavigate?.();
    // Laisse la modale se fermer avant de pousser l'écran.
    setTimeout(() => router.push(path as never), onNavigate ? 250 : 0);
  };

  return (
    <View style={s.links}>
      <Pressable hitSlop={10} onPress={() => go('/(app)/cgu')}>
        <ThemedText style={[s.link, compact && s.linkCompact]}>
          Conditions d&apos;utilisation (EULA)
        </ThemedText>
      </Pressable>
      <ThemedText style={s.dot}>·</ThemedText>
      <Pressable hitSlop={10} onPress={() => go('/(app)/privacy-policy')}>
        <ThemedText style={[s.link, compact && s.linkCompact]}>
          Politique de confidentialité
        </ThemedText>
      </Pressable>
    </View>
  );
}

type PurchaseLegalProps = {
  /** Nom exact de l'offre, tel qu'il apparaît dans l'App Store. */
  productTitle: string;
  /** Durée lisible : « 1 mois, renouvelé automatiquement », « Achat unique ». */
  duration: string;
  /** Prix affiché, prix réel Apple quand StoreKit l'a renvoyé. */
  price: string;
  /** Abonnement auto-renouvelable → ajoute la mention de renouvellement Apple. */
  autoRenewing?: boolean;
  /** Mention supplémentaire (essai gratuit, contenu de l'offre…). */
  extra?: string;
  onNavigate?: () => void;
};

export function PurchaseLegal({
  productTitle, duration, price, autoRenewing, extra, onNavigate,
}: PurchaseLegalProps) {
  return (
    <View style={s.box}>
      <ThemedText style={s.boxTitle}>DÉTAIL DE L&apos;OFFRE</ThemedText>

      <Row label="Offre" value={productTitle} />
      <Row label="Durée" value={duration} />
      <Row label="Prix" value={price} />

      {extra ? <ThemedText style={s.note}>{extra}</ThemedText> : null}

      {autoRenewing ? (
        <ThemedText style={s.note}>
          {Platform.OS === 'ios'
            ? 'Le paiement est débité sur votre compte Apple à la confirmation de l\'achat. L\'abonnement se renouvelle automatiquement au même tarif sauf résiliation au moins 24 h avant la fin de la période en cours. Gérez ou résiliez votre abonnement dans Réglages → votre nom → Abonnements.'
            : 'L\'abonnement se renouvelle automatiquement au même tarif à chaque échéance, sauf résiliation avant la fin de la période en cours. Résiliation possible à tout moment depuis « Mon abonnement ».'}
        </ThemedText>
      ) : null}

      <LegalLinks onNavigate={onNavigate} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <ThemedText style={s.rowLabel}>{label}</ThemedText>
      <ThemedText style={s.rowValue}>{value}</ThemedText>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    backgroundColor: C.card, padding: 16, gap: 8, marginTop: 4,
  },
  boxTitle: { fontSize: 11, fontWeight: '800', color: C.textLight, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowLabel: { fontSize: 13, color: C.textLight, width: 58 },
  rowValue: { flex: 1, fontSize: 13, color: C.textDark, fontWeight: '600' },
  note: { fontSize: 11.5, color: C.textLight, lineHeight: 17, marginTop: 2 },
  links: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, flexWrap: 'wrap', marginTop: 6,
  },
  link: { fontSize: 12.5, color: C.sauge, fontWeight: '700', textDecorationLine: 'underline' },
  linkCompact: { fontSize: 11.5 },
  dot: { fontSize: 12, color: C.textLight },
});
