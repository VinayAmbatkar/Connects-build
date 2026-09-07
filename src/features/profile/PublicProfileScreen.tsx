import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { ErrorState, LoadingState } from '@/src/components/EmptyState';
import { getErrorMessage } from '@/src/api/client';
import { blocksApi } from '@/src/api/blocks';
import { connectionsApi } from '@/src/api/connections';
import { messagesApi } from '@/src/api/messages';
import { profileApi } from '@/src/api/profile';
import { projectsApi } from '@/src/api/projects';
import { ProfileActivitySection } from '@/src/features/profile/ProfileActivitySection';
import {
  ProfileContentTabs,
  type ProfileContentTab,
} from '@/src/features/profile/ProfileContentTabs';
import { ProfileSectionCard } from '@/src/features/profile/ProfileSectionCard';
import { RoleExpertiseSection } from '@/src/features/profile/RoleExpertiseSection';
import { TopSkillsCard } from '@/src/features/profile/TopSkillsCard';
import { formatAboutPreview } from '@/src/features/profile/profileFormat';
import {
  normalizeOptions,
  normalizeProfileIds,
  resolveOptionLabel,
} from '@/src/features/profile/profileOptions';
import { getTopSkillLabels } from '@/src/features/profile/profileSkills';
import { useAuthStore } from '@/src/store/authStore';
import type { Connection, ProfessionalProfile, Project } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const LINKEDIN_BLUE = '#0A66C2';
const PROFILE_BG = '#F3F2EF';

type Props = {
  userId: string;
};

function unwrapProjects(data: unknown): Project[] {
  if (Array.isArray(data)) return data as Project[];
  if (data && typeof data === 'object') {
    const body = data as { projects?: Project[] };
    if (Array.isArray(body.projects)) return body.projects;
  }
  return [];
}

function buildLocation(profile?: ProfessionalProfile | null) {
  const ids = normalizeProfileIds((profile as Record<string, unknown>) ?? {});
  void ids;
  return profile?.serviceLocations?.filter(Boolean).join(', ');
}

function projectImage(project: Project) {
  const photos = (project as { photoUrls?: string[]; photos?: string[] }).photoUrls
    ?? project.photos;
  return Array.isArray(photos) && photos[0] ? String(photos[0]) : undefined;
}

function connectionStatusOf(item: Connection) {
  return String(item.status ?? '').toUpperCase();
}

function isIncomingPending(
  item: Connection,
  myId?: string | number | null,
) {
  const status = connectionStatusOf(item);
  if (status !== 'PENDING' && status !== 'REQUESTED') return false;
  if (String(item.direction ?? '').toLowerCase() === 'incoming') return true;
  if (String(item.direction ?? '').toLowerCase() === 'outgoing') return false;
  if (myId == null) return true;
  return String(item.recipientId ?? '') === String(myId);
}

