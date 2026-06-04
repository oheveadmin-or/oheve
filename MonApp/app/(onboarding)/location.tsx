import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { apiService } from '@/services/api';
import { GeoResult, searchCity } from '@/services/geo';

type Mode = 'city' | 'address' | 'unknown';

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LocationScreen() {
  const { user, updateUser } = useAuth();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isEditFromDashboard = from === 'dashboard';

  const nextRoute = () => {
    if (isEditFromDashboard) router.replace('/(app)/(tabs)');
    else router.replace({
      pathname: '/(onboarding)/confirmation',
      params: {
        budget: String(user?.budget_total ?? ''),
        date_iso: user?.date_mariage ?? '',
      },
    });
  };
  const [mode, setMode] = useState<Mode>('city');
  const [q, setQ] = useState('');
  const [address, setAddress] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dq = useDebouncedValue(q, 350);
  const email = user?.email;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (mode !== 'city') return;
      if (!dq || dq.trim().length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await searchCity(dq);
        if (!cancelled) setResults(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [dq, mode]);

  if (!email) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Session expirée. Veuillez vous reconnecter.</ThemedText>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)')}>
          <ThemedText style={styles.buttonText}>Retour</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  async function saveUnknown() {
    setSaving(true);
    try {
      await apiService.mettreAJourWeddingLocation({
        email: email ?? '',
        wedding_location_type: 'unknown',
      });
      await updateUser({
        wedding_location_type: 'unknown',
        wedding_city: undefined,
        wedding_address: undefined,
      });
      nextRoute();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveCity(item: GeoResult) {
    setSaving(true);
    try {
      await apiService.mettreAJourWeddingLocation({
        email: email ?? '',
        wedding_location_type: 'city',
        wedding_city: item.city ?? item.displayName,
        wedding_country: item.country ?? undefined,
        wedding_lat: item.lat,
        wedding_lng: item.lon,
      });
      await updateUser({
        wedding_location_type: 'city',
        wedding_city: item.city ?? item.displayName,
        wedding_country: item.country,
        wedding_address: undefined,
      });
      nextRoute();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveAddress() {
    if (!address.trim()) return;
    setSaving(true);
    try {
      await apiService.mettreAJourWeddingLocation({
        email: email ?? '',
        wedding_location_type: 'address',
        wedding_address: address.trim(),
      });
      await updateUser({
        wedding_location_type: 'address',
        wedding_address: address.trim(),
        wedding_city: undefined,
      });
      nextRoute();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.retourBtn}
          onPress={() => (isEditFromDashboard ? router.replace('/(app)/(tabs)') : router.replace('/(onboarding)/budget'))}
        >
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
          <ThemedText style={styles.retourText}>Retour</ThemedText>
        </Pressable>
      </View>

      <ThemedText style={styles.title}>Lieu du mariage</ThemedText>
      <ThemedText style={styles.subtitle}>
        Choisis une ville (recommandé), une adresse, ou continue sans décider.
      </ThemedText>

      <View style={styles.modeRow}>
        {(['city', 'address', 'unknown'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.modeBtn, mode === m && styles.modeBtnSelected]}
          >
            <ThemedText style={[styles.modeText, mode === m && styles.modeTextSelected]}>
              {m === 'city' ? 'Ville' : m === 'address' ? 'Adresse' : 'Je ne sais pas'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {mode === 'city' && (
        <View style={styles.section}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Ex: Paris, Jérusalem, Marseille…"
            placeholderTextColor="#A09890"
            style={styles.input}
          />

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#6366f1" />
            </View>
          )}

          <FlatList
            data={results}
            keyExtractor={(it, idx) => it.displayName + idx}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => saveCity(item)}
                disabled={saving}
                style={styles.resultCard}
              >
                <ThemedText style={styles.resultCity}>{item.city ?? 'Ville'}</ThemedText>
                <ThemedText style={styles.resultDetail} numberOfLines={2}>
                  {item.displayName}
                </ThemedText>
              </Pressable>
            )}
            style={styles.flatList}
            ListFooterComponent={
              <Pressable onPress={saveUnknown} disabled={saving} style={styles.skipBtn}>
                <ThemedText style={styles.skipText}>Continuer sans choisir</ThemedText>
              </Pressable>
            }
          />
        </View>
      )}

      {mode === 'address' && (
        <View style={styles.section}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Adresse complète (ex: 2 Rue Scribe, 75009 Paris)"
            placeholderTextColor="#A09890"
            style={styles.input}
          />

          <Pressable
            onPress={saveAddress}
            disabled={saving || !address.trim()}
            style={[styles.primaryBtn, (saving || !address.trim()) && styles.primaryBtnDisabled]}
          >
            <ThemedText style={styles.primaryBtnText}>
              {saving ? 'Enregistrement…' : 'Continuer'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={saveUnknown} disabled={saving} style={styles.skipBtn}>
            <ThemedText style={styles.skipText}>Je ne sais pas encore</ThemedText>
          </Pressable>
        </View>
      )}

      {mode === 'unknown' && (
        <View style={styles.section}>
          <ThemedText style={styles.unknownText}>
            Aucun souci. Tu pourras choisir plus tard dans les paramètres.
          </ThemedText>

          <Pressable
            onPress={saveUnknown}
            disabled={saving}
            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
          >
            <ThemedText style={styles.primaryBtnText}>
              {saving ? 'Enregistrement…' : 'Continuer'}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { marginBottom: 16 },
  retourBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retourText: { color: '#6366f1', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, opacity: 0.8, marginBottom: 20 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modeBtnSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  modeText: { fontSize: 14, fontWeight: '600' },
  modeTextSelected: { color: '#6366f1' },
  section: { flex: 1, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  loadingRow: { padding: 16, alignItems: 'center' },
  flatList: { flex: 1 },
  resultCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    marginBottom: 10,
  },
  resultCity: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  resultDetail: { fontSize: 14, opacity: 0.8 },
  skipBtn: { padding: 14, alignItems: 'center' },
  skipText: { color: '#6366f1', fontSize: 14, textDecorationLine: 'underline' },
  primaryBtn: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  unknownText: { fontSize: 15, opacity: 0.8, marginBottom: 16 },
  button: { marginTop: 16, padding: 16, backgroundColor: '#6366f1', borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
