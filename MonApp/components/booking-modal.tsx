import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { calendarApi } from '@/services/auth/api';

/**
 * Prise de rendez-vous côté CLIENT : créneaux ouverts par le prestataire.
 * Utilisé depuis la fiche prestataire ET depuis une conversation.
 */
export function BookingModal({
  visible,
  onClose,
  prestataireId,
  prestataireName,
  accessToken,
  onBooked,
}: {
  visible: boolean;
  onClose: () => void;
  prestataireId: number;
  prestataireName: string;
  accessToken?: string;
  /** Appelé après confirmation (ex. envoyer un message récap dans le chat) */
  onBooked?: (info: { title: string; date: string; time: string }) => void;
}) {
  const [step, setStep] = useState<'slots' | 'confirm'>('slots');
  const [loading, setLoading] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [slots, setSlots] = useState<{ date: string; slots: string[] }[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !accessToken || !prestataireId) return;
    setStep('slots');
    setSelectedDate('');
    setSelectedTime('');
    setTitle(`Rendez-vous — ${prestataireName}`);
    setNotes('');
    setLoading(true);
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    calendarApi
      .getProviderSlots(accessToken, prestataireId, from, to.toISOString().slice(0, 10))
      .then((res) => {
        if (res?.success && res.data) {
          setHasAvailability(res.data.has_availability);
          setSlots(res.data.slots ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, accessToken, prestataireId, prestataireName]);

  const handleBook = async () => {
    if (!accessToken || !selectedDate || !selectedTime || !title.trim()) {
      Alert.alert('Informations manquantes', 'Sélectionnez un créneau et un titre.');
      return;
    }
    setSubmitting(true);
    const res = await calendarApi.requestAppointment(accessToken, {
      prestataire_id: prestataireId,
      title: title.trim(),
      requested_date: selectedDate,
      requested_time: selectedTime,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (res?.success) {
      Alert.alert(
        'Rendez-vous confirmé ✓',
        `Votre rendez-vous du ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${selectedTime} a été ajouté à votre calendrier et à celui du prestataire.`,
      );
      onBooked?.({ title: title.trim(), date: selectedDate, time: selectedTime });
      onClose();
    } else {
      Alert.alert('Erreur', res?.message ?? 'Impossible de confirmer le rendez-vous');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={bkStyles.overlay} onPress={onClose} />
        <View style={bkStyles.sheet}>
          <View style={bkStyles.handle} />
          <ThemedText style={bkStyles.headerTitle}>{prestataireName}</ThemedText>
          <ThemedText style={bkStyles.headerSub}>
            {step === 'slots' ? 'Créneaux ouverts par le prestataire' : 'Confirmer votre demande'}
          </ThemedText>

          {loading ? (
            <ThemedText style={bkStyles.headerSub}>Chargement des disponibilités…</ThemedText>
          ) : !hasAvailability || slots.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={32} color={C.sauge} />
              <ThemedText style={{ textAlign: 'center', color: C.textMid, fontSize: 14 }}>
                Ce prestataire n'a pas encore configuré ses disponibilités.
              </ThemedText>
            </View>
          ) : step === 'slots' ? (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {slots.map((day) => (
                <View key={day.date} style={{ marginBottom: 14 }}>
                  <ThemedText style={{ fontWeight: '700', color: C.textDark, marginBottom: 8 }}>
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {day.slots.map((time) => {
                      const active = selectedDate === day.date && selectedTime === time;
                      return (
                        <Pressable
                          key={`${day.date}-${time}`}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                            backgroundColor: active ? C.sauge : C.saugePale,
                          }}
                          onPress={() => { setSelectedDate(day.date); setSelectedTime(time); }}
                        >
                          <ThemedText style={{ fontWeight: '600', color: active ? '#fff' : C.saugeDark, fontSize: 13 }}>
                            {time}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              {selectedDate && selectedTime && (
                <Pressable style={bkStyles.ctaBtn} onPress={() => setStep('confirm')}>
                  <Ionicons name="calendar" size={18} color="#fff" />
                  <ThemedText style={bkStyles.ctaBtnTxt}>Prendre rendez-vous</ThemedText>
                </Pressable>
              )}
            </ScrollView>
          ) : (
            <View style={{ gap: 12 }}>
              <ThemedText style={{ color: C.textMid, fontSize: 14 }}>
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {selectedTime}
              </ThemedText>
              <TextInput
                style={bkStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Titre du rendez-vous"
                placeholderTextColor="#A09890"
              />
              <TextInput
                style={[bkStyles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optionnel)"
                placeholderTextColor="#A09890"
                multiline
              />
              <Pressable style={bkStyles.ctaBtn} onPress={handleBook} disabled={submitting}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <ThemedText style={bkStyles.ctaBtnTxt}>{submitting ? 'Confirmation…' : 'Confirmer le rendez-vous'}</ThemedText>
              </Pressable>
              <Pressable onPress={() => setStep('slots')}>
                <ThemedText style={{ textAlign: 'center', color: C.sauge, fontWeight: '600' }}>← Choisir un autre créneau</ThemedText>
              </Pressable>
            </View>
          )}
          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Proposition de rendez-vous côté PRESTATAIRE : il fixe librement date/heure
 * pour un client (utilisé depuis une conversation). Le client est notifié.
 */
export function ProposeAppointmentModal({
  visible,
  onClose,
  clientId,
  clientName,
  accessToken,
  onProposed,
}: {
  visible: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  accessToken?: string;
  onProposed?: (info: { title: string; date: string; time: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(`Rendez-vous — ${clientName}`.trim());
    setDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10)); // demain par défaut
    setTime('10:00');
    setNotes('');
  }, [visible, clientName]);

  const handlePropose = async () => {
    if (!accessToken) return;
    if (!title.trim()) {
      Alert.alert('Titre requis', 'Donnez un titre au rendez-vous.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ (ex. 2026-09-15).');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(time.trim())) {
      Alert.alert('Heure invalide', 'Utilisez le format HH:MM (ex. 14:30).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await calendarApi.requestAppointment(accessToken, {
        client_id: clientId,
        title: title.trim(),
        requested_date: date.trim(),
        requested_time: time.trim(),
        notes: notes.trim() || undefined,
      });
      if (res?.success) {
        Alert.alert(
          'Rendez-vous fixé ✓',
          'Il a été ajouté aux deux calendriers. Le client a été notifié.',
        );
        onProposed?.({ title: title.trim(), date: date.trim(), time: time.trim() });
        onClose();
      } else {
        Alert.alert('Erreur', res?.message ?? 'Impossible de fixer le rendez-vous.');
      }
    } catch {
      Alert.alert('Erreur', 'Vérifiez votre connexion et réessayez.');
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={bkStyles.overlay} onPress={onClose} />
        <View style={bkStyles.sheet}>
          <View style={bkStyles.handle} />
          <ThemedText style={bkStyles.headerTitle}>Fixer un rendez-vous</ThemedText>
          <ThemedText style={bkStyles.headerSub}>Avec {clientName}</ThemedText>

          <View style={{ gap: 12 }}>
            <TextInput
              style={bkStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre (ex. Dégustation menu)"
              placeholderTextColor="#A09890"
            />
            <TextInput
              style={bkStyles.input}
              value={date}
              onChangeText={setDate}
              placeholder="Date (AAAA-MM-JJ)"
              placeholderTextColor="#A09890"
            />
            <TextInput
              style={bkStyles.input}
              value={time}
              onChangeText={setTime}
              placeholder="Heure (HH:MM)"
              placeholderTextColor="#A09890"
            />
            <TextInput
              style={[bkStyles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optionnel — adresse, précisions…)"
              placeholderTextColor="#A09890"
              multiline
            />
            <View style={bkStyles.notifyRow}>
              <Ionicons name="notifications-outline" size={14} color={C.saugeDark} />
              <ThemedText style={bkStyles.notifyTxt}>Le client recevra une notification</ThemedText>
            </View>
            <Pressable style={[bkStyles.ctaBtn, submitting && { opacity: 0.6 }]} onPress={handlePropose} disabled={submitting}>
              <Ionicons name="calendar" size={18} color="#fff" />
              <ThemedText style={bkStyles.ctaBtnTxt}>{submitting ? 'Envoi…' : 'Fixer le rendez-vous'}</ThemedText>
            </Pressable>
          </View>
          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const bkStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 19, fontWeight: '800', color: C.textDark },
  headerSub: { fontSize: 13, color: C.textLight, marginTop: 2, marginBottom: 14 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: C.textDark, backgroundColor: C.card,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 15, marginTop: 4, marginBottom: 8,
  },
  ctaBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  notifyTxt: { fontSize: 12, color: C.saugeDark },
});
