import { alertApiError } from '@/src/features/billing/featureLocked';
import { useFreemiumStore } from '@/src/features/billing/freemiumStore';
import type { FreemiumOffer } from '@/src/api/freemium';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { BottomSheet } from '@/src/components/BottomSheet';
import { FocusHighlight } from '@/src/components/FocusHighlight';
import { favouritesApi, suggestionsApi } from '@/src/api/social';
import { ErrorState } from '@/src/components/EmptyState';
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
import { ProfileCertificationsSection } from '@/src/features/profile/ProfileCertificationsSection';
import { ProfileSectionCard } from '@/src/features/profile/ProfileSectionCard';
import { RoleExpertiseSection } from '@/src/features/profile/RoleExpertiseSection';
import { TopSkillsCard } from '@/src/features/profile/TopSkillsCard';
import { formatAboutPreview } from '@/src/features/profile/profileFormat';
import {
  normalizeOptions,
  resolveOptionLabel,
} from '@/src/features/profile/profileOptions';
import { getTopSkillLabels } from '@/src/features/profile/profileSkills';
import { useAuthStore } from '@/src/store/authStore';
import type { Connection, Project } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { usePlaceLabel, usePlaceLabels } from '@/src/hooks/usePlaceLabels';
import { ProjectDetailSheet, projectPhotos } from '@/src/features/profile/ProjectDetailSheet';
import { useFeature } from '@/src/features/billing/useFeature';
import { PremiumBadge } from '@/src/components/PremiumBadge';
import { ProfileSkeleton } from '@/src/components/Skeleton';
const LINKEDIN_BLUE = '#0A66C2';
const PROFILE_BG = '#F3F2EF';

/** Section a notification points at -- scrolled to and blinked on open. */
export type ProfileFocus = 'connection' | 'credentials';

type Props = {
  userId: string;
  focus?: ProfileFocus;
};

function unwrapProjects(data: unknown): Project[] {
  if (Array.isArray(data)) return data as Project[];
  if (data && typeof data === 'object') {
    const body = data as { projects?: Project[] };
    if (Array.isArray(body.projects)) return body.projects;
  }
  return [];
}


