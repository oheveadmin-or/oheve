import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function HeaderMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <ThemedText style={styles.triggerText}>•••</ThemedText>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <Pressable
              style={styles.item}
              onPress={() => {
                setOpen(false);
                router.push('/(app)/acte-mariage' as Href);
              }}
            >
              <Ionicons name="document-text-outline" size={18} color="#3D3530" />
              <ThemedText style={styles.itemText}>Acte de mariage</ThemedText>
            </Pressable>
            <Pressable
              style={styles.item}
              onPress={() => {
                setOpen(false);
                router.push('/(app)/settings');
              }}
            >
              <Ionicons name="settings-outline" size={18} color="#3D3530" />
              <ThemedText style={styles.itemText}>Paramètres</ThemedText>
            </Pressable>
            <Pressable
              style={styles.item}
              onPress={() => {
                setOpen(false);
                router.replace('/(auth)');
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              <ThemedText style={[styles.itemText, styles.itemDanger]}>Déconnexion</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 50,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  triggerText: { color: '#A7AD9A', fontSize: 18, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.14)',
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 18,
  },
  menu: {
    width: 206,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eef2f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemText: { fontSize: 15, fontWeight: '500' },
  itemDanger: { color: '#dc2626' },
});
