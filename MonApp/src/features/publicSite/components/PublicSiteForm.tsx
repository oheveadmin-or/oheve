import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { guessGuestSiteBuilderUrl } from '@/constants/config';
import { ThemedText } from '@/components/themed-text';
import { formatWeddingDisplayDate } from '@/src/utils/formatWeddingDisplayDate';

import type { PublicSiteFormValues } from '../types/publicSite.types';

const TEMPLATES = [
  { id: 'classic', label: 'Classique' },
  { id: 'luxury', label: 'Luxe' },
  { id: 'modern', label: 'Moderne' },
  { id: 'romantic', label: 'Romantique' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'floral', label: 'Floral' },
  { id: 'oriental', label: 'Oriental' },
  { id: 'royal', label: 'Royal' },
] as const;

interface PublicSiteFormProps {
  initialValues?: Partial<PublicSiteFormValues>;
  disabled?: boolean;
  onSubmit: (values: PublicSiteFormValues) => void;
}

export function PublicSiteForm({ initialValues, disabled, onSubmit }: PublicSiteFormProps) {
  const defaults = useMemo<PublicSiteFormValues>(
    () => ({
      brideName: initialValues?.brideName ?? '',
      groomName: initialValues?.groomName ?? '',
      weddingDate: initialValues?.weddingDate ?? '',
      location: initialValues?.location ?? '',
      phone: initialValues?.phone ?? '',
      templateId: initialValues?.templateId ?? 'classic',
      customText: initialValues?.customText ?? '',
      isPublished: initialValues?.isPublished ?? false,
    }),
    [initialValues]
  );

  const [values, setValues] = useState<PublicSiteFormValues>(defaults);

  const dateReadableFr = useMemo(
    () => formatWeddingDisplayDate(values.weddingDate, 'fr'),
    [values.weddingDate]
  );

  return (
    <View style={styles.block}>
      <ThemedText style={styles.label}>Mariée (prénom / nom)</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Ex. Sarah Cohen"
        placeholderTextColor="#9ca3af"
        value={values.brideName}
        onChangeText={(t) => setValues((v) => ({ ...v, brideName: t }))}
        editable={!disabled}
      />

      <ThemedText style={styles.label}>Marié (prénom / nom)</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Ex. David Levi"
        placeholderTextColor="#9ca3af"
        value={values.groomName}
        onChangeText={(t) => setValues((v) => ({ ...v, groomName: t }))}
        editable={!disabled}
      />

      <ThemedText style={styles.label}>Date du mariage</ThemedText>
      <ThemedText style={styles.fieldHint}>Saisie envoyée au serveur au format AAAA-MM-JJ (ex. 2033-08-16).</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="2033-08-16"
        placeholderTextColor="#9ca3af"
        value={values.weddingDate}
        onChangeText={(t) => setValues((v) => ({ ...v, weddingDate: t }))}
        editable={!disabled}
        autoCapitalize="none"
      />
      {dateReadableFr ? (
        <ThemedText style={styles.datePreview}>Aperçu invité : {dateReadableFr}</ThemedText>
      ) : values.weddingDate.trim().length >= 4 ? (
        <ThemedText style={styles.datePreviewMuted}>Complète la date (AAAA-MM-JJ) pour voir l’aperçu.</ThemedText>
      ) : null}

      <ThemedText style={styles.label}>Lieu</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Ville ou lieu de réception"
        placeholderTextColor="#9ca3af"
        value={values.location}
        onChangeText={(t) => setValues((v) => ({ ...v, location: t }))}
        editable={!disabled}
      />

      <ThemedText style={styles.label}>Téléphone (optionnel)</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Pour vous recontacter"
        placeholderTextColor="#9ca3af"
        value={values.phone}
        onChangeText={(t) => setValues((v) => ({ ...v, phone: t }))}
        editable={!disabled}
        keyboardType="phone-pad"
      />

      <ThemedText style={styles.label}>Modèle</ThemedText>
      <View style={styles.templateRow}>
        {TEMPLATES.map((t) => {
          const selected = values.templateId === t.id;
          return (
            <Pressable
              key={t.id}
              style={[styles.templateChip, selected && styles.templateChipSelected]}
              onPress={() => !disabled && setValues((v) => ({ ...v, templateId: t.id }))}
              disabled={disabled}
            >
              <ThemedText style={[styles.templateChipText, selected && styles.templateChipTextSelected]}>
                {t.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText style={styles.label}>Texte personnalisé (optionnel)</ThemedText>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Message d’accueil pour vos invités"
        placeholderTextColor="#9ca3af"
        value={values.customText}
        onChangeText={(t) => setValues((v) => ({ ...v, customText: t }))}
        editable={!disabled}
        multiline
      />

      <View style={styles.publishRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.label}>Publier tout de suite</ThemedText>
          <ThemedText style={styles.hint}>Sinon le lien public ne sera pas actif (GET retournera 404).</ThemedText>
        </View>
        <Switch
          value={values.isPublished}
          onValueChange={(v) => setValues((prev) => ({ ...prev, isPublished: v }))}
          disabled={disabled}
        />
      </View>

      <Pressable
        style={[styles.studioLink, disabled && styles.studioLinkDisabled]}
        onPress={() => {
          if (disabled) return;
          const url = guessGuestSiteBuilderUrl();
          Linking.openURL(url).catch(() => {});
        }}
        disabled={disabled}
      >
        <ThemedText style={styles.studioLinkTitle}>Studio web (thèmes & aperçu)</ThemedText>
        <ThemedText style={styles.studioLinkUrl} numberOfLines={2}>
          {guessGuestSiteBuilderUrl()}
        </ThemedText>
        <ThemedText style={styles.studioLinkHint}>À ouvrir dans le navigateur — personnalisation avancée (couleurs, sections).</ThemedText>
      </Pressable>

      <Pressable
        style={[styles.submit, disabled && styles.submitDisabled]}
        onPress={() => onSubmit(values)}
        disabled={disabled}
      >
        <ThemedText style={styles.submitText}>Créer mon mini-site</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  fieldHint: { fontSize: 12, opacity: 0.72, marginTop: 2 },
  datePreview: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4c1d95',
    marginTop: 6,
    lineHeight: 18,
  },
  datePreviewMuted: { fontSize: 12, opacity: 0.65, marginTop: 4 },
  hint: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  templateChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  templateChipSelected: {
    borderColor: '#6D5CE8',
    backgroundColor: '#f5f3ff',
  },
  templateChipText: { fontSize: 14, fontWeight: '500' },
  templateChipTextSelected: { color: '#4c1d95' },
  publishRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  studioLink: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    backgroundColor: '#f5f3ff',
    gap: 4,
  },
  studioLinkDisabled: { opacity: 0.55 },
  studioLinkTitle: { fontSize: 14, fontWeight: '700', color: '#4c1d95' },
  studioLinkUrl: { fontSize: 12, color: '#5b21b6' },
  studioLinkHint: { fontSize: 11, opacity: 0.82, marginTop: 4 },
  submit: {
    marginTop: 16,
    backgroundColor: '#6D5CE8',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
