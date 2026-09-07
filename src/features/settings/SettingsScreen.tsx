import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { LEGAL } from '@/src/constants/app';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuthActions();

  const name = user?.fullName?.trim() || 'Member';
  const email = user?.email?.trim() || '';

  const inviteFriends = async () => {
    try {
      await Share.share({
        message:
          'Join me on COBILDS Network — connect with construction professionals.\nhttps://connexbuild.com',
      });
    } catch {
      // User cancelled share sheet.
    }
  };

  const primaryItems: MenuItem[] = [
    {
      key: 'profile',
      label: 'Manage profile',
      icon: 'settings-outline',
      onPress: () => router.push('/edit-profile' as Href),
    },
    {
      key: 'general',
      label: 'Customize my experience',
      icon: 'options-outline',
      onPress: () => router.push('/settings/general' as Href),
    },
    {
      key: 'notifications',
      label: 'Manage notifications',
      icon: 'notifications-outline',
      onPress: () => router.push('/settings/notifications' as Href),
    },
    {
      key: 'faq',
      label: 'FAQ',
      icon: 'bulb-outline',
      onPress: () =>
        Alert.alert(
          'FAQ',
          'Visit Support to ask a question, or open Privacy Policy and Terms for account details.',
          [
            { text: 'Support', onPress: () => router.push('/support' as Href) },
            { text: 'Privacy', onPress: () => void Linking.openURL(LEGAL.privacyUrl) },
            { text: 'Close', style: 'cancel' },
          ],
        ),
    },
    {
      key: 'subscription',
      label: 'Manage subscription',
      icon: 'card-outline',
      onPress: () => router.push('/premium' as Href),
    },
    {
      key: 'bug',
      label: 'Report a bug',
      icon: 'chatbubble-ellipses-outline',
      onPress: () => router.push('/support' as Href),
    },
  ];

  const accountItems: MenuItem[] = [
    {
      key: 'privacy',
      label: 'Privacy & visibility',
      icon: 'shield-checkmark-outline',
      onPress: () => router.push('/settings/privacy' as Href),
    },
    {
      key: 'password',
      label: 'Change password',
      icon: 'key-outline',
      onPress: () => router.push('/settings/password' as Href),
    },
    {
      key: 'blocked',
      label: 'Blocked users',
      icon: 'ban-outline',
      onPress: () => router.push('/blocks' as Href),
    },
    {
      key: 'logout',
      label: 'Sign out',
      icon: 'log-out-outline',
      danger: true,
      onPress: () =>
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign out',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login');
            },
          },
        ]),
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profile}>
          <Avatar name={name} size={88} />
          <Text style={styles.name}>{name.split(' ')[0]}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>

        <View style={styles.card}>
          <Pressable style={styles.inviteRow} onPress={() => void inviteFriends()}>
            <View style={styles.inviteLeft}>
              <View style={[styles.iconWrap, styles.inviteIconWrap]}>
                <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.inviteLabel}>Invite friends</Text>
            </View>
            <LinearGradient
              colors={[colors.primaryMuted, '#FFD8B0', colors.primaryLight]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.inviteArt}
            >
              <Ionicons name="gift-outline" size={28} color={colors.primaryDark} />
            </LinearGradient>
          </Pressable>

          {primaryItems.map((item, index) => (
            <MenuRow
              key={item.key}
              item={item}
              showDivider={index < primaryItems.length - 1}
            />
          ))}
        </View>

        <View style={[styles.card, styles.cardSpaced]}>
          {accountItems.map((item, index) => (
            <MenuRow
              key={item.key}
              item={item}
              showDivider={index < accountItems.length - 1}
            />
          ))}
        </View>

        <View style={styles.legalRow}>
          <Pressable onPress={() => void Linking.openURL(LEGAL.privacyUrl)}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => void Linking.openURL(LEGAL.termsUrl)}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuRow({
  item,
  showDivider,
}: {
  item: MenuItem;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, showDivider && styles.rowDivider]}
      onPress={item.onPress}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={item.icon}
            size={18}
            color={item.danger ? colors.danger : colors.text}
          />
        </View>
        <Text style={[styles.rowLabel, item.danger && styles.rowDanger]}>
          {item.label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F5F7' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 17,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  profile: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  name: {
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    color: colors.text,
  },
  email: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardSpaced: {
    marginTop: spacing.md,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 72,
  },
  inviteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inviteLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  inviteIconWrap: {
    backgroundColor: colors.primaryMuted,
  },
  inviteArt: {
    width: 64,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    color: colors.text,
  },
  rowDanger: {
    color: colors.danger,
  },
  legalRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  legalDot: {
    color: colors.textMuted,
  },
});
