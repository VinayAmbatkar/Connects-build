import { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { AppSideDrawer } from '@/src/components/AppSideDrawer';
import { LogoMark } from '@/src/features/onboarding/LogoMark';
import { messagesApi } from '@/src/api/messages';
import { notificationsApi } from '@/src/api/notifications';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  /** Show the search row (default true). */
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onFilterPress?: () => void;
};

type MenuAnchor = { top: number; right: number };

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function AppHeader({
  showSearch = true,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onFilterPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profileBtnRef = useRef<View>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor>({
    top: 0,
    right: spacing.md,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages-unread'],
    queryFn: messagesApi.unreadCount,
    refetchInterval: 60_000,
  });

  const notifCount = Number(notificationsQuery.data?.count ?? 0);
  const messageCount = Number(messagesQuery.data?.count ?? 0);

  const openSearch = () => {
    if (onSearchSubmit) {
      onSearchSubmit();
      return;
    }
    router.push('/search');
  };

  const openProfileMenu = () => {
    profileBtnRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      setMenuAnchor({
        top: y + height + 2,
        right: Math.max(8, screenWidth - (x + width)),
      });
      setProfileMenuOpen(true);
    });
  };

  const goFromMenu = (href: Href) => {
    setProfileMenuOpen(false);
    router.push(href);
  };

  return (
    <>
      <View style={[styles.wrap, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <View style={styles.topRow}>
          <Pressable
            style={styles.brand}
            onPress={() => setDrawerOpen(true)}
            accessibilityLabel="Open menu"
            hitSlop={6}
          >
            <LogoMark size={36} />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>COBILDS</Text>
              <Text style={styles.brandSub}>NETWORK</Text>
            </View>
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push('/notifications')}
              hitSlop={6}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              <Badge count={notifCount} />
            </Pressable>

            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push('/(tabs)/messages')}
              hitSlop={6}
              accessibilityLabel="Messages"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={23} color={colors.text} />
              <Badge count={messageCount} />
            </Pressable>

            <View ref={profileBtnRef} collapsable={false}>
              <Pressable
                style={styles.profileBtn}
                onPress={openProfileMenu}
                hitSlop={6}
                accessibilityLabel="Profile menu"
              >
                <Avatar name={user?.fullName ?? 'You'} size={34} />
                <Ionicons
                  name={profileMenuOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {showSearch ? (
          <Pressable
            style={styles.searchBar}
            onPress={onSearchChange ? undefined : openSearch}
          >
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            {onSearchChange ? (
              <TextInput
                style={styles.searchInput}
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder="Search posts, people, companies..."
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                onSubmitEditing={openSearch}
              />
            ) : (
              <Text style={styles.searchPlaceholder} numberOfLines={1}>
                Search posts, people, companies...
              </Text>
            )}
            <Pressable
              onPress={onFilterPress ?? openSearch}
              hitSlop={8}
              accessibilityLabel="Search filters"
            >
              <Ionicons name="options-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={profileMenuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setProfileMenuOpen(false)}
      >
        <View style={styles.menuRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setProfileMenuOpen(false)}
          />
          <View
            style={[
              styles.menuCard,
              { top: menuAnchor.top, right: menuAnchor.right },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => goFromMenu('/(tabs)/profile')}
            >
              <Ionicons name="person-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>My Profile</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => goFromMenu('/settings')}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AppSideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
    zIndex: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  brandCopy: {
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  brandSub: {
    marginTop: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1.6,
    includeFontPadding: false,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 9,
    color: colors.white,
    includeFontPadding: false,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 2,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  menuRoot: {
    flex: 1,
  },
  menuCard: {
    position: 'absolute',
    minWidth: 168,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    color: colors.text,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