/** One project in the Projects tab; tapping it opens ProjectDetailSheet. */
function ProjectRow({ project, onPress }: { project: Project; onPress: () => void }) {
  const title = String(project.name ?? project.title ?? 'Project');
  const imageUrl = projectPhotos(project)[0];
  const location = usePlaceLabel(project.locationId);
  return (
    <Pressable
      style={({ pressed }) => [styles.projectRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open project ${title}`}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.projectThumb} />
      ) : (
        <View style={[styles.projectThumb, styles.projectThumbEmpty]}>
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.experienceCopy}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {title}
        </Text>
        {location ? <Text style={styles.itemSub}>{location}</Text> : null}
        {project.description ? (
          <Text style={styles.itemSub} numberOfLines={2}>
            {String(project.description)}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function PublicProfileScreen({ userId, focus }: Props) {
  const pull = usePullToRefresh();
  const queryClient = useQueryClient();
  const [openProject, setOpenProject] = useState<Project | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [expertiseOpen, setExpertiseOpen] = useState(false);
  const connectAccess = useFeature('connect');
  const messageAccess = useFeature('message');
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

  const isOwnProfile =
    String(me?.id ?? '') === String(userId) ||
    String((me as { userId?: string | number } | null)?.userId ?? '') ===
      String(userId);

  // What I am to this person comes with the profile itself
  // (connectionStatus + connectionId on GET /profile/professional/:id).
  // This used to fetch my connections list and search it -- one more
  // request per profile view, and that list only held the first 20, so
  // anyone with more saw "Connect" on people they were connected to.
  const relationship = profileQuery.data as
    | { connectionStatus?: string; connectionId?: number }
    | undefined;
  const relation = String(relationship?.connectionStatus ?? 'NONE').toUpperCase();
  const connectionStatus =
    relation === 'CONNECTED' ? 'ACCEPTED' : relation.startsWith('PENDING') ? 'PENDING' : relation;
  const isIncomingRequest = relation === 'PENDING_RECEIVED';
  const matchedConnection = relationship?.connectionId ? { id: relationship.connectionId } : null;
  const refreshRelationship = () => {
    void queryClient.invalidateQueries({ queryKey: ['connections'] });
    void queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
  };

  const connectMutation = useMutation({
    mutationFn: () => connectionsApi.send(userId),
    onSuccess: () => {
      refreshRelationship();
      appAlert('Request sent', 'Connection request sent.');
    },
    onError: (error) => alertApiError(error),
  });

  const acceptMutation = useMutation({
    mutationFn: () => {
      if (!matchedConnection?.id) {
        return Promise.reject(new Error('Missing connection id'));
      }
      return connectionsApi.accept(matchedConnection.id);
    },
    onSuccess: () => {
      refreshRelationship();
      appAlert('Connected', 'Connection request accepted.');
    },
    onError: (error) => alertApiError(error),
  });

  const messageMutation = useMutation({
    mutationFn: () => messagesApi.startConversation(userId),
    onSuccess: (conversation) => {
      const conversationId =
        (conversation as { id?: string | number })?.id ?? userId;
      router.push(`/chat/${conversationId}`);
    },
    onError: (error) => alertApiError(error),
  });

  // Saved profiles (web: Favourites). Shares the list cache with the
  // Saved profiles screen.
  const favouritesQuery = useQuery({ queryKey: ['favourites'], queryFn: favouritesApi.list });
  const isSaved = (favouritesQuery.data ?? []).some((f) => String(f.favouriteUserId) === String(userId));
  const saveMutation = useMutation({
    mutationFn: () => (isSaved ? favouritesApi.remove(String(userId)) : favouritesApi.add(String(userId))),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['favourites'] }),
    onError: (error) => alertApiError(error),
  });

  const [mutualOpen, setMutualOpen] = useState(false);
  const mutualQuery = useQuery({
    queryKey: ['mutual-connections', String(userId)],
    queryFn: () => suggestionsApi.mutual(String(userId)),
    enabled: mutualOpen,
  });

  const displayName = (profileQuery.data?.fullName ?? 'this member').trim() || 'this member';

  const blockMutation = useMutation({
    mutationFn: () => blocksApi.block(userId),
    onSuccess: () => {
      // The Blocked users list, and anything showing this person.
      void queryClient.invalidateQueries({ queryKey: ['blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      appAlert('Blocked', `${displayName} has been blocked. You can unblock them from Settings › Blocked users.`, [
        { text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed')) },
      ]);
    },
    onError: (error) => alertApiError(error),
  });

  const confirmBlock = () => {
    setMoreOpen(false);
    appAlert(`Block ${displayName}?`, "They won't be able to message you, connect with you or see your posts. They aren't told you blocked them.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate() },
    ]);
  };

  // Firm first, then service locations -- stored as Google place IDs,
  // location codes or typed text; usePlaceLabels makes them all readable
  // (this used to print the raw place ID).
  const locationLabels = usePlaceLabels([
    ...((profileQuery.data?.firmLocationIds ?? []) as string[]),
    ...((profileQuery.data?.serviceLocations ?? []) as string[]),
  ]);

  if (profileQuery.isLoading) return <ProfileSkeleton />;

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
  const location = locationLabels.slice(0, 2).join(', ');
  const metaLine = [company, location].filter(Boolean).join(' · ');
  const bio = profile?.bio?.trim();
  const aboutPreview = bio ? formatAboutPreview(bio, 220) : null;
  const topSkills = getTopSkillLabels(profile, optionsQuery.data);
  const projects = unwrapProjects(projectsQuery.data);
  // Plan-locked full profile ("Claim it free" during the freemium campaign).
  const lockedOffer: FreemiumOffer | null =
    !isOwnProfile && profile?.lockedFeature && profile.offer?.title ? profile.offer : null;
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
  const mutualCount = Number((profile as { mutualConnectionCount?: number } | undefined)?.mutualConnectionCount ?? 0);
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
        {!isOwnProfile ? (
          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || favouritesQuery.isLoading}
            hitSlop={10}
            style={styles.topBtn}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved profiles' : 'Save profile'}
          >
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? colors.primary : colors.text} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setMoreOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="More options"
          hitSlop={10}
          style={styles.topBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={pull.refreshControl}
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
          <View style={styles.identityRow}>
            <View style={styles.avatarBorder}>
              <Avatar name={profile?.fullName ?? 'Pro'} size={56} />
            </View>
            <View style={styles.identityCopy}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={2}>{name}</Text>
                {profile?.verified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={LINKEDIN_BLUE}
                    accessibilityLabel="Verified profile"
                  />
                ) : null}
              </View>
              {role ? <Text style={styles.headline} numberOfLines={1}>{role}</Text> : null}
              {metaLine ? <Text style={styles.subline} numberOfLines={2}>{metaLine}</Text> : null}
              {profile?.businessVerified ? (
                <View style={styles.businessBadge}>
                  <Ionicons name="shield-checkmark" size={13} color={LINKEDIN_BLUE} />
                  <Text style={styles.businessBadgeText}>Verified Business</Text>
                </View>
              ) : null}
            </View>
          </View>

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
          {!isOwnProfile && mutualCount > 0 ? (
            <Pressable onPress={() => setMutualOpen(true)} hitSlop={6} accessibilityRole="button">
              <Text style={styles.mutualLink}>
                {mutualCount} mutual connection{mutualCount === 1 ? '' : 's'}
              </Text>
            </Pressable>
          ) : null}

          {!isOwnProfile ? (
            <FocusHighlight active={focus === 'connection'} scrollRef={scrollRef}>
            <View style={styles.actionRow}>
              {isConnected ? (
                <Pressable
                  style={[styles.primaryBtn, styles.flexBtn]}
                  onPress={() => messageMutation.mutate()}
                  disabled={messageMutation.isPending}
                >
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.white} />
                  {messageAccess.lockedTier ? <PremiumBadge tier={messageAccess.lockedTier} size={9} /> : null}
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
                  {connectAccess.lockedTier && !isPending && !canAccept ? (
                    <PremiumBadge tier={connectAccess.lockedTier} size={9} />
                  ) : null}
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
                // Messaging needs an accepted connection (the backend refuses
                // otherwise). This used to try anyway and end in an error;
                // now it explains, and offers the next step.
                <Pressable
                  style={[styles.outlineBtn, styles.flexBtn]}
                  onPress={() =>
                    appAlert(
                      'Connect to message',
                      isPending
                        ? `You can message ${displayName} once they accept your connection request.`
                        : canAccept
                          ? `Accept ${displayName}'s connection request to start messaging.`
                          : `You can message ${displayName} after they accept your connection request.`,
                      isPending
                        ? [{ text: 'OK' }]
                        : [
                            { text: 'Not now', style: 'cancel' },
                            {
                              text: canAccept ? 'Accept' : 'Connect',
                              onPress: () => (canAccept ? acceptMutation.mutate() : connectMutation.mutate()),
                            },
                          ],
                    )
                  }
                >
                  <Ionicons name="chatbubble-outline" size={16} color={LINKEDIN_BLUE} />
                  <Text style={styles.outlineBtnText}>Message</Text>
                </Pressable>
              ) : null}
            </View>
            </FocusHighlight>
          ) : (
            <Pressable
              style={[styles.outlineBtn, { alignSelf: 'flex-start', marginTop: spacing.md }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.outlineBtnText}>View your profile</Text>
            </Pressable>
          )}
        </View>

        {lockedOffer ? <LockedContactCard offer={lockedOffer} /> : null}

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

            {topSkills.length ? (
              <TopSkillsCard skills={topSkills} onPress={() => setSkillsOpen(true)} />
            ) : null}

            <ProfileSectionCard title="Role & Expertise">
              <Pressable onPress={() => setExpertiseOpen(true)} accessibilityRole="button">
                <RoleExpertiseSection profile={profile} />
              </Pressable>
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

            <FocusHighlight active={focus === 'credentials'} scrollRef={scrollRef}>
              <ProfileCertificationsSection profile={profile} isOwner={isOwnProfile} />
            </FocusHighlight>

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
              {displayProjects.slice(0, 8).map((project, index) => (
                <View key={String(project.id ?? index)}>
                  <ProjectRow project={project} onPress={() => setOpenProject(project)} />
                  {index < Math.min(displayProjects.length, 8) - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              ))}
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
      <BottomSheet
        visible={mutualOpen}
        title="Mutual connections"
        subtitle={profile?.fullName ? `People you and ${profile.fullName} both know` : undefined}
        onClose={() => setMutualOpen(false)}
      >
        {mutualQuery.isLoading ? <ProfileSkeleton /> : null}
        {(mutualQuery.data?.connections ?? []).map((m) => (
          <Pressable
            key={m.userId}
            style={styles.mutualRow}
            onPress={() => {
              setMutualOpen(false);
              router.push(`/public-profile/${m.userId}`);
            }}
          >
            <Avatar name={m.name} size={40} />
            <View style={styles.mutualCopy}>
              <Text style={styles.itemTitle}>{m.name}</Text>
              {m.role ? <Text style={styles.itemSub}>{m.role}</Text> : null}
            </View>
          </Pressable>
        ))}
      </BottomSheet>

      <ProjectDetailSheet project={openProject} onClose={() => setOpenProject(null)} />

      <BottomSheet
        visible={skillsOpen}
        title="Top skills"
        subtitle={`${topSkills.length} skills`}
        onClose={() => setSkillsOpen(false)}
        tall
      >
        {/* Two skills per row so the list stays short. */}
        <View style={styles.skillGrid}>
          {topSkills.map((skill, index) => (
            <View key={`${skill}-${index}`} style={styles.detailSkillRow}>
              <View style={styles.detailSkillIcon}>
                <Ionicons name="construct-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.detailSkillText} numberOfLines={2}>
                {skill}
              </Text>
            </View>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={expertiseOpen}
        title="Role & Expertise"
        subtitle="Professional focus and project experience"
        onClose={() => setExpertiseOpen(false)}
        tall
      >
        <View style={styles.detailSheetContent}>
          <RoleExpertiseSection profile={profile} showAll />
        </View>
      </BottomSheet>

      <BottomSheet visible={moreOpen} title={displayName} onClose={() => setMoreOpen(false)}>
        <Pressable style={styles.sheetRow} onPress={confirmBlock} accessibilityRole="button">
          <Ionicons name="ban-outline" size={20} color={colors.danger} />
          <Text style={[styles.sheetRowText, { color: colors.danger }]}>Block {displayName}</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

/** The viewer's plan doesn't include contact details: the backend leaves
 *  them out, and this card offers the unlock. A claim refreshes every
 *  query (see freemiumStore), which reloads the profile with them. */
function LockedContactCard({ offer }: { offer: FreemiumOffer }) {
  const claim = useFreemiumStore((s) => s.claim);
  const claiming = useFreemiumStore((s) => s.claiming);
  const showCta = !!offer.cta_label && (offer.cta_action === 'CLAIM' || offer.cta_action === 'OPEN_PLANS');
  const onPress = () => {
    if (offer.cta_action === 'CLAIM') void claim(offer.feature);
    else router.push('/premium');
  };
  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedIcon}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.primaryDark} />
      </View>
      <View style={styles.lockedCopy}>
        <View style={styles.lockedTitleRow}>
          <Text style={styles.lockedTitle}>Contact details</Text>
          <PremiumBadge tier="verified" label size={9} />
        </View>
        <Text style={styles.lockedMessage} numberOfLines={2}>Email, phone and website are hidden on your plan.</Text>
      </View>
      {showCta ? (
        <Pressable
          accessibilityRole="button"
          disabled={claiming}
          onPress={onPress}
          style={({ pressed }) => [styles.lockedBtn, (pressed || claiming) && { opacity: 0.7 }]}
        >
          {claiming ? <ActivityIndicator color={colors.white} /> : <Text style={styles.lockedBtnText}>{offer.cta_label}</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  lockedIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  lockedCopy: { flex: 1 },
  lockedTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  sheetRowText: { fontFamily: typography.fontFamily.semibold, fontSize: 15, color: colors.text },
  lockedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockedMessage: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  lockedBtn: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  lockedBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs + 1,
    color: colors.white,
  },
  mutualLink: {
    marginTop: 4,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  mutualRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  mutualCopy: { flex: 1 },
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
    height: 40,
    backgroundColor: '#E8EFF5',
  },
  cover: { flex: 1 },
  profileBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 32,
    overflow: 'hidden',
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontFamily: typography.fontFamily.bold,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
  },
  headline: {
    marginTop: 2,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: '#E8F0FE',
  },
  businessBadgeText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 10,
    color: LINKEDIN_BLUE,
  },
  detailSheetContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    paddingBottom: spacing.md,
  },
  detailSkillRow: {
    width: '48.5%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  detailSkillIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  detailSkillText: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
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
