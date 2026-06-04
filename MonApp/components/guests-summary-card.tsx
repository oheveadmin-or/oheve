import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type GuestsSummaryCardProps = {
  confirmedCount: number;
  totalCount: number;
  onPress?: () => void;
};

export function GuestsSummaryCard({
  confirmedCount,
  totalCount,
  onPress,
}: GuestsSummaryCardProps) {
  const safeTotal = Math.max(0, totalCount);
  const safeConfirmed = Math.max(0, Math.min(confirmedCount, safeTotal || confirmedCount));

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="people-outline" size={14} color="#A7AD9A" />
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={1}>
          Invités
        </ThemedText>
        <ThemedText style={styles.count} numberOfLines={1}>
          {safeTotal} invités
        </ThemedText>
        <ThemedText style={styles.hint} numberOfLines={1}>
          {safeConfirmed} confirmés
        </ThemedText>
      </View>

      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#ECECF1',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  cardPressed: { opacity: 0.92 },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8EDE4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: 11, lineHeight: 14, color: '#707084', fontWeight: '600', marginBottom: 1 },
  count: { fontSize: 14, lineHeight: 18, color: '#2f3140', fontWeight: '800' },
  hint: { fontSize: 10, lineHeight: 13, color: '#6b7280', fontWeight: '500' },
  chevronWrap: { width: 20, alignItems: 'flex-end' },
});
