import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { colors, spacing, typography } from '@/src/theme/tokens';

const BRAND = '#F57D01';

export function SignupAccountFooter() {
  return (
    <View style={styles.wrap}>
      <View style={styles.loginRow}>
        <View style={styles.line} />
        <View style={styles.loginCopy}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </Link>
        </View>
        <View style={styles.line} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  loginCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  loginPrompt: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  loginLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: BRAND,
  },
});
