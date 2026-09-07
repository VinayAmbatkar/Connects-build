import * as WebBrowser from 'expo-web-browser';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { authApi } from '@/src/api/auth';
import { getGoogleSuccessReturnUrl } from '@/src/constants/app';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const googleIcon = require('../../../assets/images/Onboarding/Google.png');

type Props = {
  onSuccess?: () => void;
};

function firstParam(url: URL, ...keys: string[]) {
  for (const key of keys) {
    const fromQuery = url.searchParams.get(key);
    if (fromQuery) return fromQuery;
    const hashMatch = url.hash.match(new RegExp(`${key}=([^&]+)`));
    if (hashMatch?.[1]) {
      try {
        return decodeURIComponent(hashMatch[1]);
      } catch {
        return hashMatch[1];
      }
    }
  }
  return null;
}

export function GoogleButton({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const { persistSession, getErrorMessage } = useAuthActions();

  const handlePress = async () => {
    setLoading(true);
    try {
      // Same entry point as the web app; backend redirects to web /auth/google-success.
      const authUrl = authApi.googleLoginUrl();
      const returnUrl = getGoogleSuccessReturnUrl();
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success' || !result.url) {
        return;
      }

      const url = new URL(result.url);
      const accessToken = firstParam(url, 'token', 'accessToken');
      const refreshToken = firstParam(url, 'refreshToken') ?? accessToken;
      const id = firstParam(url, 'id');
      const name = firstParam(url, 'name');
      const email = firstParam(url, 'email');

      if (!accessToken) {
        Alert.alert(
          'Google Sign-In',
          'Could not read tokens from the callback. Confirm the backend redirects to the web google-success page with tokens.',
        );
        return;
      }

      await persistSession({
        accessToken,
        refreshToken: refreshToken || accessToken,
        user:
          id || name || email
            ? {
                id: id ?? '',
                fullName: name ?? undefined,
                email: email ?? undefined,
              }
            : undefined,
      });
      onSuccess?.();
    } catch (error) {
      Alert.alert('Google Sign-In failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.row}>
          <Image source={googleIcon} style={styles.icon} resizeMode="contain" />
          <Text style={styles.text}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 20,
    height: 20,
  },
  text: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text,
  },
});
