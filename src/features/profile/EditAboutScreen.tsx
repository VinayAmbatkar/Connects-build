import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingState } from '@/src/components/EmptyState';
import { getErrorMessage } from '@/src/api/client';
import { profileApi } from '@/src/api/profile';
import { BIO_MAX_LENGTH } from '@/src/features/profile/profileSkills';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const BIO_BOX_MIN_HEIGHT = 280;
const BIO_INPUT_MIN_HEIGHT = 180;

export function EditAboutScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [bio, setBio] = useState('');

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: profileApi.getMine,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setBio(String(profileQuery.data.bio ?? ''));
    }
  }, [profileQuery.data]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });

    return () => showSub.remove();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const profile = profileQuery.data ?? {};
      return profileApi.save({
        ...profile,
        bio: bio.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      Alert.alert('Saved', 'Your about section was updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => Alert.alert('Save failed', getErrorMessage(error)),
  });

  if (profileQuery.isLoading) return <LoadingState />;

  const counterLabel = `${bio.length.toLocaleString()}/${BIO_MAX_LENGTH.toLocaleString()}`;
  const headerOffset = insets.top + (Platform.OS === 'ios' ? 44 : 56);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerOffset}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          You can write about your years of experience, industry, or skills. People also talk
          about their achievements or previous job experiences.
        </Text>

        <View style={styles.bioBox}>
          <TextInput
            value={bio}
            onChangeText={(value) => setBio(value.slice(0, BIO_MAX_LENGTH))}
            onFocus={() => {
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              });
            }}
            multiline
            scrollEnabled
            textAlignVertical="top"
            placeholder="Write your bio..."
            placeholderTextColor={colors.textMuted}
            style={styles.bioInput}
          />

          <View style={styles.boxFooter}>
            <View style={styles.divider} />
            <Text style={styles.counter}>{counterLabel}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
            saveMutation.isPending && styles.saveBtnDisabled,
          ]}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  hint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  bioBox: {
    minHeight: BIO_BOX_MIN_HEIGHT,
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  bioInput: {
    minHeight: BIO_INPUT_MIN_HEIGHT,
    maxHeight: 360,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    lineHeight: 24,
    color: colors.text,
  },
  boxFooter: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  counter: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  saveBtn: {
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  saveBtnPressed: {
    opacity: 0.92,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.white,
  },
});
