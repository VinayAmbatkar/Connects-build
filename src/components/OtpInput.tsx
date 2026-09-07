import { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  length?: number;
  value: string;
  onChange: (code: string) => void;
};

export function OtpInput({ length = 6, value, onChange }: Props) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const [focused, setFocused] = useState(0);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const updateAt = (index: number, char: string) => {
    const next = digits.map((d, i) => (i === index ? char : d));
    onChange(next.join('').slice(0, length));
  };

  const onKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      updateAt(index - 1, '');
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputs.current[index] = ref;
          }}
          value={digit}
          keyboardType="number-pad"
          maxLength={1}
          style={[styles.box, focused === index && styles.boxFocused]}
          onFocus={() => setFocused(index)}
          onChangeText={(text) => {
            const char = text.replace(/\D/g, '').slice(-1);
            updateAt(index, char);
            if (char && index < length - 1) {
              inputs.current[index + 1]?.focus();
            }
          }}
          onKeyPress={(e) => onKeyPress(index, e)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: 'center',
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.text,
    backgroundColor: colors.white,
  },
  boxFocused: {
    borderColor: colors.primary,
  },
});
