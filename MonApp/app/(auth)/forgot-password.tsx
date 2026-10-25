import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { API_ENDPOINTS } from '@/constants/config';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Saisis ton adresse email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Erreur', json.message ?? 'Erreur serveur');
        return;
      }
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email: email.trim().toLowerCase() },
      } as never);
    } catch {
      Alert.alert('Erreur', 'Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#929B83" />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-open-outline" size={52} color="#929B83" />
          </View>

          <ThemedText style={styles.title}>Mot de passe oublié ?</ThemedText>
          <ThemedText style={styles.sub}>
            Saisis ton email. Si un compte existe, tu recevras un code de réinitialisation valable 15 minutes.
          </ThemedText>

          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="sophie@email.com"
            placeholderTextColor="#9A9C93"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            <ThemedText style={styles.btnTxt}>
              {loading ? 'Envoi en cours...' : 'Envoyer le code'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/login')} style={styles.backToLogin}>
            <ThemedText style={styles.backToLoginTxt}>Retour à la connexion</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: { marginBottom: 8 },
  content: { flex: 1, paddingTop: 12 },
  iconWrap: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  title: { fontSize: 26, fontFamily: 'OheveSerif-Medium', color: '#343630', marginBottom: 10 },
  sub: { fontSize: 14, color: '#5C5F57', lineHeight: 22, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: '#5c5f57', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#ece8e0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#343630', backgroundColor: '#fcfbf9', marginBottom: 0,
  },
  btn: { marginTop: 20, backgroundColor: '#929B83', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backToLogin: { marginTop: 20, alignItems: 'center' },
  backToLoginTxt: { color: '#929B83', fontWeight: '600', fontSize: 14 },
});
