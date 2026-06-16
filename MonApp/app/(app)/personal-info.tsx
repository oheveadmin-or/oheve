import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View, ActivityIndicator,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { API_ENDPOINTS } from '@/constants/config';

export default function PersonalInfoScreen() {
  const { user, updateUser } = useAuth();

  const isClient = user?.role === 'client';
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [nom, setNom] = useState(user?.nom ?? '');
  const [brideName, setBrideName] = useState(user?.bride_name ?? user?.prenom ?? '');
  const [groomName, setGroomName] = useState(user?.groom_name ?? user?.nom ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorise l\'accès à la galerie dans les réglages');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: `avatar.${asset.uri.split('.').pop() ?? 'jpg'}`,
      } as never);

      const res = await fetch(API_ENDPOINTS.avatar, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.accessToken}` },
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Erreur', json.message ?? 'Erreur upload photo');
        return;
      }
      await updateUser({ avatar_url: json.data.avatar_url });
      Alert.alert('Photo mise à jour', 'Votre photo de profil a été enregistrée');
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (isClient) {
      if (!brideName.trim() || !groomName.trim()) {
        Alert.alert('Champs requis', 'Les prénoms des deux mariés sont obligatoires');
        return;
      }
    } else if (!prenom.trim() || !nom.trim()) {
      Alert.alert('Champs requis', 'Prénom et nom sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.profile, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify(
          isClient
            ? {
                bride_name: brideName.trim(),
                groom_name: groomName.trim(),
                prenom: brideName.trim(),
                nom: groomName.trim(),
                phone: phone.trim() || null,
              }
            : {
                nom: nom.trim(),
                prenom: prenom.trim(),
                phone: phone.trim() || null,
              },
        ),
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Erreur', json.message ?? 'Erreur mise à jour');
        return;
      }
      await updateUser({
        nom: json.data.nom,
        prenom: json.data.prenom,
        phone: json.data.phone,
        bride_name: json.data.bride_name,
        groom_name: json.data.groom_name,
      });
      Alert.alert('Enregistré', 'Vos informations ont été mises à jour');
    } catch {
      Alert.alert('Erreur', 'Impossible de joindre le serveur');
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = user?.avatar_url;
  const initials = isClient
    ? `${brideName[0] ?? ''}${groomName[0] ?? ''}`.toUpperCase() || '?'
    : `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <ScreenLayout>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
          </Pressable>

          <ThemedText style={styles.title}>Informations personnelles</ThemedText>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handlePickAvatar} style={styles.avatarWrap} disabled={uploadingAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <ThemedText style={styles.avatarInitials}>{initials}</ThemedText>
                </View>
              )}
              <View style={styles.cameraBtn}>
                {uploadingAvatar ? (
                  <ActivityIndicator size={14} color="#fff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </Pressable>
            <ThemedText style={styles.avatarHint}>Appuie pour changer la photo</ThemedText>
          </View>

          {/* Email (lecture seule) */}
          <ThemedText style={styles.label}>Email</ThemedText>
          <View style={styles.inputReadOnly}>
            <Ionicons name="mail-outline" size={16} color="#A09890" style={{ marginRight: 8 }} />
            <ThemedText style={styles.inputReadOnlyTxt}>{user?.email ?? '-'}</ThemedText>
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={12} color="#A09890" />
            </View>
          </View>
          <ThemedText style={styles.hint}>L'email ne peut pas être modifié ici</ThemedText>

          {isClient ? (
            <>
              <ThemedText style={styles.sectionTitle}>Les futurs mariés</ThemedText>
              <ThemedText style={styles.label}>Prénom mariée</ThemedText>
              <TextInput
                style={styles.input}
                value={brideName}
                onChangeText={setBrideName}
                placeholder="Ex: Odaya"
                placeholderTextColor="#A09890"
                autoCapitalize="words"
                returnKeyType="next"
              />
              <ThemedText style={styles.label}>Prénom marié</ThemedText>
              <TextInput
                style={styles.input}
                value={groomName}
                onChangeText={setGroomName}
                placeholder="Ex: Aaron"
                placeholderTextColor="#A09890"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </>
          ) : (
            <>
              <ThemedText style={styles.label}>Prénom</ThemedText>
              <TextInput
                style={styles.input}
                value={prenom}
                onChangeText={setPrenom}
                placeholder="Ex: Sophie"
                placeholderTextColor="#A09890"
                autoCapitalize="words"
                returnKeyType="next"
              />
              <ThemedText style={styles.label}>Nom</ThemedText>
              <TextInput
                style={styles.input}
                value={nom}
                onChangeText={setNom}
                placeholder="Ex: Martin"
                placeholderTextColor="#A09890"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </>
          )}

          {/* Téléphone */}
          <ThemedText style={styles.label}>Téléphone</ThemedText>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+33 6 12 34 56 78"
            placeholderTextColor="#A09890"
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Pressable
            style={[styles.btn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <ThemedText style={styles.btnTxt}>
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 60 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#3D3530', marginBottom: 28 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#A7AD9A' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarHint: { fontSize: 12, color: '#A09890' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#3D3530', marginTop: 8, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 8, marginTop: 14 },

  inputReadOnly: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#f9fafb',
  },
  inputReadOnlyTxt: { flex: 1, fontSize: 15, color: '#6B6058' },
  lockedBadge: { marginLeft: 8 },
  hint: { fontSize: 11, color: '#A09890', marginTop: 4, marginBottom: 4 },

  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#3D3530', backgroundColor: '#fafafa',
  },

  btn: {
    marginTop: 32, backgroundColor: '#A7AD9A',
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
