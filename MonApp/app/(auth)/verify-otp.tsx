import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { API_ENDPOINTS } from '@/constants/config';

export default function VerifyOtpScreen() {
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{
    email: string;
    nom: string;
    prenom: string;
    mot_de_passe: string;
    role: string;
  }>();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = code.join('');
    if (otp.length < 6) {
      Alert.alert('Code incomplet', 'Entre les 6 chiffres du code reçu');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.inscription, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email,
          nom: params.nom,
          prenom: params.prenom,
          mot_de_passe: params.mot_de_passe,
          role: params.role ?? 'client',
          otp_code: otp,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Erreur', json.message ?? 'Code invalide ou expiré');
        return;
      }
      await signIn(json.data);
      if (params.role === 'prestataire') {
        router.replace('/(app)/prestataire/setup' as never);
      } else {
        router.replace('/(onboarding)/date-mariage');
      }
    } catch {
      Alert.alert('Connexion', 'Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch(API_ENDPOINTS.sendOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: params.email, purpose: 'inscription' }),
      });
      Alert.alert('Code renvoyé', 'Un nouveau code a été envoyé à ' + params.email);
    } catch {
      Alert.alert('Erreur', 'Impossible de renvoyer le code');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenLayout>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
          </Pressable>

          <View style={styles.iconWrap}>
            <Ionicons name="mail-open-outline" size={48} color="#A7AD9A" />
          </View>

          <ThemedText style={styles.title}>Vérification email</ThemedText>
          <ThemedText style={styles.sub}>
            Un code à 6 chiffres a été envoyé à{'\n'}
            <ThemedText style={styles.emailHighlight}>{params.email}</ThemedText>
          </ThemedText>

          <View style={styles.codeRow}>
            {code.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(el) => { inputs.current[idx] = el; }}
                style={[styles.codeBox, digit ? styles.codeBoxFilled : null]}
                value={digit}
                onChangeText={(v) => handleChange(v, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <ThemedText style={styles.btnTxt}>
              {loading ? 'Vérification...' : 'Confirmer mon compte'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={handleResend} disabled={resending} style={styles.resendRow}>
            <ThemedText style={styles.resendTxt}>
              {resending ? 'Envoi...' : 'Renvoyer le code'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  iconWrap: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 15, color: '#6b7280', marginBottom: 32, textAlign: 'center', lineHeight: 22 },
  emailHighlight: { color: '#A7AD9A', fontWeight: '700' },
  codeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 32 },
  codeBox: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 2, borderColor: '#e5e7eb',
    textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: '#111827', backgroundColor: '#fafafa',
  },
  codeBoxFilled: { borderColor: '#A7AD9A', backgroundColor: '#E8EDE4' },
  btn: { backgroundColor: '#A7AD9A', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resendRow: { marginTop: 20, alignItems: 'center' },
  resendTxt: { color: '#A7AD9A', fontWeight: '600', fontSize: 14 },
});
