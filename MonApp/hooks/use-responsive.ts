import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Dimensions réelles + seuils pour adapter l’UI (téléphones, tablettes).
 * Préféré à des largeurs/hauteurs fixes.
 */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      fontScale,
      isSmallPhone: width < 360,
      isPhone: width < 768,
      isTablet: width >= 768,
      /** Largeur max du bloc contenu (tablette centrée, téléphone pleine largeur utile) */
      contentMaxWidth: Math.min(560, width - 32),
      /** Marges latérales recommandées */
      horizontalPadding: width < 360 ? 16 : 20,
      /** Taille de police titre selon l’écran */
      titleSize: width < 360 ? 20 : width >= 768 ? 28 : 22,
      /** Taille sous-titre */
      subtitleSize: width < 360 ? 15 : width >= 768 ? 20 : 17,
      /** Logo / image : largeur max en % de l’écran, plafonnée */
      logoWidth: Math.min(280, width * 0.75),
      logoHeight: Math.min(140, width * 0.38),
    }),
    [width, height, fontScale]
  );
}
