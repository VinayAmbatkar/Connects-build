import { type ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import { formatRetryAfter, type AttemptState, DEFAULT_ATTEMPTS } from '@/src/features/verification/kycLogic';

/** Trust palette for verification surfaces -- the same navy as the
 *  verified shield on My Profile. */
export const kyc = {
  navy: '#1E3A8A',
  navyDeep: '#172554',
  indigo: '#4F46E5',
  tint: '#EEF2FF',
  tintBorder: '#C7D2FE',
  success: colors.success,
  successTint: '#DCFCE7',
  danger: colors.danger,
  dangerTint: '#FEF2F2',
  warning: '#B45309',
  warningTint: '#FFFBEB',
} as const;

type IconName = keyof typeof Ionicons.glyphMap;

export function FadeInView({
  children,
  style,
  delay = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function KycCard({
  icon,
  title,
  subtitle,
  badge,
  children,
  testID,
}: {
  icon?: IconName;
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  children?: ReactNode;
  testID?: string;
}) {
  return (
    <FadeInView style={styles.card} >
      <View testID={testID}>
        {title ? (
          <View style={styles.cardHead}>
            {icon ? (
              <View style={styles.iconTile}>
                <Ionicons name={icon} size={22} color={kyc.navy} />
              </View>
            ) : null}
            <View style={styles.cardHeadText}>
              <Text style={styles.cardTitle} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
            </View>
            {badge}
          </View>
        ) : null}
        {children}
      </View>
    </FadeInView>
  );
}

export function KycButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  testID,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'link';
  icon?: IconName;
  testID?: string;
}) {
  const inactive = disabled || loading;
  const textColor = variant === 'primary' ? colors.white : kyc.navy;
  const content = (
    <View style={styles.btnInner}>
      {loading ? <ActivityIndicator size="small" color={textColor} /> : null}
      <Text style={[styles.btnText, { color: textColor }, variant === 'link' && styles.linkText]}>
        {title}
      </Text>
      {icon && !loading ? <Ionicons name={icon} size={18} color={textColor} /> : null}
    </View>
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        variant === 'link' ? styles.linkBtn : styles.btn,
        variant === 'secondary' && styles.btnSecondary,
        pressed && !inactive && styles.btnPressed,
        inactive && variant !== 'link' && styles.btnDisabled,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={inactive ? ['#94A3B8', '#94A3B8'] : [kyc.navy, kyc.indigo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

export function StatusPill({ label, tone = 'success' }: { label: string; tone?: 'success' | 'pending' }) {
  const success = tone === 'success';
  return (
    <View style={[styles.pill, { backgroundColor: success ? kyc.successTint : kyc.warningTint }]}>
      <Ionicons
        name={success ? 'checkmark-circle' : 'time-outline'}
        size={14}
        color={success ? kyc.success : kyc.warning}
      />
      <Text style={[styles.pillText, { color: success ? kyc.success : kyc.warning }]}>{label}</Text>
    </View>
  );
}

export function Banner({
  tone,
  message,
  testID,
}: {
  tone: 'error' | 'info' | 'warning';
  message: string;
  testID?: string;
}) {
  const palette =
    tone === 'error'
      ? { bg: kyc.dangerTint, fg: kyc.danger, icon: 'alert-circle' as const }
      : tone === 'warning'
        ? { bg: kyc.warningTint, fg: kyc.warning, icon: 'time-outline' as const }
        : { bg: kyc.tint, fg: kyc.navy, icon: 'information-circle' as const };
  return (
    <View
      testID={testID}
      style={[styles.banner, { backgroundColor: palette.bg }]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

/** Shown once an attempt has been used, or while locked out. */
export function AttemptNotice({ attempts, label = 'Attempts remaining' }: { attempts: AttemptState; label?: string }) {
  if (attempts.remaining >= DEFAULT_ATTEMPTS && !attempts.retryAfter) return null;
  const retry = attempts.remaining === 0 ? formatRetryAfter(attempts.retryAfter) : null;
  return (
    <View style={styles.attempts} testID="attempt-notice">
      <Text style={styles.attemptsText}>
        {label}: <Text style={styles.attemptsCount}>{attempts.remaining}</Text>
      </Text>
      {retry ? <Text style={styles.attemptsRetry}>{retry}</Text> : null}
    </View>
  );
}

export function DetailRow({ label, value, verified }: { label: string; value?: string | null; verified?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueWrap}>
        <Text style={styles.detailValue}>{value}</Text>
        {verified ? <Ionicons name="checkmark-circle" size={16} color={kyc.success} /> : null}
      </View>
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      <Text style={styles.required}> *</Text>
    </Text>
  );
}

export const fieldStyles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.text,
  },
  inputFocused: {
    borderColor: kyc.navy,
    backgroundColor: '#FBFCFF',
  },
  hint: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  gap: {
    gap: spacing.md,
  },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md - 4,
    marginBottom: spacing.md,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: kyc.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadText: { flex: 1 },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md + 1,
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: kyc.tintBorder,
    backgroundColor: kyc.tint,
  },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  btnDisabled: { opacity: 0.75 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md - 1,
  },
  linkBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  linkText: {
    fontSize: typography.size.sm,
    textDecorationLine: 'underline',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md - 4,
    borderRadius: radius.md,
  },
  bannerText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm - 1,
    lineHeight: 19,
  },
  attempts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  attemptsText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  attemptsCount: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  attemptsRetry: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: kyc.warning,
  },
  detailRow: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
  },
  detailLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValueWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailValue: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  fieldLabel: {
    marginBottom: spacing.xs + 2,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  required: { color: kyc.danger },
});
