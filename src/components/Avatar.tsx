import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '@/src/theme/tokens';

type Props = {
  name?: string;
  size?: number;
};

export function Avatar({ name = '?', size = 48 }: Props) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  text: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primaryDark,
  },
});
