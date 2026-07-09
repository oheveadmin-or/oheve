import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useBoutique } from '@/contexts/boutique-context';

export default function ReelsScreen() {
  const { reels } = useBoutique();

  const handleAddReel = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour uploader un reel.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      router.push('/(boutique)/reel/new');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Mes Reels</ThemedText>
        <Pressable style={styles.addBtn} onPress={handleAddReel}>
          <Ionicons name="add" size={20} color={C.textInvert} />
        </Pressable>
      </View>

      <FlatList
        data={reels}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="play-circle-outline" size={48} color={C.textLight} />
            <ThemedText style={styles.emptyText}>Aucun reel pour l'instant</ThemedText>
            <Pressable style={styles.emptyBtn} onPress={handleAddReel}>
              <ThemedText style={styles.emptyBtnText}>Uploader mon premier reel</ThemedText>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.reelCard}>
            <View style={styles.thumb}>
              <Ionicons name="play-circle" size={36} color={C.textInvert} style={styles.playIcon} />
              <View style={styles.duration}>
                <ThemedText style={styles.durationText}>{item.duration}</ThemedText>
              </View>
            </View>
            <View style={styles.reelBody}>
              <ThemedText style={styles.reelTitle} numberOfLines={2}>{item.title}</ThemedText>
              <View style={styles.reelStats}>
                <ThemedText style={styles.reelStat}>
                  <Ionicons name="eye-outline" size={11} /> {item.views.toLocaleString('fr-FR')}
                </ThemedText>
                <ThemedText style={styles.reelStat}>
                  <Ionicons name="heart-outline" size={11} /> {item.likes}
                </ThemedText>
              </View>
              <ThemedText style={styles.reelDate}>{item.date}</ThemedText>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.textDark },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  reelCard: { flex: 1, backgroundColor: C.card, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 12 },
  thumb: { height: 140, backgroundColor: C.moka + '33', alignItems: 'center', justifyContent: 'center' },
  playIcon: { opacity: 0.85 },
  duration: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: '#00000066', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  durationText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  reelBody: { padding: 10 },
  reelTitle: { fontSize: 13, fontWeight: '600', color: C.textDark, marginBottom: 6 },
  reelStats: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  reelStat: { fontSize: 11, color: C.textLight },
  reelDate: { fontSize: 11, color: C.textLight },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.textLight },
  emptyBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md },
  emptyBtnText: { color: C.textInvert, fontWeight: '700' },
});
