import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/Button';
import { BrandTaglineFooter } from '@/src/components/BrandTaglineFooter';
import { TextField } from '@/src/components/TextField';
import { authApi } from '@/src/api/auth';
import { getErrorMessage } from '@/src/api/client';
import { colors, spacing, typography } from '@/src/theme/tokens';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter the email for your account.');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      Alert.alert(
        'Check your email',
        'If an account exists, we sent a password reset link.',
        [{ text: 'OK', onPress: () => router.push('/(auth)/reset-password') }],
      );
    } catch (error) {
      Alert.alert('Request failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send reset instructions.
        </Text>
        <TextField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Button title="Send reset email" onPress={submit} loading={loading} />
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <View style={styles.taglineFooter}>
          <BrandTaglineFooter />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  taglineFooter: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
});