export function PublicProfileScreen({ userId }: Props) {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const myId =
    me?.id ?? (me as { userId?: string | number } | null)?.userId ?? null;
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [contentTab, setContentTab] = useState<ProfileContentTab>('overview');
  const scrollRef = useRef<ScrollView>(null);

  const changeTab = (tab: ProfileContentTab) => {
    setContentTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const profileQuery = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => profileApi.getPublic(userId),
    enabled: Boolean(userId),
  });

  const optionsQuery = useQuery({
    queryKey: ['profile-options'],
    queryFn: profileApi.options,
    staleTime: 5 * 60_000,
  });

  const projectsQuery = useQuery({
    queryKey: ['public-projects', userId],
    queryFn: () => projectsApi.listByUser(userId),
    enabled: Boolean(userId),
  });

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
  });

  const isOwnProfile =
    String(me?.id ?? '') === String(userId) ||
    String((me as { userId?: string | number } | null)?.userId ?? '') ===
      String(userId);

  const matchedConnection = useMemo(() => {
    const list = Array.isArray(connectionsQuery.data) ? connectionsQuery.data : [];
    return (
      list.find((c) => {
        const ids = [
          c.otherPartyId,
          c.userId,
          c.recipientId,
          c.requesterId,
        ].map((id) => String(id ?? ''));
        return ids.includes(String(userId));
      }) ?? null
    );
  }, [connectionsQuery.data, userId]);

  const connectionStatus = connectionStatusOf(
    matchedConnection ?? ({} as Connection),
  );
  const isIncomingRequest = matchedConnection
    ? isIncomingPending(matchedConnection, myId)
    : false;

  const connectMutation = useMutation({
    mutationFn: () => connectionsApi.send(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      Alert.alert('Request sent', 'Connection request sent.');
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const acceptMutation = useMutation({
    mutationFn: () => {
      if (!matchedConnection?.id) {
        return Promise.reject(new Error('Missing connection id'));
      }
      return connectionsApi.accept(matchedConnection.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      Alert.alert('Connected', 'Connection request accepted.');
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const messageMutation = useMutation({
    mutationFn: () => messagesApi.startConversation(userId),
    onSuccess: (conversation) => {
      const conversationId =
        (conversation as { id?: string | number })?.id ?? userId;
      router.push(`/chat/${conversationId}`);
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const blockMutation = useMutation({
    mutationFn: () => blocksApi.block(userId),
    onSuccess: () => Alert.alert('Blocked', 'User has been blocked.'),
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  if (profileQuery.isLoading) return <LoadingState />;

  if (profileQuery.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState
          title="Profile unavailable"
          message={getErrorMessage(profileQuery.error)}
          onRetry={() => profileQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const profile = profileQuery.data;
  const roleOptions = normalizeOptions(optionsQuery.data?.roles);
  const name = (profile?.fullName ?? 'Professional').toUpperCase();
  const role =
    resolveOptionLabel(roleOptions, profile?.role) ?? profile?.role ?? '';
  const company = profile?.company?.trim();
  const location = buildLocation(profile);
  const metaLine = [company, location].filter(Boolean).join(' · ');
  const bio = profile?.bio?.trim();
  const aboutPreview = bio ? formatAboutPreview(bio, 220) : null;
  const topSkills = getTopSkillLabels(profile, optionsQuery.data);
  const projects = unwrapProjects(projectsQuery.data);
  const rawProjects = Array.isArray(
    (profile as { projects?: unknown } | undefined)?.projects,
  )
    ? ((profile as { projects: Project[] }).projects ?? [])
    : [];
  const displayProjects = projects.length ? projects : rawProjects;
  const connectionCount =
    typeof (profile as { connectionCount?: number })?.connectionCount === 'number'
      ? (profile as { connectionCount: number }).connectionCount
      : undefined;
  const years = profile?.yearsExperience;
  const website = profile?.website?.trim();
  const email = profile?.email?.trim();
  const linkedIn =
    (profile?.linkedIn ??
      (profile as { linkedin?: string })?.linkedin)?.toString().trim() || '';

  const isConnected = connectionStatus === 'ACCEPTED' || connectionStatus === 'CONNECTED';
  const isPending =
    (connectionStatus === 'PENDING' || connectionStatus === 'REQUESTED') &&
    !isIncomingRequest;
  const canAccept = isIncomingRequest;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {profile?.fullName ?? 'Profile'}
        </Text>
        <Pressable
          onPress={() =>
            Alert.alert('More', undefined, [
              {
                text: 'Block',
                style: 'destructive',
                onPress: () =>
                  Alert.alert(
                    'Block user',
                    'They will no longer be able to contact you.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Block',
                        style: 'destructive',
                        onPress: () => blockMutation.mutate(),
                      },
                    ],
                  ),
              },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          hitSlop={10}
          style={styles.topBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.coverWrap}>
          <LinearGradient
            colors={['#D8E6F2', '#EEF4F8', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cover}
          />
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBorder}>
              <Avatar name={profile?.fullName ?? 'Pro'} size={88} />
            </View>
          </View>

          <Text style={styles.name}>{name}</Text>
          {role ? <Text style={styles.headline}>{role}</Text> : null}
          {metaLine ? <Text style={styles.subline}>{metaLine}</Text> : null}
          {years ? (
            <Text style={styles.subline}>{years}+ years experience</Text>
          ) : null}
          {connectionCount !== undefined ? (
            <Text style={styles.connections}>
              {connectionCount >= 500
                ? '500+ connections'
                : `${connectionCount} connections`}
            </Text>
          ) : null}

          {!isOwnProfile ? (
            <View style={styles.actionRow}>
              {isConnected ? (
                <Pressable
                  style={[styles.primaryBtn, styles.flexBtn]}
                  onPress={() => messageMutation.mutate()}
                  disabled={messageMutation.isPending}
                >
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.white} />
                  <Text style={styles.primaryBtnText}>
                    {messageMutation.isPending ? 'Opening…' : 'Message'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.primaryBtn,
                    styles.flexBtn,
                    isPending && styles.primaryBtnDisabled,
                  ]}
                  onPress={() => {
                    if (canAccept) {
                      acceptMutation.mutate();
                      return;
                    }
                    if (!isPending) connectMutation.mutate();
                  }}
                  disabled={
                    connectMutation.isPending ||
                    acceptMutation.isPending ||
                    isPending
                  }
                >
                  <Ionicons
                    name={
                      canAccept
                        ? 'checkmark-circle-outline'
                        : isPending
                          ? 'time-outline'
                          : 'person-add-outline'
                    }
                    size={16}
                    color={colors.white}
                  />
                  <Text style={styles.primaryBtnText}>
                    {acceptMutation.isPending
                      ? 'Accepting…'
                      : connectMutation.isPending
                        ? 'Sending…'
                        : canAccept
                          ? 'Accept'
                          : isPending
                            ? 'Pending'
                            : 'Connect'}
                  </Text>
                </Pressable>
              )}

              {!isConnected ? (
                <Pressable
                  style={[styles.outlineBtn, styles.flexBtn]}
                  onPress={() => messageMutation.mutate()}
                  disabled={messageMutation.isPending}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={LINKEDIN_BLUE} />
                  <Text style={styles.outlineBtnText}>Message</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable
              style={[styles.outlineBtn, { alignSelf: 'flex-start', marginTop: spacing.md }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.outlineBtnText}>View your profile</Text>
            </Pressable>
          )}
        </View>

        <ProfileContentTabs active={contentTab} onChange={changeTab} />

        <View style={styles.tabPanel}>
        {contentTab === 'overview' ? (
          <>
            {aboutPreview ? (
              <ProfileSectionCard title="About">
                <Pressable onPress={() => setAboutExpanded((v) => !v)}>
                  <Text style={styles.aboutText}>
                    {aboutExpanded || !aboutPreview.truncated
                      ? bio
                      : aboutPreview.text}
                    {aboutPreview.truncated && !aboutExpanded ? (
                      <Text style={styles.aboutMore}> …see more</Text>
                    ) : null}
                  </Text>
                </Pressable>
              </ProfileSectionCard>
            ) : null}

            {topSkills.length ? <TopSkillsCard skills={topSkills} /> : null}

            <ProfileSectionCard title="Role & Expertise">
              <RoleExpertiseSection profile={profile} />
            </ProfileSectionCard>

            {(role || company || years || location) ? (
              <ProfileSectionCard title="Experience">
                <View style={styles.experienceRow}>
                  <View style={styles.experienceIcon}>
                    <Ionicons name="business" size={20} color={colors.white} />
                  </View>
                  <View style={styles.experienceCopy}>
                    {role ? <Text style={styles.itemTitle}>{role}</Text> : null}
                    {company ? <Text style={styles.itemMeta}>{company}</Text> : null}
                    {years ? (
                      <Text style={styles.itemSub}>{years}+ years experience</Text>
                    ) : null}
                    {location ? <Text style={styles.itemSub}>{location}</Text> : null}
                  </View>
                </View>
              </ProfileSectionCard>
            ) : null}

            {(email || website || linkedIn) ? (
              <ProfileSectionCard title="Contact">
                {email ? (
                  <Pressable
                    style={styles.contactRow}
                    onPress={() => void Linking.openURL(`mailto:${email}`)}
                  >
                    <Ionicons name="mail-outline" size={18} color={LINKEDIN_BLUE} />
                    <Text style={styles.contactText}>{email}</Text>
                  </Pressable>
                ) : null}
                {website ? (
                  <Pressable
                    style={styles.contactRow}
                    onPress={() => {
                      const url = website.startsWith('http')
                        ? website
                        : `https://${website}`;
                      void Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="globe-outline" size={18} color={LINKEDIN_BLUE} />
                    <Text style={styles.contactText}>{website}</Text>
                  </Pressable>
                ) : null}
                {linkedIn ? (
                  <Pressable
                    style={styles.contactRow}
                    onPress={() => {
                      const url = linkedIn.startsWith('http')
                        ? linkedIn
                        : `https://${linkedIn}`;
                      void Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="logo-linkedin" size={18} color={LINKEDIN_BLUE} />
                    <Text style={styles.contactText}>{linkedIn}</Text>
                  </Pressable>
                ) : null}
              </ProfileSectionCard>
            ) : null}
          </>
        ) : null}

        {contentTab === 'projects' ? (
          displayProjects.length ? (
            <ProfileSectionCard title="Projects">
              {displayProjects.slice(0, 8).map((project, index) => {
                const title = project.name ?? project.title ?? 'Project';
                const imageUrl = projectImage(project);
                const loc = project.locationId
                  ? String(project.locationId)
                  : undefined;
                return (
                  <View key={String(project.id ?? index)}>
                    <View style={styles.projectRow}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.projectThumb} />
                      ) : (
                        <View style={[styles.projectThumb, styles.projectThumbEmpty]}>
                          <Ionicons
                            name="image-outline"
                            size={22}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                      <View style={styles.experienceCopy}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {title}
                        </Text>
                        {loc ? <Text style={styles.itemSub}>{loc}</Text> : null}
                        {project.description ? (
                          <Text style={styles.itemSub} numberOfLines={2}>
                            {String(project.description)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {index < Math.min(displayProjects.length, 8) - 1 ? (
                      <View style={styles.divider} />
                    ) : null}
                  </View>
                );
              })}
            </ProfileSectionCard>
          ) : (
            <ProfileSectionCard title="Projects">
              <Text style={styles.emptySection}>No projects shared yet.</Text>
            </ProfileSectionCard>
          )
        ) : null}

        {contentTab === 'events' ? (
          <ProfileActivitySection
            profile={profile}
            authorName={profile?.fullName}
            headline={[role, company].filter(Boolean).join(' | ')}
            connectionsCount={connectionCount}
            showAll
            ownerUserId={userId}
          />
        ) : null}

        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PROFILE_BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  topBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
    marginHorizontal: spacing.sm,
  },
  scroll: { flex: 1, backgroundColor: PROFILE_BG },
  content: {
    paddingBottom: spacing.xxl,
    backgroundColor: PROFILE_BG,
    flexGrow: 1,
  },
  tabPanel: {
    minHeight: 320,
    paddingBottom: spacing.lg,
  },
  coverWrap: {
    height: 108,
    backgroundColor: '#E8EFF5',
  },
  cover: { flex: 1 },
  profileBlock: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginTop: -46,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  avatarBorder: {
    borderWidth: 4,
    borderColor: colors.white,
    borderRadius: 48,
    overflow: 'hidden',
  },
  name: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    color: colors.text,
  },
  headline: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.text,
  },
  subline: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  connections: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  flexBtn: { flex: 1 },
  primaryBtn: {
    minHeight: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.textMuted,
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  outlineBtn: {
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: LINKEDIN_BLUE,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  outlineBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  aboutText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.text,
  },
  aboutMore: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.semibold,
  },
  experienceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  experienceIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  itemMeta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  itemSub: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  projectRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  projectThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  projectThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  contactText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  emptySection: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  bottomSpacer: { height: spacing.lg },
});
