import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useBoutique } from '@/contexts/boutique-context';

export default function NewReelScreen() {
  const { addReel } = useBoutique();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: 90,
      quality: 0.8,
    });
    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handlePublish = async () => {
    if (!videoUri) {
      Alert.alert('Vidéo requise', 'Sélectionnez une vidéo depuis votre galerie.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Titre requis', 'Donnez un titre à votre reel.');
      return;
    }
    setSaving(true);
    addReel({ title: title.trim(), description: description.trim(), duration: '0:00', videoUri: videoUri ?? undefined });
    setSaving(false);
    Alert.alert('Reel publié !', 'Votre reel est maintenant visible dans votre boutique.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={C.textDark} />
          </Pressable>
          <ThemedText style={styles.title}>Nouveau Reel</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Video picker */}
        <Pressable style={styles.videoPicker} onPress={pickVideo}>
          {videoUri ? (
            <View style={styles.videoReady}>
              <Ionicons name="checkmark-circle" size={40} color={C.sauge} />
              <ThemedText style={styles.videoReadyText}>Vidéo sélectionnée</ThemedText>
              <Pressable onPress={pickVideo}>
                <ThemedText style={styles.changeVideo}>Changer</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.videoEmpty}>
              <View style={styles.videoIcon}>
                <Ionicons name="videocam-outline" size={36} color="#8B5CF6" />
              </View>
              <ThemedText style={styles.videoEmptyTitle}>Sélectionner une vidéo</ThemedText>
              <ThemedText style={styles.videoEmptyMeta}>Max 90 secondes · MP4, MOV</ThemedText>
            </View>
          )}
        </Pressable>

        {/* Titre */}
        <ThemedText style={styles.label}>Titre du reel *</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex. Essayage robe Elise ✨"
          placeholderTextColor={C.textLight}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <ThemedText style={styles.label}>Description (optionnel)</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décrivez votre reel, mentionnez vos produits..."
          placeholderTextColor={C.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Tips */}
        <View style={styles.tipsBox}>
          <ThemedText style={styles.tipsTitle}>Conseils pour un bon reel</ThemedText>
          {['Format vertical (9:16) idéal', 'Lumière naturelle pour de belles couleurs', 'Max 60-90 secondes pour capter l\'attention', 'Mentionnez vos produits dans la description'].map((tip) => (
            <View key={tip} style={styles.tip}>
              <Ionicons name="checkmark" size={14} color={C.sauge} />
              <ThemedText style={styles.tipText}>{tip}</ThemedText>
            </View>
          ))}
        </View>

        <Pressable style={[styles.publishBtn, saving && styles.publishBtnDisabled]} onPress={handlePublish} disabled={saving}>
          <Ionicons name="cloud-upload-outline" size={18} color={C.textInvert} />
          <ThemedText style={styles.publishBtnText}>{saving ? 'Publication…' : 'Publier le reel'}</ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 18, fontWeight: '800', color: C.textDark },

  videoPicker: {
    height: 180, backgroundColor: C.card, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#8B5CF633', borderStyle: 'dashed',
    marginBottom: 24,
  },
  videoEmpty: { alignItems: 'center', gap: 10 },
  videoIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EDE5F8', alignItems: 'center', justifyContent: 'center',
  },
  videoEmptyTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  videoEmptyMeta: { fontSize: 12, color: C.textLight },
  videoReady: { alignItems: 'center', gap: 8 },
  videoReadyText: { fontSize: 15, fontWeight: '700', color: C.textDark },
  changeVideo: { fontSize: 13, color: C.sauge, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 14, fontSize: 15, color: C.textDark, marginBottom: 16 },
  textArea: { height: 90, textAlignVertical: 'top' },

  tipsBox: { backgroundColor: C.saugePale, borderRadius: RADIUS.md, padding: 14, marginBottom: 24, gap: 8 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { fontSize: 13, color: C.textMid, flex: 1 },

  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#8B5CF6', borderRadius: RADIUS.md, paddingVertical: 16,
  },
  publishBtnDisabled: { opacity: 0.55 },
  publishBtnText: { color: C.textInvert, fontSize: 16, fontWeight: '700' },
});
