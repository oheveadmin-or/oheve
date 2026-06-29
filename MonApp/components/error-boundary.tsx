import { Component, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/OheveTheme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: string | null;
}

/**
 * Capture les erreurs JS de rendu pour éviter que l'app ne se ferme brutalement
 * (« ça me sort de l'appli »). Affiche le message d'erreur à l'écran : indispensable
 * en build TestFlight/production où il n'y a ni redbox ni console visible.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Visible dans les logs de device (Xcode / Console.app) et conservé à l'écran.
    console.error('[ErrorBoundary]', error?.message, info?.componentStack);
    this.setState({ info: info?.componentStack ?? null });
  }

  reset = () => this.setState({ hasError: false, error: null, info: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.subtitle}>
            Fais une capture de cet écran et envoie-la pour qu'on corrige le problème.
          </Text>

          <View style={styles.box}>
            <Text style={styles.boxLabel}>Erreur</Text>
            <Text selectable style={styles.errText}>
              {error?.name ? `${error.name}: ` : ''}{error?.message ?? 'Erreur inconnue'}
            </Text>
          </View>

          {!!error?.stack && (
            <View style={styles.box}>
              <Text style={styles.boxLabel}>Stack</Text>
              <Text selectable style={styles.stackText}>{error.stack}</Text>
            </View>
          )}

          {!!info && (
            <View style={styles.box}>
              <Text style={styles.boxLabel}>Composant</Text>
              <Text selectable style={styles.stackText}>{info}</Text>
            </View>
          )}

          <Pressable style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>Réessayer</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  content: { padding: 24, paddingTop: 80, gap: 14 },
  title: { fontSize: 22, fontWeight: '800', color: C.textDark },
  subtitle: { fontSize: 14, color: C.textMid, marginBottom: 8 },
  box: { backgroundColor: C.card, borderRadius: 12, padding: 14 },
  boxLabel: { fontSize: 11, fontWeight: '700', color: C.sauge, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  errText: { fontSize: 14, color: '#B3261E', fontWeight: '600' },
  stackText: { fontSize: 11, color: C.textMid, fontFamily: 'Courier' },
  btn: { backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
