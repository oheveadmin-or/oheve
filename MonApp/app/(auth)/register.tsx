import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { UserRole } from '@/contexts/auth-context';
import { API_ENDPOINTS } from '@/constants/config';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { useAppleAuthAvailable } from '@/hooks/use-apple-auth-available';

const ROLES: { key: UserRole; label: string; icon: string; desc: string }[] = [
  { key: 'client', label: 'Futur(e) marié(e)', icon: '💍', desc: 'Organise ton mariage' },
  { key: 'prestataire', label: 'Prestataire', icon: '🏢', desc: '3 mois offerts puis 39€/mois' },
  { key: 'boutique', label: 'Boutique', icon: '🛍️', desc: 'À partir de 7€/mois' },
];

export default function RegisterScreen() {
  const [role, setRole] = useState<UserRole>('client');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAfterSocialSignIn = (isNew: boolean, _role: string) => {
    if (isNew) { router.replace('/(onboarding)/setup'); } else { router.replace('/(app)/(tabs)'); }
  };
  const { signInWithGoogle, signInWithApple } = useSocialAuth(handleAfterSocialSignIn);
  const appleAvailable = useAppleAuthAvailable();

  const handleRegister = async () => {
    const isClient = role === 'client';
    if (isClient) {
      if (!brideName.trim() || !groomName.trim() || !email.trim() || !password) {
        Alert.alert('Champs manquants', 'Les prénoms des deux mariés, l\'email et le mot de passe sont requis');
        return;
      }
    } else if (!nom.trim() || !prenom.trim() || !email.trim() || !password) {
      Alert.alert('Champs manquants', 'Tous les champs sont requis');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email invalide', 'Entre une adresse email valide (ex: nom@gmail.com)');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Mot de passe', 'Au moins 8 caractères');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.sendOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: 'inscription' }),
      });
      const json = await res.json();
      if (!json.success) {
        // Cas 1 : email déjà inscrit → proposer la connexion au lieu d'un 2e compte
        if (res.status === 409) {
          Alert.alert(
            'Compte existant',
            'Un compte existe déjà avec cet email.',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
            ],
          );
          return;
        }
        Alert.alert('Erreur', json.message ?? "Erreur lors de l'envoi du code");
        return;
      }
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: email.trim().toLowerCase(),
          nom: isClient ? groomName.trim() : nom.trim(),
          prenom: isClient ? brideName.trim() : prenom.trim(),
          bride_name: isClient ? brideName.trim() : '',
          groom_name: isClient ? groomName.trim() : '',
          mot_de_passe: password,
          role,
        },
      } as never);
    } catch {
      Alert.alert('Connexion', 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout style={{ backgroundColor: C.ivoire }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={C.moka} />
            </Pressable>
            <View style={styles.logoCircle}>
              <ThemedText style={styles.logoText}>Oe</ThemedText>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ThemedText style={styles.title}>Créer mon compte</ThemedText>
          <ThemedText style={styles.sub}>Commencez votre plus belle histoire ✨</ThemedText>

          {/* Social buttons */}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={RADIUS.md}
              style={styles.appleBtn}
              onPress={signInWithApple}
            />
          )}
          <Pressable style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]} onPress={signInWithGoogle}>
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <ThemedText style={styles.googleBtnText}>Continuer avec Google</ThemedText>
          </Pressable>

          <View style={styles.divRow}>
            <View style={styles.divLine} />
            <ThemedText style={styles.divLabel}>ou par email</ThemedText>
            <View style={styles.divLine} />
          </View>

          {/* Role selector */}
          <ThemedText style={styles.sectionLabel}>Je suis…</ThemedText>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <Pressable
                key={r.key}
                style={[styles.roleCard, role === r.key && styles.roleCardOn]}
                onPress={() => setRole(r.key)}
              >
                <ThemedText style={styles.roleEmoji}>{r.icon}</ThemedText>
                <ThemedText style={[styles.roleLabel, role === r.key && styles.roleLabelOn]}>{r.label}</ThemedText>
                <ThemedText style={styles.roleDesc}>{r.desc}</ThemedText>
                {role === r.key && (
                  <View style={styles.roleCheck}>
                    <Ionicons name="checkmark-circle" size={16} color={C.sauge} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Fields */}
          {role === 'client' ? (
            <>
              <ThemedText style={styles.sectionLabel}>Les futurs mariés</ThemedText>
              <View style={styles.fieldsRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Prénom mariée</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={brideName} onChangeText={setBrideName}
                    placeholder="Léa" placeholderTextColor={C.textLight}
                    autoCapitalize="words" returnKeyType="next"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Prénom marié</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={groomName} onChangeText={setGroomName}
                    placeholder="Thomas" placeholderTextColor={C.textLight}
                    autoCapitalize="words" returnKeyType="next"
                  />
                </View>
              </View>
              <ThemedText style={styles.coupleHint}>
                Ces prénoms apparaîtront sur votre accueil et votre profil
              </ThemedText>
            </>
          ) : (
            <View style={styles.fieldsRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.fieldLabel}>Prénom</ThemedText>
                <TextInput
                  style={styles.input}
                  value={prenom} onChangeText={setPrenom}
                  placeholder="Sophie" placeholderTextColor={C.textLight}
                  autoCapitalize="words" returnKeyType="next"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.fieldLabel}>Nom</ThemedText>
                <TextInput
                  style={styles.input}
                  value={nom} onChangeText={setNom}
                  placeholder="Martin" placeholderTextColor={C.textLight}
                  autoCapitalize="words" returnKeyType="next"
                />
              </View>
            </View>
          )}

          <ThemedText style={styles.fieldLabel}>Email</ThemedText>
          <TextInput
            style={styles.input}
            value={email} onChangeText={setEmail}
            placeholder="sophie@email.com" placeholderTextColor={C.textLight}
            keyboardType="email-address" autoCapitalize="none" returnKeyType="next"
          />

          <ThemedText style={styles.fieldLabel}>Mot de passe</ThemedText>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password} onChangeText={setPassword}
              placeholder="Min. 8 caractères" placeholderTextColor={C.textLight}
              secureTextEntry={!showPwd} returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <Pressable onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textLight} />
            </Pressable>
          </View>

          <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
            <ThemedText style={styles.btnTxt}>
              {loading ? 'Envoi du code…' : 'Créer mon compte →'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/login')} style={styles.switchRow}>
            <ThemedText style={styles.switchTxt}>
              Déjà un compte ?{' '}
              <ThemedText style={styles.switchLink}>Se connecter</ThemedText>
            </ThemedText>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, paddingHorizontal: 2 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.beige, alignItems: 'center', justifyContent: 'center' },
  logoCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 16, fontWeight: '700', color: C.ivoire, fontStyle: 'italic' },

  title: { fontSize: 28, fontWeight: '800', color: C.textDark, textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 14, color: C.textLight, textAlign: 'center', marginBottom: 24 },

  appleBtn: { width: '100%', height: 50, marginBottom: 12 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    paddingVertical: 13, backgroundColor: C.card, marginBottom: 20,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: C.textDark },

  divRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divLabel: { fontSize: 12, color: C.textLight },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: C.textMid, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  roleCard: {
    flex: 1, borderWidth: 1.5, borderColor: C.border,
    borderRadius: RADIUS.md, padding: 12, alignItems: 'center',
    gap: 3, position: 'relative', backgroundColor: C.card,
  },
  roleCardOn: { borderColor: C.sauge, backgroundColor: C.saugePale },
  roleEmoji: { fontSize: 22 },
  roleLabel: { fontSize: 11, fontWeight: '700', color: C.textMid, textAlign: 'center' },
  roleLabelOn: { color: C.saugeDark },
  roleDesc: { fontSize: 10, color: C.textLight, textAlign: 'center' },
  roleCheck: { position: 'absolute', top: 6, right: 6 },

  fieldsRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textMid, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    color: C.textDark, backgroundColor: C.card,
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },

  btn: {
    marginTop: 24, backgroundColor: C.sauge,
    borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: C.textInvert, fontWeight: '700', fontSize: 16 },

  switchRow: { marginTop: 16, alignItems: 'center' },
  switchTxt: { fontSize: 14, color: C.textLight },
  switchLink: { color: C.saugeDark, fontWeight: '700' },

  coupleHint: { fontSize: 12, color: C.textLight, marginTop: 4, lineHeight: 17 },
});
