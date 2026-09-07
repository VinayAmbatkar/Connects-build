import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { TextField } from '@/src/components/TextField';
import { authApi } from '@/src/api/auth';
import { getErrorMessage } from '@/src/api/client';
import { colors, spacing, typography } from '@/src/theme/tokens';

function passwordErrors(value: string) {
  return {
    tooShort: value.length < 8,
    tooLong: value.length > 12,
    noUpper: !/[A-Z]/.test(value),
    noLower: !/[a-z]/.test(value),
    noNumber: !/[0-9]/.test(value),
    noSpecial: !/[^A-Za-z0-9]/.test(value),
  };
}

export function SettingsPasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const req = useMemo(() => passwordErrors(newPassword), [newPassword]);
  const unmet = Object.values(req).some(Boolean);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your password was changed successfully.');
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const submit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing fields', 'Fill in all password fields.');
      return;
    }
    if (unmet) {
      Alert.alert(
        'Weak password',
        'Use 8–12 characters with upper, lower, number, and special character.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Same password', 'Choose a password different from your current one.');
      return;
    }
    mutation.mutate();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TextField
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextField
        label="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        maxLength={12}
      />
      {newPassword ? (
        <View style={styles.hints}>
          {req.tooShort ? <Text style={styles.hint}>At least 8 characters</Text> : null}
          {req.tooLong ? <Text style={styles.hint}>Max 12 characters</Text> : null}
          {req.noUpper ? <Text style={styles.hint}>One uppercase letter</Text> : null}
          {req.noLower ? <Text style={styles.hint}>One lowercase letter</Text> : null}
          {req.noNumber ? <Text style={styles.hint}>One number</Text> : null}
          {req.noSpecial ? <Text style={styles.hint}>One special character</Text> : null}
        </View>
      ) : null}
      <TextField
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <Button
        title="Update password"
        onPress={submit}
        loading={mutation.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F5F7' },
  content: { padding: spacing.md },
  hints: { marginBottom: spacing.md, gap: 4 },
  hint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.danger,
  },
});
