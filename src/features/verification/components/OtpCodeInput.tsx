import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, typography } from '@/src/theme/tokens';
import { kyc } from '@/src/features/verification/components/kycUi';
import { OTP_LENGTH, digitsOnly } from '@/src/features/verification/kycLogic';

type Props = {
  value: string;
  onChange: (code: string) => void;
  onComplete?: () => void;
  length?: number;
  hasError?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * One real TextInput laid invisibly over the digit boxes. Unlike one input
 * per digit, this keeps SMS autofill (`oneTimeCode` / `sms-otp`), paste and
 * backspace behaving natively on both platforms.
 */
export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  length = OTP_LENGTH,
  hasError,
  autoFocus,
  editable = true,
  accessibilityLabel = 'One-time password',
  testID = 'otp-input',
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.row} accessible={false}>
      {Array.from({ length }, (_, index) => {
        const digit = value[index] ?? '';
        const isActive = focused && editable && index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.box,
              digit ? styles.boxFilled : null,
              isActive ? styles.boxActive : null,
              hasError ? styles.boxError : null,
            ]}
          >
            <Text style={styles.digit}>{digit}</Text>
            {isActive && !digit ? <View style={styles.caret} /> : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        testID={testID}
        value={value}
        onChangeText={(text) => {
          const next = digitsOnly(text, length);
          onChange(next);
          if (next.length === length) onComplete?.();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        editable={editable}
        caretHidden
        contextMenuHidden={false}
        accessibilityLabel={accessibilityLabel}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    aspectRatio: 0.86,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: kyc.tintBorder,
    backgroundColor: colors.white,
  },
  boxActive: {
    borderColor: kyc.navy,
    backgroundColor: colors.white,
    shadowColor: kyc.navy,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  boxError: {
    borderColor: kyc.danger,
  },
  digit: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  caret: {
    position: 'absolute',
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: kyc.navy,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Not 0: some Android keyboards refuse to attach to fully transparent inputs.
    opacity: 0.015,
    color: 'transparent',
  },
});
