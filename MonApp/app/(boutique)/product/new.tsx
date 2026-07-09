import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { type ProductCategory, useBoutique } from '@/contexts/boutique-context';

const CATEGORIES = ['Robes', 'Fleurs', 'Beauté', 'Papeterie', 'Bijoux', 'Décoration', 'Autre'];

export default function NewProductScreen() {
  const { addProduct } = useBoutique();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 6));
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim() || !category) {
      Alert.alert('Champs requis', 'Remplissez le nom, le prix et la catégorie.');
      return;
    }
    setSaving(true);
    addProduct({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: category as ProductCategory,
      active,
      imageUri: images[0],
    });
    setSaving(false);
    Alert.alert('Produit ajouté !', 'Votre produit est maintenant visible dans votre boutique.', [
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
          <ThemedText style={styles.title}>Nouveau produit</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Photos */}
        <ThemedText style={styles.label}>Photos du produit</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={styles.photoRow}>
            {images.map((uri, i) => (
              <View key={i} style={styles.photoWrap}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable style={styles.removePhoto} onPress={() => setImages((p) => p.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={20} color={C.error} />
                </Pressable>
              </View>
            ))}
            {images.length < 6 && (
              <Pressable style={styles.addPhoto} onPress={pickImage}>
                <Ionicons name="camera-outline" size={28} color={C.textLight} />
                <ThemedText style={styles.addPhotoText}>Ajouter</ThemedText>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Nom */}
        <ThemedText style={styles.label}>Nom du produit *</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex. Robe de mariée ivoire A-line"
          placeholderTextColor={C.textLight}
          value={name}
          onChangeText={setName}
        />

        {/* Description */}
        <ThemedText style={styles.label}>Description</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décrivez votre produit : matière, taille, disponibilité..."
          placeholderTextColor={C.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Prix & stock */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>Prix (€) *</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.textLight}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>Stock</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Quantité"
              placeholderTextColor={C.textLight}
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Catégorie */}
        <ThemedText style={styles.label}>Catégorie *</ThemedText>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}
            >
              <ThemedText style={[styles.catText, category === c && styles.catTextActive]}>{c}</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Actif */}
        <View style={styles.switchRow}>
          <View>
            <ThemedText style={styles.switchLabel}>Visible dans la boutique</ThemedText>
            <ThemedText style={styles.switchSub}>Les clients pourront voir et acheter ce produit</ThemedText>
          </View>
          <Switch
            value={active}
            onValueChange={setActive}
            trackColor={{ false: C.card, true: C.saugePale }}
            thumbColor={active ? C.sauge : C.textLight}
          />
        </View>

        {/* Stripe info */}
        <View style={styles.stripeInfo}>
          <Ionicons name="lock-closed-outline" size={16} color={C.sauge} />
          <ThemedText style={styles.stripeText}>
            Les paiements sont sécurisés via Stripe. Vous recevrez les fonds directement sur votre compte bancaire.
          </ThemedText>
        </View>

        {/* Bouton save */}
        <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <ThemedText style={styles.saveBtnText}>{saving ? 'Enregistrement…' : 'Publier le produit'}</ThemedText>
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

  label: { fontSize: 13, fontWeight: '700', color: C.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  photoRow: { flexDirection: 'row', gap: 10 },
  photoWrap: { position: 'relative' },
  photo: { width: 90, height: 90, borderRadius: RADIUS.md },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  addPhoto: {
    width: 90, height: 90, borderRadius: RADIUS.md,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.taupe, borderStyle: 'dashed', gap: 4,
  },
  addPhotoText: { fontSize: 11, color: C.textLight },

  input: {
    backgroundColor: C.card, borderRadius: RADIUS.md, padding: 14,
    fontSize: 15, color: C.textDark, marginBottom: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: 12 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: C.card },
  catChipActive: { backgroundColor: C.sauge },
  catText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  catTextActive: { color: C.textInvert },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderRadius: RADIUS.md, padding: 14, marginBottom: 16,
  },
  switchLabel: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 3 },
  switchSub: { fontSize: 12, color: C.textLight, maxWidth: 220 },

  stripeInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.saugePale, borderRadius: RADIUS.md, padding: 14, marginBottom: 24,
  },
  stripeText: { flex: 1, fontSize: 13, color: C.textMid },

  saveBtn: {
    backgroundColor: C.sauge, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: C.textInvert, fontSize: 16, fontWeight: '700' },
});
