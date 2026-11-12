import { forwardRef, type ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  required?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  labelSuffix?: string;
  inputRowStyle?: StyleProp<ViewStyle>;
};

export const TextField = forwardRef<TextInput, Props>(
  (
    {
      label,
      error,
      required,
      leftAddon,
      rightAddon,
      style,
      labelSuffix,
      inputRowStyle,
      ...props
    },
    ref,
  ) => {
    return (
      <View style={styles.wrap}>
        {label ? (
          <Text style={styles.label}>
            {label}
            {labelSuffix ? <Text style={styles.labelSuffix}>{labelSuffix}</Text> : null}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
        ) : null}
        <View style={[styles.inputRow, inputRowStyle, error ? styles.inputError : null]}>
          {leftAddon}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, style]}
            {...props}
          />
          {rightAddon}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.danger,
    fontFamily: typography.fontFamily.semibold,
  },
  labelSuffix: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
  },
  inputRow: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
    color: colors.danger,
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
  },
});
