import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { ErrorState } from '@/src/components/EmptyState';
import { connectionsApi } from '@/src/api/connections';
import { eventsApi } from '@/src/api/events';
import { getErrorMessage } from '@/src/api/client';
import { profileApi } from '@/src/api/profile';
import { projectsApi } from '@/src/api/projects';
import { ProfileActivitySection } from '@/src/features/profile/ProfileActivitySection';
import { ProfileInsightsCard } from '@/src/features/profile/ProfileInsightsCard';
import { shareMyProfile } from '@/src/features/profile/shareProfile';
import { ProfileCertificationsSection } from '@/src/features/profile/ProfileCertificationsSection';
import {
  ProfileContentTabs,
  type ProfileContentTab,
} from '@/src/features/profile/ProfileContentTabs';
import { ProfileFeaturedSection } from '@/src/features/profile/ProfileFeaturedSection';
import { ProfileProjectsSection } from '@/src/features/profile/ProfileProjectsSection';
import { ProfileSectionCard } from '@/src/features/profile/ProfileSectionCard';
import {
  RoleExpertiseSection,
} from '@/src/features/profile/RoleExpertiseSection';
import { getTopSkillLabels } from '@/src/features/profile/profileSkills';
import { TopSkillsCard } from '@/src/features/profile/TopSkillsCard';
import { BusinessVerificationCard } from '@/src/features/profile/BusinessVerificationCard';
import { resolveKycFlow } from '@/src/features/verification/kycLogic';
import { useKycProgress } from '@/src/features/verification/useKycVerification';
import {
  normalizeOptions,
  resolveOptionLabel,
} from '@/src/features/profile/profileOptions';
import { formatAboutPreview } from '@/src/features/profile/profileFormat';
import { useAuthStore } from '@/src/store/authStore';

import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { usePlaceLabels } from '@/src/hooks/usePlaceLabels';
import { ProfileSkeleton } from '@/src/components/Skeleton';
const LINKEDIN_BLUE = '#0A66C2';

function ExperienceIcon() {
  return (
    <View style={styles.experienceIcon}>
      <Ionicons name="business" size={20} color={colors.white} />
    </View>
  );
}


