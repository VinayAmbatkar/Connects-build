import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { LogoMark } from '@/src/features/onboarding/LogoMark';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const NAV_ITEMS: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
}> = [
  { label: 'Home', icon: 'home-outline', href: '/(tabs)/feed' },
  { label: 'Discover', icon: 'search-outline', href: '/(tabs)/vendors' },
  { label: 'Network', icon: 'people-circle-outline', href: '/(tabs)/connect' as Href },
  { label: 'Connection', icon: 'people-outline', href: '/(tabs)/network' },
  { label: 'Messages', icon: 'chatbubble-ellipses-outline', href: '/(tabs)/messages' },
  { label: 'My Profile', icon: 'person-outline', href: '/(tabs)/profile' },
];

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);
const OPEN_MS = 260;
const CLOSE_MS = 220;

export function AppSideDrawer({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(visible);
  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      slideX.setValue(-DRAWER_WIDTH);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: OPEN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: OPEN_MS,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!mounted || closingRef.current) return;

    closingRef.current = true;
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: -DRAWER_WIDTH,
        duration: CLOSE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: CLOSE_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        closingRef.current = false;
      }
    });
  }, [visible, mounted, slideX, backdropOpacity]);

  const requestClose = () => {
    if (closingRef.current) return;
    onClose();
  };

  const go = (href: Href) => {
    requestClose();
    // Let the drawer start closing, then navigate.
    setTimeout(() => router.push(href), CLOSE_MS);
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              paddingTop: Math.max(insets.top, spacing.md),
              paddingBottom: Math.max(insets.bottom, spacing.md),
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.brand}>
              <LogoMark size={34} />
              <View>
                <Text style={styles.brandName}>COBILDS</Text>
                <Text style={styles.brandSub}>NETWORK</Text>
              </View>
            </View>
            <Pressable onPress={requestClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <Pressable style={styles.userRow} onPress={() => go('/(tabs)/profile')}>
            <Avatar name={user?.fullName ?? 'You'} size={44} />
            <View style={styles.userCopy}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName ?? 'Your profile'}
              </Text>
              {user?.role ? (
                <Text style={styles.userRole} numberOfLines={1}>
                  {user.role}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                style={styles.navItem}
                onPress={() => go(item.href)}
              >
                <Ionicons name={item.icon} size={20} color={colors.text} />
                <Text style={styles.navLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.bottom}>
            <View style={styles.growCard}>
              <View style={styles.growIcon}>
                <Ionicons name="people" size={18} color={colors.primary} />
              </View>
              <Text style={styles.growTitle}>Grow Your Network</Text>
              <Text style={styles.growBody}>
                Connect with industry professionals and unlock new opportunities.
              </Text>
              <Pressable
                style={styles.findBtn}
                onPress={() => go('/(tabs)/connect' as Href)}
              >
                <Text style={styles.findBtnText}>Find People</Text>
              </Pressable>
            </View>

            <Pressable style={styles.settingsRow} onPress={() => go('/settings')}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
              <Text style={styles.settingsLabel}>Settings</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 0 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.text,
  },
  brandSub: {
    marginTop: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 1.4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  userCopy: { flex: 1 },
  userName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  userRole: {
    marginTop: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  nav: {
    flex: 1,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  navLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  bottom: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  growCard: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  growIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  growTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  growBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  findBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.white,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  settingsLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
});
