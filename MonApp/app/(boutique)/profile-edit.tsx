import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';

const CATEGORIES = ['Robes', 'Fleurs', 'Bijoux', 'Beauté', 'Papeterie', 'Décoration', 'Traiteur', 'Photo', 'Musique', 'Autre'];

export default function BoutiqueProfileEditScreen() {
  const { user, updateUser } = useAuth();

  const [shopName, setShopName] = useState(user ? `${user.prenom} ${user.nom}`.trim() : '');
  const [bio, setBio] = useState('Créations de mariage uniques · Livraison France entière 🌿');
  const [city, setCity] = useState('Paris, France');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>(['Robes']);
  const [saving, setSaving] = useState(false);

  const toggleCat = (c: string) => {
    setSelectedCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    Alert.alert('Profil mis à jour', '', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={C.textDark} />
          </Pressable>
          <ThemedText style={styles.title}>Modifier la boutique</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Cover */}
        <Pressable style={styles.coverPicker} onPress={pickCover}>
          <View style={styles.coverPlaceholder}>
            <Ionicons name="camera-outline" size={24} color={C.textLight} />
            <ThemedText style={styles.coverText}>Photo de couverture</ThemedText>
          </View>
        </Pressable>

        {/* Nom */}
        <ThemedText style={styles.label}>Nom de la boutique</ThemedText>
        <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholderTextColor={C.textLight} />

        {/* Bio */}
        <ThemedText style={styles.label}>Bio</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          placeholderTextColor={C.textLight}
        />

        {/* Ville */}
        <ThemedText style={styles.label}>Ville</ThemedText>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor={C.textLight} />

        {/* Site web */}
        <ThemedText style={styles.label}>Site web (optionnel)</ThemedText>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholder="https://..."
          placeholderTextColor={C.textLight}
          keyboardType="url"
          autoCapitalize="none"
        />

        {/* Instagram */}
        <ThemedText style={styles.label}>Instagram (optionnel)</ThemedText>
        <View style={styles.inputRow}>
          <ThemedText style={styles.inputPrefix}>@</ThemedText>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="votre_compte"
            placeholderTextColor={C.textLight}
            autoCapitalize="none"
          />
        </View>

        {/* Catégories */}
        <ThemedText style={styles.label}>Catégories de produits</ThemedText>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.catChip, selectedCats.includes(c) && styles.catChipActive]}
              onPress={() => toggleCat(c)}
            >
              <ThemedText style={[styles.catText, selectedCats.includes(c) && styles.catTextActive]}>{c}</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Stripe */}
        <View style={styles.stripeSection}>
          <View style={styles.stripeHeader}>
            <Ionicons name="card-outline" size={20} color={C.sauge} />
            <ThemedText style={styles.stripeTitle}>Paiement Stripe</ThemedText>
          </View>
          <ThemedText style={styles.stripeDesc}>
            Connectez votre compte Stripe pour recevoir les paiements directement sur votre compte bancaire.
          </ThemedText>
          <Pressable style={styles.stripeBtn}>
            <Ionicons name="link-outline" size={16} color={C.textInvert} />
            <ThemedText style={styles.stripeBtnText}>Connecter Stripe</ThemedText>
          </Pressable>
        </View>

        <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <ThemedText style={styles.saveBtnText}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '800', color: C.textDark },

  coverPicker: {
    height: 120, backgroundColor: C.card, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.taupe, borderStyle: 'dashed', marginBottom: 20,
  },
  coverPlaceholder: { alignItems: 'center', gap: 8 },
  coverText: { fontSize: 13, color: C.textLight },

  label: { fontSize: 13, fontWeight: '700', color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 14, fontSize: 15, color: C.textDark, marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },

  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: RADIUS.md, marginBottom: 16 },
  inputPrefix: { paddingLeft: 14, fontSize: 15, color: C.textLight },
  inputFlex: { flex: 1, marginBottom: 0, backgroundColor: 'transparent' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: C.card },
  catChipActive: { backgroundColor: C.sauge },
  catText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  catTextActive: { color: C.textInvert },

  stripeSection: { backgroundColor: C.saugePale, borderRadius: RADIUS.md, padding: 16, marginBottom: 24, gap: 10 },
  stripeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripeTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  stripeDesc: { fontSize: 13, color: C.textMid },
  stripeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.sauge, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start',
  },
  stripeBtnText: { color: C.textInvert, fontWeight: '700', fontSize: 13 },

  saveBtn: { backgroundColor: C.sauge, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: C.textInvert, fontSize: 16, fontWeight: '700' },
});
