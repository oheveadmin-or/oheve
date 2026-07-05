import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C } from '@/constants/OheveTheme';

/**
 * Barre "OK" au-dessus du clavier numérique iOS.
 *
 * Les claviers decimal-pad / number-pad iOS n'ont pas de touche retour :
 * impossible de valider ou fermer le clavier sans cette barre.
 *
 * Usage :
 *   <TextInput keyboardType="decimal-pad" inputAccessoryViewID={KEYBOARD_DONE_ID} ... />
 *   ...en bas de l'écran : <KeyboardDoneBar />
 */
export const KEYBOARD_DONE_ID = 'oheve-keyboard-done';

export function KeyboardDoneBar({ label = 'OK' }: { label?: string }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={styles.bar}>
        <Pressable style={styles.btn} onPress={() => Keyboard.dismiss()} hitSlop={8}>
          <ThemedText style={styles.btnTxt}>{label}</ThemedText>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

// nativeID à poser sur les TextInput iOS ; undefined ailleurs.
export const keyboardDoneProps = Platform.OS === 'ios'
  ? { inputAccessoryViewID: KEYBOARD_DONE_ID }
  : {};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#F2F1EC',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btn: {
    backgroundColor: C.sauge,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
