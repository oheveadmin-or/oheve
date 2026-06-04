import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { C } from '@/constants/OheveTheme';

type FloatingActionButtonProps = {
  onPress: () => void;
};

export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          onPress();
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  button: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.sauge,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.moka,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: C.taupe,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
