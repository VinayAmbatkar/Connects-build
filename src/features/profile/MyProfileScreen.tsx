import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { LoadingState, ErrorState } from '@/src/components/EmptyState';
import { connectionsApi } from '@/src/api/connections';
import { eventsApi } from '@/src/api/events';
import { getErrorMessage } from '@/src/api/client';
import { profileApi } from '@/src/api/profile';
import { projectsApi } from '@/src/api/projects';
import { ProfileActivitySection } from '@/src/features/profile/ProfileActivitySection';
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
import type { ProfessionalProfile } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const LINKEDIN_BLUE = '#0A66C2';
const VERIFY_BLUE = '#1E3A8A';

function ExperienceIcon() {
  return (
    <View style={styles.experienceIcon}>
      <Ionicons name="business" size={20} color={colors.white} />
    </View>
  );
}

function buildLocation(profile?: ProfessionalProfile | null) {
  return profile?.serviceLocations?.filter(Boolean).join(', ');
}

export function MyProfileScreen() {
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

  const name = (profile?.fullName ?? user?.fullName ?? 'Your Profile').toUpperCase();
  const role =
    resolveOptionLabel(roleOptions, profile?.role) ??
    profile?.role ??
    user?.role ??
    '';
  const company = profile?.company?.trim();
  const location = buildLocation(profile);
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
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.topBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
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
              <Avatar name={profile?.fullName ?? user?.fullName ?? 'You'} size={88} />
            </View>
            <Pressable style={styles.editProfileBtn} onPress={openEdit}>
              <Text style={styles.editProfileText}>Edit profile</Text>
            </Pressable>
          </View>

          <Text style={styles.name}>
            {name}
            {isVerified && (
              <Text style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color={VERIFY_BLUE} />
              </Text>
            )}
          </Text>

          {role ? <Text style={styles.headline}>{role}</Text> : null}
          {metaLine ? <Text style={styles.subline}>{metaLine}</Text> : null}
          {(profile?.email || profile?.phoneNumber) && (
            <Text style={styles.locationLine}>
              {location ? `${location} · ` : ''}
              <Text style={styles.linkText}>Contact info</Text>
            </Text>
          )}
          {connectionCount !== undefined ? (
            <Pressable onPress={() => router.push('/(tabs)/network')}>
              <Text style={styles.connections}>
                {connectionCount >= 500 ? '500+ connections' : `${connectionCount} connections`}
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
                <RoleExpertiseSection profile={profile} />
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
                fallbackSkills={topSkills}
                onEdit={openEdit}
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
    height: 108,
    backgroundColor: '#E8EFF5',
  },
  cover: {
    flex: 1,
  },
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
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  avatarBorder: {
    borderWidth: 4,
    borderColor: colors.white,
    borderRadius: 48,
    overflow: 'hidden',
  },
  editProfileBtn: {
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.text,
    backgroundColor: colors.white,
  },
  editProfileText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.text,
  },
  name: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
    letterSpacing: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedBadge: {
    paddingTop: 2,
  },
  headline: {
    marginTop: 4,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  subline: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  locationLine: {
    marginTop: 6,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  linkText: {
    color: LINKEDIN_BLUE,
    fontFamily: typography.fontFamily.semibold,
  },
  connections: {
    marginTop: 8,
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
