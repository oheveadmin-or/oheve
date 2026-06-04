import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';

type PremiumCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function PremiumCard({ children, style }: PremiumCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, subtitle, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      <View>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
      </View>
      {actionLabel && onActionPress ? (
        <ThemedText style={styles.action} onPress={onActionPress}>
          {actionLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

type DonutProps = {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label: string;
};

export function DonutProgress({
  progress,
  size = 72,
  stroke = 8,
  color = C.sauge,
  trackColor = C.saugePale,
  label,
}: DonutProps) {
  const safeProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="transparent" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerLabel}>
        <ThemedText style={styles.centerLabelText}>{label}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    backgroundColor: C.card,
    borderWidth: 0,
    borderColor: C.border,
    padding: 18,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  headerWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: C.textDark },
  subtitle: { fontSize: 12, color: C.textLight, marginTop: 2 },
  action: { fontSize: 13, color: C.sauge, fontWeight: '700' },
  centerLabel: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelText: { fontSize: 12, fontWeight: '700', color: C.saugeDark },
});
