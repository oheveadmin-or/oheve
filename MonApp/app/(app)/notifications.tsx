import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { calendarApi, type CalendarEvent } from '@/services/auth/api';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.accessToken) { setLoading(false); return; }
    calendarApi.getUpcoming(user.accessToken)
      .then((res) => {
        if (res?.success && res.data) setUpcoming(res.data.upcoming ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.accessToken]);

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={C.sauge} />
        </Pressable>
        <ThemedText style={s.title}>Notifications</ThemedText>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {upcoming.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={32} color={C.sauge} />
            </View>
            <ThemedText style={s.emptyTitle}>
              {loading ? 'Chargement…' : 'Aucune notification'}
            </ThemedText>
            {!loading && (
              <ThemedText style={s.emptySub}>
                Vos rappels de rendez-vous et les nouveautés de votre mariage apparaîtront ici.
              </ThemedText>
            )}
          </View>
        ) : (
          <>
            <ThemedText style={s.sectionLabel}>Rendez-vous à venir</ThemedText>
            {upcoming.map((appt) => (
              <Pressable
                key={appt.id}
                style={s.card}
                onPress={() => router.push('/(app)/(tabs)/calendar' as never)}
              >
                <View style={s.cardIcon}>
                  <Ionicons name="calendar-outline" size={18} color={C.saugeDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.cardTitle}>{appt.title}</ThemedText>
                  <ThemedText style={s.cardSub}>
                    {appt.event_date
                      ? new Date(`${String(appt.event_date).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                      : 'Date à définir'}
                    {appt.event_time ? ` · ${String(appt.event_time).slice(0, 5)}` : ''}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textLight} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  back: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: C.textDark },
  list: { paddingBottom: 40, gap: 10 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textLight,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  cardIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  cardSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textLight, textAlign: 'center', lineHeight: 19 },
});
