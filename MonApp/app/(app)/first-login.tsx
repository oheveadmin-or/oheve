import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/services/auth/api';

const MIN_PWD = 8;

/**
 * Première connexion d'un prestataire dont l'admin a créé le compte
 * (identifiant + mot de passe provisoire) : il choisit son mot de passe et
 * ajoute son email, avec lequel il pourra ensuite se connecter.
 */
export default function FirstLoginScreen() {
  const { user, updateUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const goHome = () => router.replace('/(app)/(tabs)');

  const submit = async () => {
    if (!user?.accessToken) return;
    if (password.length < MIN_PWD) {
      Alert.alert('Mot de passe trop court', `Choisissez au moins ${MIN_PWD} caractères.`);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mots de passe différents', 'Les deux mots de passe ne sont pas identiques.');
      return;
    }
    const mail = email.trim().toLowerCase();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      Alert.alert('Email invalide', "Vérifiez l'adresse email.");
      return;
    }
    setSaving(true);
    const res = await authApi.firstLogin(user.accessToken, { new_password: password, email: mail || undefined });
    setSaving(false);
    if (!res.success || !res.data) {
      Alert.alert('Enregistrement impossible', res.message ?? 'Réessayez.');
      return;
    }
    await updateUser({
      email: res.data.email ?? user.email,
      accessToken: res.data.accessToken ?? user.accessToken,
      must_change_password: false,
    });
    goHome();
    Alert.alert(
      'C\'est enregistré',
      mail
        ? `Vous pourrez désormais vous connecter avec ${mail} ou votre identifiant${user.username ? ` (${user.username})` : ''}.`
        : 'Votre nouveau mot de passe est enregistré.',
    );
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="key-outline" size={30} color={C.saugeDark} />
          </View>
          <ThemedText style={styles.title}>Bienvenue sur Oheve</ThemedText>
          <ThemedText style={styles.text}>
            Votre compte a été créé avec un mot de passe provisoire. Choisissez le vôtre et ajoutez votre
            email : vous pourrez ensuite vous connecter avec.
          </ThemedText>
          {!!user?.username && (
            <ThemedText style={styles.idLine}>Identifiant : {user.username}</ThemedText>
          )}

          <ThemedText style={styles.label}>Nouveau mot de passe</ThemedText>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={`${MIN_PWD} caractères minimum`}
              placeholderTextColor={C.textLight}
            />
            <Pressable style={styles.eye} onPress={() => setShowPwd((v) => !v)} hitSlop={8}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMid} />
            </Pressable>
          </View>

          <ThemedText style={styles.label}>Confirmer le mot de passe</ThemedText>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={C.textLight}
          />

          <ThemedText style={styles.label}>Votre email</ThemedText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="contact@exemple.fr"
            placeholderTextColor={C.textLight}
          />

          <Pressable style={[styles.btn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.btnTxt}>Enregistrer</ThemedText>}
          </Pressable>
          <Pressable style={styles.later} onPress={goHome} hitSlop={8}>
            <ThemedText style={styles.laterTxt}>Plus tard</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, gap: 10 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, alignSelf: 'center', marginTop: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.saugePale,
  },
  title: { fontSize: 26, fontFamily: 'OheveSerif-Medium', color: C.textDark, textAlign: 'center', marginTop: 8 },
  text: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 21 },
  idLine: { fontSize: 14, fontWeight: '700', color: C.saugeDark, textAlign: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.textMid, marginTop: 8 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md, backgroundColor: C.card,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.textDark,
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: {
    width: 46, height: 46, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.card,
  },
  btn: { backgroundColor: C.saugeDark, borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  later: { alignSelf: 'center', paddingVertical: 10 },
  laterTxt: { fontSize: 14, color: C.textLight, fontWeight: '600' },
});
