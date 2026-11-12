import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import { authApi } from '@/src/api/auth';
import { getErrorCode } from '@/src/api/client';
import { getGoogleIosClientId, getGoogleWebClientId } from '@/src/constants/app';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
const googleIcon = require('../../../assets/images/Onboarding/Google.png');

// The native module is missing in Expo Go; importing the library there throws at load time.
const googleSigninLib: typeof import('@react-native-google-signin/google-signin') | null =
  TurboModuleRegistry.get('RNGoogleSignin') != null
    ? require('@react-native-google-signin/google-signin')
    : null;

type Props = {
  onSuccess?: () => void;
};

export function GoogleButton({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const { persistSession, getErrorMessage } = useAuthActions();

  useEffect(() => {
    const webClientId = getGoogleWebClientId();
    if (!webClientId) { console.warn('Google webClientId missing'); }
    googleSigninLib?.GoogleSignin.configure({
      webClientId,
      iosClientId: getGoogleIosClientId(),
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
  }, []);

  const handlePress = async () => {
    if (!googleSigninLib) {
      appAlert(
        'Google Sign-In',
        'Google Sign-In needs a development build and is not available in Expo Go.',
      );
      return;
    }
    if (!getGoogleWebClientId()) {
      appAlert('Google Sign-In', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set.');
      return;
    }
    const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = googleSigninLib;

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        appAlert('Google Sign-In', 'No ID token returned by Google.');
        return;
      }

      const data = await authApi.googleNativeLogin(idToken);
      await persistSession(data);
      onSuccess?.();
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (
          error.code === statusCodes.SIGN_IN_CANCELLED ||
          error.code === statusCodes.IN_PROGRESS
        ) {
          return;
        }
        if (error.code === '10') {
          // DEVELOPER_ERROR: this build's signing certificate isn't registered
          // with Google. A setup problem, not the user's -- the details go
          // to the developer log, the user gets one line.
          console.warn(
            '[GoogleSignIn] DEVELOPER_ERROR: add an Android OAuth client for package com.cobilds.com with this build\'s SHA-1 in Google Cloud; EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID must be the Web client ID.',
            getGoogleWebClientId(),
          );
          appAlert('Google Sign-In unavailable', 'Please sign in with your email and password.');
          return;
        }
      }

      // Short, specific messages for the backend's known outcomes
      // (POST /auth/google/native returns a code with each).
      switch (getErrorCode(error)) {
        case 'USER_NOT_FOUND':
          appAlert('User not found', 'No COBILDS account uses this Google email. Please sign up first.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign up', onPress: () => router.push('/(auth)/signup' as Href) },
          ]);
          return;
        case 'ACCOUNT_DEACTIVATED':
          appAlert('Account deactivated', 'This account has been deactivated.');
          return;
        case 'EMAIL_NOT_VERIFIED':
          appAlert('Verify your email', 'We sent a verification code to your email. Sign in with your email and password to finish verifying.');
          return;
      }
      if (__DEV__) console.warn('[GoogleSignIn] failed', error);
      appAlert('Google Sign-In failed', getErrorMessage(error, 'Something went wrong. Please try again.'));
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
