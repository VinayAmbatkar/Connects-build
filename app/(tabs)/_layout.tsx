import { useEffect } from 'react';
import { Redirect, Tabs, router, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messagesApi } from '@/src/api/messages';
import { profileApi } from '@/src/api/profile';
import { isConsumerRole } from '@/src/features/profile/profileLocks';
import { ONBOARDING_EDIT_PROFILE } from '@/src/features/profile/profileGate';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedTabBar } from '@/src/components/AnimatedTabBar';
import { ConnectTabIcon } from '@/src/components/ConnectTabIcon';
import { AppHeader } from '@/src/components/AppHeader';
import { useAuthStore } from '@/src/store/authStore';
import { colors, typography } from '@/src/theme/tokens';

const GATED_TAB_PATHS = ['/feed', '/vendors', '/connect', '/network', '/messages'];

export default function TabsLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  // Unread messages show on the Messages tab (the header no longer has a
  // messages button -- the bottom bar is the one place for it).
  const unreadQuery = useQuery({
    queryKey: ['messages-unread'],
    queryFn: messagesApi.unreadCount,
    refetchInterval: 60_000,
    enabled: Boolean(accessToken),
  });
  const unread = Number(unreadQuery.data?.count ?? 0);

  // Profile gate: a professional who hasn't saved their professional
  // details and role & expertise is sent to Edit Profile (which explains
  // why) instead of a feed that can only say "unavailable". The Profile
  // tab stays open so Settings / log out are always reachable. Consumers
  // are never gated.
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: profileApi.getMine,
    enabled: Boolean(accessToken),
  });
  const profile = profileQuery.data;
  const mustCompleteProfile =
    !!profile &&
    !isConsumerRole(profile.role ?? user?.role) &&
    profile.profileComplete === false;
  // Only the tabs whose features the backend gates -- not Profile, and not
  // stack screens (this layout stays mounted under Edit Profile itself).
  const onGatedTab = GATED_TAB_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  useEffect(() => {
    if (mustCompleteProfile && onGatedTab) router.push(ONBOARDING_EDIT_PROFILE);
  }, [mustCompleteProfile, onGatedTab, pathname]);

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        header: () => <AppHeader />,
        headerShown: true,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.semibold,
          color: colors.text,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: 10,
        },
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.white,
        },
      }}
    >
      <Tabs.Screen
        name="feed/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="vendors/index"
        options={{
          title: 'Discover',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect/index"
        options={{
          title: 'Connect',
          header: () => <AppHeader showSearch={false} />,
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <ConnectTabIcon color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="network/index"
        options={{
          title: 'My Connections',
          header: () => <AppHeader showSearch={false} />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          headerShown: false,
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          headerShown: false,
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
