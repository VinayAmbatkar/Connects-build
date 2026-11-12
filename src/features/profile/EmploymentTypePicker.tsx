import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
export type EmploymentType = 'BUSINESS_OWNER' | 'EMPLOYEE' | 'INDIVIDUAL_CONSULTANT';

export const EMPLOYMENT_TYPES: { id: EmploymentType; label: string; description: string }[] = [
  {
    id: 'BUSINESS_OWNER',
    label: 'Business owner',
    description: 'You own or run the firm. Verified with your GST registration.',
  },
  {
    id: 'EMPLOYEE',
    label: 'Employee',
    description: 'You work for a company. Verified with your company work email.',
  },
  {
    id: 'INDIVIDUAL_CONSULTANT',
    label: 'Individual consultant',
    description: 'You practise on your own. Verified from your licence and proof of consultancy.',
  },
];

/** Roles that choose an employment type -- mirrors the web Profile page and
 *  the app's KYC flow mapping (resolveKycFlow). Builders are always
 *  business owners; Consumers have none (the backend rejects one). */
export function roleUsesEmploymentType(role?: string | null): boolean {
  const value = String(role ?? '').trim().toUpperCase();
  return value === 'CONSULTANTS' || value === 'CONTRACTORS' || value === 'VENDORS';
}

type Props = {
  value?: string | null;
  /** The value as last saved -- changing away from it asks for confirmation,
   *  since it switches which verification path applies. */
  savedValue?: string | null;
  onChange: (value: EmploymentType) => void;
};

export function EmploymentTypePicker({ value, savedValue, onChange }: Props) {
  const current = String(value ?? '').toUpperCase();
  const saved = String(savedValue ?? '').toUpperCase();

  const choose = (next: EmploymentType) => {
    if (next === current) return;
    if (!saved || next === saved) {
      onChange(next);
      return;
    }
    const label = EMPLOYMENT_TYPES.find((t) => t.id === next)?.label ?? next;
    appAlert(
      'Change how you work?',
      `Switching to "${label}" changes how your profile is verified. Save your profile to apply it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change', onPress: () => onChange(next) },
      ],
    );
  };

  return (
    <View style={styles.wrap} testID="employment-type">
      <Text style={styles.label}>How do you work?</Text>
      <Text style={styles.hint}>This decides how your profile gets verified.</Text>
      {EMPLOYMENT_TYPES.map((option) => {
        const active = current === option.id;
        return (
          <Pressable
            key={option.id}
            testID={`employment-${option.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => choose(option.id)}
            style={[styles.row, active && styles.rowActive]}
          >
            <View style={styles.copy}>
              <Text style={[styles.title, active && styles.titleActive]}>{option.label}</Text>
              <Text style={styles.desc}>{option.description}</Text>
            </View>
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={active ? colors.primary : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, gap: spacing.xs },
  label: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm, color: colors.text },
  hint: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md - 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  copy: { flex: 1 },
  title: { fontFamily: typography.fontFamily.semibold, color: colors.text },
  titleActive: { color: colors.primaryDark },
  desc: { marginTop: 2, fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textSecondary },
});
