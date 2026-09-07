import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/Button';
import { BrandTaglineFooter } from '@/src/components/BrandTaglineFooter';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

export default function SignupSuccessScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.title}>Profile Created Successfully!</Text>
        <Text style={styles.subtitle}>
          Complete your professional profile or explore COBILDS first.
        </Text>
        <Button
          title="Complete My Profile"
          onPress={() => router.replace('/edit-profile')}
        />
        <Button
          title="Explore COBILDS"
          variant="outline"
          onPress={() => router.replace('/(tabs)/feed?tour=1')}
          style={styles.secondary}
        />
        <View style={styles.taglineFooter}>
          <BrandTaglineFooter />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  check: {
    fontSize: 36,
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  secondary: { marginTop: spacing.sm },
  taglineFooter: {
    marginTop: spacing.xl,
  },
});