export function MyProfileScreen() {
  const pull = usePullToRefresh();
  const user = useAuthStore((s) => s.user);
  const [contentTab, setContentTab] = useState<ProfileContentTab>('overview');
  const scrollRef = useRef<ScrollView>(null);

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: profileApi.getMine,
  });

  const optionsQuery = useQuery({
    queryKey: ['profile-options'],
    queryFn: profileApi.options,
  });

  const connectionsQuery = useQuery({
    queryKey: ['connections-count'],
    queryFn: connectionsApi.count,
  });

  const eventsQuery = useQuery({
    queryKey: ['my-events'],
    queryFn: eventsApi.listMine,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.listMine,
  });

  const { progress: kycProgress, isLoading: kycLoading } = useKycProgress(
    resolveKycFlow(profileQuery.data?.role ?? user?.role, profileQuery.data?.employmentType),
    profileQuery.data?.verified,
  );

  const changeTab = (tab: ProfileContentTab) => {
    setContentTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (tab === 'events') {
      void eventsQuery.refetch();
    }
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

  const name = (profile?.fullName ?? user?.fullName ?? 'Your Profile').toUpperCase();
  const role =
    resolveOptionLabel(roleOptions, profile?.role) ??
    profile?.role ??
    user?.role ??
    '';
  const company = profile?.company?.trim();
  const location = locationLabels.slice(0, 2).join(', ');
  const connectionCount = connectionsQuery.data?.count;
  const bio = profile?.bio?.trim();
  const aboutPreview = bio ? formatAboutPreview(bio) : null;
  const hasExperience = Boolean(role || company || profile?.yearsExperience || location);
  const metaLine = [company, location].filter(Boolean).join(' · ');
  const topSkills = getTopSkillLabels(profile, optionsQuery.data);
  const events = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
  const projects = Array.isArray(projectsQuery.data) ? projectsQuery.data : [];

  // Consumers are verified by Aadhaar alone; business owners and employees
  // only once GST / work email is done too.
  const isVerified = kycProgress.complete;
  // Hold the card back until status is known, so a fully verified business
  // account doesn't flash "Get Verified" first.
  const showVerificationCard = !isVerified && !kycLoading;

  const openEdit = () => router.push('/edit-profile');
  const openEditAbout = () => router.push('/edit-about');
  const openExpertise = () => router.push('/edit-profile?tab=role-expertise');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push('/(tabs)/feed')} hitSlop={10} style={styles.topBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>My Profile</Text>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => void shareMyProfile(profile?.fullName)}
            hitSlop={8}
            style={styles.topBtn}
            accessibilityRole="button"
            accessibilityLabel="Share profile"
          >
            <Ionicons name="share-social-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.topBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
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
          <View style={styles.avatarRow}>
            <Pressable
              onPress={openEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              hitSlop={4}
            >
              <View style={styles.avatarBorder}>
                <Avatar name={profile?.fullName ?? user?.fullName ?? 'You'} size={56} />
              </View>
              <View style={styles.avatarEditBadge}>
                <Ionicons name="pencil" size={12} color={colors.white} />
              </View>
            </Pressable>
            <View style={styles.profileIdentity}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={2}>{name}</Text>
                {isVerified ? (
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
            </View>
          </View>

          {connectionCount !== undefined ? (
            <Pressable
              style={styles.connectionsRow}
              onPress={() => router.push('/(tabs)/network')}
              accessibilityRole="button"
              accessibilityLabel={`${connectionCount >= 500 ? '500+' : connectionCount} connections`}
              hitSlop={6}
            >
              <Ionicons name="people" size={16} color={LINKEDIN_BLUE} />
              <Text style={styles.connections}>
                {connectionCount >= 500 ? '500+' : connectionCount}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <ProfileContentTabs active={contentTab} onChange={changeTab} />

        <View style={styles.tabPanel}>
          {contentTab === 'overview' ? (
            <>
              {showVerificationCard && (
                <BusinessVerificationCard
                  progress={kycProgress}
                  onPress={() => router.push('/verification')}
                />
              )}
              <ProfileInsightsCard />
              <View style={styles.aboutCard}>
                <View style={styles.aboutHeader}>
                  <Text style={styles.aboutTitle}>About</Text>
                  <Pressable onPress={openEditAbout} hitSlop={8}>
                    <Ionicons name="pencil" size={18} color={LINKEDIN_BLUE} />
                  </Pressable>
                </View>
                {aboutPreview ? (
                  <Pressable onPress={openEditAbout}>
                    <Text style={styles.aboutText} numberOfLines={3}>
                      {aboutPreview.text}
                      {aboutPreview.truncated ? (
                        <Text style={styles.aboutEllipsis}>....</Text>
                      ) : null}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={openEditAbout}>
                    <Text style={styles.aboutPlaceholder}>
                      Tell others about your experience and expertise.
                    </Text>
                  </Pressable>
                )}
              </View>

              <TopSkillsCard skills={topSkills} onPress={openExpertise} />

              <ProfileFeaturedSection
                events={events}
                projects={projects}
                onAdd={() => router.push('/create-event')}
              />

              <ProfileSectionCard title="Role & Expertise" onEdit={openExpertise}>
                <Pressable onPress={openExpertise} accessibilityRole="button">
                  <RoleExpertiseSection profile={profile} />
                </Pressable>
              </ProfileSectionCard>

              {hasExperience ? (
                <ProfileSectionCard title="Experience" onEdit={openEdit}>
                  <View style={styles.listItem}>
                    <ExperienceIcon />
                    <View style={styles.listCopy}>
                      {role ? <Text style={styles.itemTitle}>{role}</Text> : null}
                      {company ? <Text style={styles.itemMeta}>{company}</Text> : null}
                      {profile?.yearsExperience ? (
                        <Text style={styles.itemSub}>
                          {profile.yearsExperience}+ years experience
                        </Text>
                      ) : null}
                      {location ? <Text style={styles.itemSub}>{location}</Text> : null}
                    </View>
                  </View>
                </ProfileSectionCard>
              ) : null}

              <ProfileCertificationsSection
                profile={profile}
                onEdit={() => router.push('/credentials' as Href)}
              />
            </>
          ) : null}

          {contentTab === 'projects' ? (
            <ProfileProjectsSection skills={topSkills} />
          ) : null}

          {contentTab === 'events' ? (
            <ProfileActivitySection
              profile={profile}
              authorName={profile?.fullName ?? user?.fullName}
              headline={[role, company].filter(Boolean).join(' | ')}
              connectionsCount={connectionCount}
              showAll
              ownerUserId={
                user?.id ??
                (profile?.userId as string | number | undefined) ??
                (profile?.id as string | number | undefined)
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PROFILE_BG = '#F3F2EF';

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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  topBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
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
  cover: {
    flex: 1,
  },
  profileBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  profileIdentity: {
    flex: 1,
    minWidth: 0,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 32,
    overflow: 'hidden',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
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
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  subline: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  connectionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: spacing.xs,
  },
  connections: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  aboutBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  aboutCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  aboutTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  aboutText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.text,
  },
  aboutEllipsis: {
    color: colors.textMuted,
  },
  aboutPlaceholder: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textMuted,
  },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listCopy: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  itemMeta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  itemSub: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  experienceIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: LINKEDIN_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
