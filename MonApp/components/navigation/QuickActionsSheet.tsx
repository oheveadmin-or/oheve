import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';

type QuickActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const ACTIONS = [
  { label: 'Prestataires', icon: 'people-outline', route: '/(app)/(tabs)/providers' },
  { label: 'To-do', icon: 'checkbox-outline', route: '/(app)/(tabs)/todo' },
  { label: 'Invités', icon: 'person-add-outline', route: '/(app)/(tabs)/guests' },
  { label: 'Budget', icon: 'wallet-outline', route: '/(app)/(tabs)/budget' },
  { label: 'Site Mariage', icon: 'globe-outline', route: '/(app)/wedding-card' },
  { label: 'Placement de table', icon: 'grid-outline', route: '/(app)/seating-plan' },
] as const;

export function QuickActionsSheet({ visible, onClose }: QuickActionsSheetProps) {
  const { user } = useAuth();
  const actions = user?.role === 'admin'
    ? [{ label: 'Panneau Admin', icon: 'shield-checkmark-outline' as const, route: '/(app)/admin' }, ...ACTIONS]
    : ACTIONS;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.content}>
          <ThemedText style={styles.title}>Ajouter rapidement</ThemedText>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => {
                onClose();
                router.push(action.route as never);
              }}
            >
              <View style={styles.itemLeft}>
                <View style={styles.iconDot}>
                  <Ionicons name={action.icon} size={16} color={C.sauge} />
                </View>
                <ThemedText style={styles.itemLabel}>{action.label}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A09890" />
            </Pressable>
          ))}
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <ThemedText style={styles.cancelText}>Fermer</ThemedText>
          </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(61,53,48,0.35)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: C.moka,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: C.taupe,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  content: { paddingHorizontal: 18, paddingBottom: 18, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6, color: C.textDark },
  item: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
  },
  itemPressed: { opacity: 0.85 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.saugePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontSize: 16, fontWeight: '500', color: C.textDark },
  cancelBtn: {
    borderRadius: 14,
    backgroundColor: C.beige,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 4,
  },
  cancelText: { color: C.textMid, fontSize: 16, fontWeight: '700' },
});
