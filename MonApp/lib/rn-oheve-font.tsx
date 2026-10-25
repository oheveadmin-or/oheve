/**
 * Remplaçant de 'react-native' pour le code de l'app (branché par metro.config.js).
 * Ré-exporte tout react-native, mais Text et TextInput reçoivent la police Oheve
 * (alias OheveSerif-* chargés dans app/_layout.tsx) quand le style n'impose pas
 * déjà une fontFamily. Ainsi chaque texte de l'app suit la charte sans toucher
 * aux écrans un par un.
 *
 * - Taille ≥ 20 : coupe « titre » (OheveSerif-*), sinon coupe « texte »
 *   (OheveSerifText-*), dessinée pour rester lisible en petit.
 * - fontWeight est converti en fichier de graisse (Regular/Medium/SemiBold) :
 *   sur Android une police chargée ne connaît pas fontWeight.
 * - Un Text imbriqué sans taille ni graisse propre hérite de son parent (pas de
 *   fontFamily ajoutée), comme le ferait React Native.
 */
import { createContext, useContext, type Ref } from 'react';
import * as RN from 'react-native';
import type { StyleProp, TextProps, TextInputProps, TextStyle } from 'react-native';

export * from 'react-native';

type Parent = { size: number; weight: string } | null;
const ParentText = createContext<Parent>(null);

const DISPLAY_MIN_SIZE = 20;
const DEFAULT_SIZE = 14;

// Un cran plus léger que la graisse demandée (les styles visaient la police
// système, plus fine) ; les titres plafonnent à Medium, comme The Seasons.
function weightFile(weight: string, display: boolean): string {
  const w = weight === 'bold' ? 700 : +weight || 400;
  if (w >= 500 && display) return 'Medium';
  if (w >= 600) return 'SemiBold';
  if (w >= 500) return 'Medium';
  return 'Regular';
}

function resolveFont(style: StyleProp<TextStyle>, parent: Parent) {
  const flat = (RN.StyleSheet.flatten(style) ?? {}) as TextStyle;
  const size = flat.fontSize ?? parent?.size ?? DEFAULT_SIZE;
  const weight = String(flat.fontWeight ?? parent?.weight ?? '400');
  if (flat.fontFamily) return { size, weight, extra: null };
  // Imbriqué et rien de propre à résoudre : on laisse hériter du parent.
  if (parent && flat.fontSize == null && flat.fontWeight == null) return { size, weight, extra: null };
  const display = size >= DISPLAY_MIN_SIZE;
  const fontFamily = `${display ? 'OheveSerif' : 'OheveSerifText'}-${weightFile(weight, display)}`;
  return { size, weight, extra: { fontFamily, fontWeight: 'normal' as const } };
}

export function Text(props: TextProps & { ref?: Ref<RN.Text> }) {
  const parent = useContext(ParentText);
  const { size, weight, extra } = resolveFont(props.style, parent);
  return (
    <ParentText.Provider value={{ size, weight }}>
      <RN.Text {...props} style={extra ? [props.style, extra] : props.style} />
    </ParentText.Provider>
  );
}

function OheveTextInput(props: TextInputProps & { ref?: Ref<RN.TextInput> }) {
  const { extra } = resolveFont(props.style, null);
  return <RN.TextInput {...props} style={extra ? [props.style, extra] : props.style} />;
}
// Statiques utilisés par certaines libs (TextInput.State…).
for (const key of Object.getOwnPropertyNames(RN.TextInput)) {
  if (!(key in OheveTextInput)) {
    try { (OheveTextInput as any)[key] = (RN.TextInput as any)[key]; } catch {}
  }
}
export const TextInput = OheveTextInput as unknown as typeof RN.TextInput;
