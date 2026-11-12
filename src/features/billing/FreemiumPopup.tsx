import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/authStore';
import { setFreemiumQueryClient, useFreemiumStore } from '@/src/features/billing/freemiumStore';
import { FreemiumCelebration } from '@/src/features/billing/FreemiumCelebration';

/**
 * Freemium UI, mounted once in the root layout:
 *  - the popup for "Claim it free" / "View plans" offers and server nudges
 *    ("Keep your connections alive"), all text from the backend;
 *  - a short confirmation banner after claiming;
 *  - nudge checks when signed in and whenever the app returns to the
 *    foreground (throttled in the store).
 */
export function FreemiumBridge() {
  const queryClient = useQueryClient();
  const signedIn = useAuthStore((s) => Boolean(s.accessToken));
  const checkNudges = useFreemiumStore((s) => s.checkNudges);

  useEffect(() => {
    setFreemiumQueryClient(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (!signedIn) return;
    // Give the first screen a moment so the popup doesn't race navigation.
    const t = setTimeout(() => void checkNudges(true), 2500);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkNudges();
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [signedIn, checkNudges]);

  return (
    <>
      <FreemiumPopupModal />
      <FreemiumCelebration />
      <FreemiumNoticeBanner />
    </>
  );
}

function FreemiumPopupModal() {
  const popup = useFreemiumStore((s) => s.popup);
  const claiming = useFreemiumStore((s) => s.claiming);
  const act = useFreemiumStore((s) => s.act);
  const dismiss = useFreemiumStore((s) => s.dismiss);

  const isClaim = popup?.ctaAction === 'CLAIM';
  const showCta = !!popup?.ctaLabel && (popup.ctaAction === 'CLAIM' || popup.ctaAction === 'OPEN_PLANS');
  const icon = isClaim ? 'gift-outline' : popup?.source === 'nudge' ? 'people-outline' : 'lock-closed-outline';

  return (
    <Modal visible={!!popup} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={dismiss} accessibilityLabel={popup?.dismissLabel || 'Close'}>
        <Pressable style={[styles.panel, isClaim && styles.panelClaim]} onPress={() => undefined} accessibilityViewIsModal>
          {popup ? (
            <>
              <View style={styles.iconWrap}>
                <Ionicons name={icon} size={28} color={colors.primaryDark} />
              </View>
              <Text style={styles.title} accessibilityRole="header">{popup.title}</Text>
              {popup.message ? <Text style={styles.message}>{popup.message}</Text> : null}
              {popup.quote ? (
                <View style={styles.quote}>
                  <Text style={styles.quoteText}>“{popup.quote}”</Text>
                </View>
              ) : null}
              <View style={styles.actions}>
                {showCta ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={claiming}
                    onPress={() => void act()}
                    style={({ pressed }) => [styles.primaryBtn, (pressed || claiming) && styles.dim]}
                  >
                    {claiming ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{popup.ctaLabel}</Text>}
                  </Pressable>
                ) : null}
                {popup.dismissLabel ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={claiming}
                    onPress={dismiss}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.dim]}
                  >
                    <Text style={styles.secondaryText}>{popup.dismissLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FreemiumNoticeBanner() {
  const notice = useFreemiumStore((s) => s.notice);
  const clear = useFreemiumStore((s) => s.clearNotice);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notice) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => clear());
    }, 4000);
    return () => clearTimeout(t);
  }, [notice, opacity, clear]);

  if (!notice) return null;
  const ok = notice.kind === 'success';
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.noticeWrap, { top: insets.top + spacing.sm, opacity }]}
      accessibilityLiveRegion="polite"
    >
      <Pressable onPress={clear} style={[styles.notice, ok ? styles.noticeOk : styles.noticeErr]}>
        <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={colors.white} />
        <Text style={styles.noticeText}>{notice.text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.overlay,
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  panelClaim: {
    borderTopWidth: 4,
    borderTopColor: colors.primary,
  },
  iconWrap: {
    width: 56,
    height: 56,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  title: {
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quote: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  quoteText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    fontStyle: 'italic',
    color: colors.text,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  secondaryText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  dim: { opacity: 0.7 },
  noticeWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 480,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  noticeOk: { backgroundColor: colors.success },
  noticeErr: { backgroundColor: colors.danger },
  noticeText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
});
