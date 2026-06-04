import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { API_ENDPOINTS } from '@/constants/config';

function PwdField({
  label, value, onChange, show, onToggle, placeholder, onSubmit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.pwdRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? '••••••••'}
          placeholderTextColor="#A09890"
          secureTextEntry={!show}
          returnKeyType={onSubmit ? 'done' : 'next'}
          onSubmitEditing={onSubmit}
        />
        <Pressable onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#A09890" />
        </Pressable>
      </View>
    </>
  );
}

export default function SecurityScreen() {
  const { user, signOut } = useAuth();

  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasSocialAccount = !user?.phone && !current; // indicateur approximatif

  const handleChange = async () => {
    if (!current || !newPwd || !confirm) {
      Alert.alert('Champs requis', 'Remplis tous les champs');
      return;
    }
    if (newPwd.length < 8) {
      Alert.alert('Mot de passe trop court', 'Minimum 8 caractères');
      return;
    }
    if (newPwd !== confirm) {
      Alert.alert('Mots de passe différents', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (newPwd === current) {
      Alert.alert('Même mot de passe', 'Le nouveau doit être différent de l\'actuel');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.changePassword, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ current_password: current, new_password: newPwd }),
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Erreur', json.message ?? 'Erreur lors du changement');
        return;
      }
      setCurrent('');
      setNewPwd('');
      setConfirm('');
      Alert.alert('Mot de passe modifié', 'Ton mot de passe a été mis à jour avec succès.');
    } catch {
      Alert.alert('Erreur', 'Impossible de joindre le serveur');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogoutAll = () => {
    Alert.alert(
      'Déconnexion partout',
      'Toutes tes sessions actives seront fermées. Tu devras te reconnecter.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter partout', style: 'destructive', onPress: () => signOut(true) },
      ]
    );
  };

  return (
    <ScreenLayout>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.title}>Sécurité</ThemedText>

          {/* Compte info */}
          <View style={styles.infoCard}>
            <Ionicons name="person-circle-outline" size={20} color="#A7AD9A" />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoCardName}>
                {user?.prenom} {user?.nom}
              </ThemedText>
              <ThemedText style={styles.infoCardEmail}>{user?.email}</ThemedText>
            </View>
            <View style={styles.safeBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10b981" />
              <ThemedText style={styles.safeBadgeTxt}>Compte actif</ThemedText>
            </View>
          </View>

          {/* Changer mot de passe */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="key-outline" size={18} color="#A7AD9A" />
              <ThemedText style={styles.sectionTitle}>Changer le mot de passe</ThemedText>
            </View>

            <PwdField
              label="Mot de passe actuel"
              value={current}
              onChange={setCurrent}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              placeholder="Ton mot de passe actuel"
            />

            <PwdField
              label="Nouveau mot de passe"
              value={newPwd}
              onChange={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
              placeholder="Min. 8 caractères"
            />

            <PwdField
              label="Confirmer le nouveau mot de passe"
              value={confirm}
              onChange={setConfirm}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              placeholder="Répète ton nouveau mot de passe"
              onSubmit={handleChange}
            />

            {confirm.length > 0 && newPwd !== confirm && (
              <ThemedText style={styles.errorTxt}>Les mots de passe ne correspondent pas</ThemedText>
            )}

            {newPwd.length >= 8 && confirm === newPwd && (
              <View style={styles.strengthGood}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <ThemedText style={styles.strengthGoodTxt}>Mots de passe identiques</ThemedText>
              </View>
            )}

            <Pressable
              style={[styles.btn, saving && styles.btnDisabled]}
              onPress={handleChange}
              disabled={saving}
            >
              <ThemedText style={styles.btnTxt}>
                {saving ? 'Modification...' : 'Modifier le mot de passe'}
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.forgotLink}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Ionicons name="mail-outline" size={14} color="#A7AD9A" />
              <ThemedText style={styles.forgotLinkTxt}>
                Mot de passe oublié ? Réinitialiser par email
              </ThemedText>
            </Pressable>
          </View>

          {/* Sessions actives */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="phone-portrait-outline" size={18} color="#6B6058" />
              <ThemedText style={styles.sectionTitle}>Sessions actives</ThemedText>
            </View>

            <View style={styles.sessionCard}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.sessionLabel}>Appareil actuel</ThemedText>
                <ThemedText style={styles.sessionSub}>Session en cours</ThemedText>
              </View>
              <View style={styles.currentBadge}>
                <ThemedText style={styles.currentBadgeTxt}>En cours</ThemedText>
              </View>
            </View>

            <Pressable style={styles.logoutAllBtn} onPress={confirmLogoutAll}>
              <Ionicons name="log-out-outline" size={16} color="#dc2626" />
              <ThemedText style={styles.logoutAllTxt}>
                Déconnecter tous les appareils
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: { marginBottom: 8 },
  content: { paddingBottom: 60, gap: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#3D3530', marginBottom: 4 },

  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e0e7ff', borderRadius: 14,
    padding: 14, backgroundColor: '#E8EDE4',
  },
  infoCardName: { fontSize: 15, fontWeight: '700', color: '#3D3530' },
  infoCardEmail: { fontSize: 13, color: '#6B6058', marginTop: 2 },
  safeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  safeBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#10b981' },

  section: {
    borderWidth: 1, borderColor: '#ececf2', borderRadius: 16,
    padding: 16, backgroundColor: '#fff', gap: 0,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#3D3530' },

  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#3D3530', backgroundColor: '#fafafa',
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  errorTxt: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  strengthGood: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  strengthGoodTxt: { fontSize: 12, color: '#10b981', fontWeight: '600' },

  btn: { marginTop: 20, backgroundColor: '#A7AD9A', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  forgotLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'center' },
  forgotLinkTxt: { color: '#A7AD9A', fontSize: 13, fontWeight: '600' },

  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, backgroundColor: '#fafafa',
  },
  sessionLabel: { fontSize: 14, fontWeight: '600', color: '#3D3530' },
  sessionSub: { fontSize: 12, color: '#A09890', marginTop: 2 },
  currentBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  currentBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#10b981' },

  logoutAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, backgroundColor: '#fff9f9',
  },
  logoutAllTxt: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
});
