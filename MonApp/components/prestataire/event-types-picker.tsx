import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EVENT_TYPES, eventConfig, type EventType } from '@/lib/event-type';

/**
 * Choix des événements couverts par un prestataire (mariage, Bar Mitsva,
 * Bat Mitsva, Brit Mila). Un compte client ne voit dans le répertoire et les
 * reels que les prestataires qui font SON événement.
 */
export function EventTypesPicker({
  value,
  onChange,
}: {
  value: EventType[];
  onChange: (next: EventType[]) => void;
}) {
  const toggle = (t: EventType) => {
    const on = value.includes(t);
    // Au moins un événement : on ne décoche pas le dernier.
    if (on && value.length === 1) return;
    onChange(on ? value.filter((v) => v !== t) : EVENT_TYPES.filter((v) => v === t || value.includes(v)));
  };

  return (
    <View style={styles.wrap}>
      {EVENT_TYPES.map((t) => {
        const cfg = eventConfig(t);
        const on = value.includes(t);
        return (
          <Pressable
            key={t}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => toggle(t)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            <ThemedText style={styles.emoji}>{cfg.emoji}</ThemedText>
            <ThemedText style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{cfg.label}</ThemedText>
            <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={on ? '#929B83' : '#c9c7bf'} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Valeur serveur → valeur du sélecteur (fiche sans choix = visible partout = tout coché). */
export function eventTypesFromServer(v?: string[] | null): EventType[] {
  const list = EVENT_TYPES.filter((t) => (v ?? []).includes(t));
  return list.length ? list : [...EVENT_TYPES];
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '48%', flexGrow: 1,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#ece8e0', backgroundColor: '#fff',
  },
  chipOn: { borderColor: '#929B83', backgroundColor: '#f5f2ed' },
  emoji: { fontSize: 18 },
  label: { flex: 1, fontSize: 14, fontWeight: '600', color: '#5c5f57' },
  labelOn: { color: '#343630' },
});
