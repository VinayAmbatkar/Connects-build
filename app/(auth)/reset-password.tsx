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

export default function ResetPasswordScreen() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token.trim() || !newPassword) {
      Alert.alert('Missing info', 'Enter the reset token and a new password.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token.trim(), newPassword);
      Alert.alert('Password updated', 'You can sign in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error) {
      Alert.alert('Reset failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset password</Text>
        <TextField
          label="Reset token"
          value={token}
          onChangeText={setToken}
          placeholder="Paste token from email"
        />
        <TextField
          label="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Button title="Update password" onPress={submit} loading={loading} />
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
    marginBottom: spacing.lg,
  },
  taglineFooter: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
});
