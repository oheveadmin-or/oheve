import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { API_ENDPOINTS } from '@/constants/config';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !code[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleReset = async () => {
    const otp = code.join('');
    if (otp.length < 6) {
      Alert.alert('Code incomplet', 'Entre les 6 chiffres du code reçu');
      return;
    }
    if (!newPwd || newPwd.length < 8) {
      Alert.alert('Mot de passe', 'Minimum 8 caractères');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Mots de passe différents', 'Les deux mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otp, new_password: newPwd }),
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Erreur', json.message ?? 'Code invalide ou expiré');
        return;
      }
      Alert.alert(
        'Mot de passe réinitialisé',
        'Tu peux maintenant te connecter avec ton nouveau mot de passe.',
        [{ text: 'Se connecter', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      Alert.alert('Code renvoyé', 'Vérifie ta boîte mail');
    } catch {
      Alert.alert('Erreur', 'Impossible de renvoyer le code');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenLayout>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={52} color="#A7AD9A" />
          </View>

          <ThemedText style={styles.title}>Nouveau mot de passe</ThemedText>
          <ThemedText style={styles.sub}>
            Code envoyé à{' '}
            <ThemedText style={styles.emailTxt}>{email}</ThemedText>
          </ThemedText>

          {/* Code OTP */}
          <ThemedText style={styles.label}>Code de vérification</ThemedText>
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

          {/* Nouveau mot de passe */}
          <ThemedText style={styles.label}>Nouveau mot de passe</ThemedText>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={newPwd}
              onChangeText={setNewPwd}
              placeholder="Min. 8 caractères"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showNew}
              returnKeyType="next"
            />
            <Pressable onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
            </Pressable>
          </View>

          {/* Confirmation */}
          <ThemedText style={styles.label}>Confirmer le mot de passe</ThemedText>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder="Répète ton mot de passe"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />
            <Pressable onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
            </Pressable>
          </View>

          {confirmPwd.length > 0 && newPwd !== confirmPwd && (
            <ThemedText style={styles.errorTxt}>Les mots de passe ne correspondent pas</ThemedText>
          )}

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            <ThemedText style={styles.btnTxt}>
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
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
  backBtn: { marginBottom: 8 },
  iconWrap: { alignItems: 'center', marginBottom: 20, marginTop: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 22 },
  emailTxt: { color: '#A7AD9A', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 8, marginTop: 16 },

  codeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 4 },
  codeBox: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 2, borderColor: '#e5e7eb',
    textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: '#111827', backgroundColor: '#fafafa',
  },
  codeBoxFilled: { borderColor: '#A7AD9A', backgroundColor: '#E8EDE4' },

  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827', backgroundColor: '#fafafa',
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  errorTxt: { fontSize: 12, color: '#ef4444', marginTop: 6 },

  btn: { marginTop: 28, backgroundColor: '#A7AD9A', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resendRow: { marginTop: 18, alignItems: 'center' },
  resendTxt: { color: '#A7AD9A', fontWeight: '600', fontSize: 14 },
});
