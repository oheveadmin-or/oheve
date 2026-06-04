import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useResponsive } from '@/hooks/use-responsive';

type ScreenLayoutProps = {
  children: ReactNode;
  /** Limite la largeur du contenu sur tablette (carte centrée) */
  constrainWidth?: boolean;
  /** Bords avec zone sûre (ex. sans 'bottom' sur un écran avec tab bar) */
  edges?: Edge[];
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/**
 * Écran plein : zones sûres (encoche, Dynamic Island, barre home) + flex.
 * Évite les tailles fixes type 390×844.
 */
export function ScreenLayout({
  children,
  constrainWidth = true,
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  contentStyle,
}: ScreenLayoutProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const { contentMaxWidth, horizontalPadding } = useResponsive();
  const maxW = constrainWidth ? contentMaxWidth : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }, style]} edges={edges}>
      {constrainWidth ? (
        <View
          style={[
            styles.inner,
            {
              maxWidth: maxW,
              width: '100%',
              alignSelf: 'center',
              paddingHorizontal: horizontalPadding,
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      ) : (
        <View style={[styles.innerFull, { paddingHorizontal: horizontalPadding }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
  },
  innerFull: {
    flex: 1,
    width: '100%',
  },
});
