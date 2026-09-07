import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { LoadingState } from '@/src/components/EmptyState';
import { TextField } from '@/src/components/TextField';
import { getErrorMessage } from '@/src/api/client';
import { profileApi } from '@/src/api/profile';
import { projectsApi } from '@/src/api/projects';
import { RoleExpertiseTab } from '@/src/features/profile/RoleExpertiseTab';
import {
  normalizeOptions,
  normalizeProfileIds,
  resolveOptionLabel,
} from '@/src/features/profile/profileOptions';
import { BIO_MAX_LENGTH } from '@/src/features/profile/profileSkills';
import type { ProfessionalProfile, Project } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const MAIN_TABS = [
  {
    id: 'professional',
    label: 'Professional Info',
    icon: 'person-outline' as const,
  },
  {
    id: 'role-expertise',
    label: 'Role & Expertise',
    icon: 'git-network-outline' as const,
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'calendar-outline' as const,
  },
] as const;

type MainTabId = (typeof MAIN_TABS)[number]['id'];

function parseSocial(raw?: string) {
  if (!raw) return { linkedIn: '', instagram: '', twitter: '' };
  try {
    const parsed = JSON.parse(raw) as {
      linkedIn?: string;
      instagram?: string;
      twitter?: string;
    };
    return {
      linkedIn: parsed.linkedIn ?? '',
      instagram: parsed.instagram ?? '',
      twitter: parsed.twitter ?? '',
    };
  } catch {
    return { linkedIn: raw, instagram: '', twitter: '' };
  }
}

function parseMainTab(tab?: string): MainTabId {
  const normalized = String(tab ?? '').toLowerCase();
  const aliases: Record<string, MainTabId> = {
    professional: 'professional',
    contact: 'professional',
    company: 'professional',
    expertise: 'role-expertise',
    'role-expertise': 'role-expertise',
    role: 'role-expertise',
    projects: 'projects',
  };
  return aliases[normalized] ?? 'professional';
}

function completionMessage(percent: number) {
  if (percent >= 100) return 'Great! Your profile is complete.';
  if (percent >= 75) return 'Almost there — just a few details left.';
  if (percent >= 40) return 'Good progress. Keep filling in your profile.';
  return 'Add more details to strengthen your profile.';
}

function ProjectRow({ project }: { project: Project }) {
  const title = project.name ?? project.title ?? 'Untitled project';
  const imageUrl = Array.isArray(project.photos) ? project.photos[0] : undefined;
  const year = project.endDate
    ? String(project.endDate).slice(0, 4)
    : project.startDate
      ? String(project.startDate).slice(0, 4)
      : null;
  const meta = [project.locationId, year].filter(Boolean).join(' · ');

  return (
    <Pressable style={styles.projectRow} onPress={() => router.push('/projects')}>
      {imageUrl ? (
        <Image source={{ uri: String(imageUrl) }} style={styles.projectThumb} />
      ) : (
        <View style={[styles.projectThumb, styles.projectThumbPlaceholder]}>
          <Ionicons name="image-outline" size={18} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.projectCopy}>
        <Text style={styles.projectTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.projectMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

type TabBarProps = {
  active: MainTabId;
  onChange: (tab: MainTabId) => void;
};

function EditProfileTabBar({ active, onChange }: TabBarProps) {
  return (
    <View style={styles.tabBar}>
      {MAIN_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={styles.tabItem}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={2}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.tabIndicator} /> : <View style={styles.tabSpacer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export function EditProfileScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<MainTabId>(() => parseMainTab(params.tab));
  const [form, setForm] = useState<ProfessionalProfile>({});
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: profileApi.getMine,
  });

  const optionsQuery = useQuery({
    queryKey: ['profile-options'],
    queryFn: profileApi.options,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.listMine,
  });

  useEffect(() => {
    if (profileQuery.data) {
      const raw = profileQuery.data as Record<string, unknown>;
      const social = parseSocial(profileQuery.data.socialMedia);
      const ids = normalizeProfileIds(raw);

      setForm({
        ...profileQuery.data,
        ...ids,
        linkedIn: social.linkedIn,
        instagram: social.instagram,
        twitter: social.twitter,
      });

      if (__DEV__) {
        console.log('[EditProfile] raw keys:', Object.keys(raw));
        console.log('[EditProfile] normalized ids:', ids);
      }
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (params.tab) {
      setTab(parseMainTab(params.tab));
    }
  }, [params.tab]);

  const roleOptions = normalizeOptions(optionsQuery.data?.roles);

  const selectedRoleLabel =
    resolveOptionLabel(roleOptions, form.role) ?? form.role ?? 'Select role';

  const completion = useMemo(() => {
    const fields = [
      form.fullName,
      form.email,
      form.phoneNumber,
      form.company,
      form.role,
      form.bio,
      form.website,
      form.disciplineIds?.length ? 'yes' : '',
    ];
    const filled = fields.filter((v) => String(v ?? '').trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.role?.trim()) {
        throw new Error('Please select a role.');
      }
      if (!form.disciplineIds?.length) {
        throw new Error('Please select at least one discipline.');
      }

      return profileApi.save({
        ...form,
        socialMedia: JSON.stringify({
          linkedIn: form.linkedIn ?? '',
          instagram: form.instagram ?? '',
          twitter: form.twitter ?? '',
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      Alert.alert('Saved', 'Your profile was updated.');
    },
    onError: (error) => Alert.alert('Save failed', getErrorMessage(error)),
  });

  if (profileQuery.isLoading) return <LoadingState />;

  const set = (key: keyof ProfessionalProfile, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const projects = Array.isArray(projectsQuery.data) ? projectsQuery.data : [];

  const renderTabContent = () => {
    switch (tab) {
      case 'professional':
        return (
          <View>
            <SectionHeading
              title="Professional Info"
              subtitle="Tell us about your role and work"
            />

            <Text style={styles.fieldLabel}>
              Role / Designation<Text style={styles.required}> *</Text>
            </Text>
            <Pressable style={styles.selectField} onPress={() => setRolePickerOpen(true)}>
              <Ionicons name="briefcase-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.selectValue} numberOfLines={1}>
                {selectedRoleLabel}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>

            <TextField
              label="Full Name"
              value={String(form.fullName ?? '')}
              onChangeText={(v) => set('fullName', v)}
            />
            <TextField
              label="Email"
              autoCapitalize="none"
              value={String(form.email ?? '')}
              onChangeText={(v) => set('email', v)}
            />
            <TextField
              label="Phone Number"
              value={String(form.phoneNumber ?? '')}
              onChangeText={(v) => set('phoneNumber', v)}
            />
            <TextField
              label="Website"
              autoCapitalize="none"
              value={String(form.website ?? '')}
              onChangeText={(v) => set('website', v)}
            />
            <TextField
              label="Company"
              value={String(form.company ?? '')}
              onChangeText={(v) => set('company', v)}
            />
            <TextField
              label="Years of experience"
              keyboardType="number-pad"
              value={String(form.yearsExperience ?? '')}
              onChangeText={(v) =>
                setForm((p) => ({ ...p, yearsExperience: Number(v) || 0 }))
              }
            />
            <TextField
              label="Service locations (comma separated)"
              value={
                Array.isArray(form.serviceLocations) ? form.serviceLocations.join(', ') : ''
              }
              onChangeText={(v) =>
                setForm((p) => ({
                  ...p,
                  serviceLocations: v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
            <TextField
              label="Bio"
              multiline
              style={{ minHeight: 120, textAlignVertical: 'top' }}
              value={String(form.bio ?? '')}
              onChangeText={(v) => set('bio', v.slice(0, BIO_MAX_LENGTH))}
            />
          </View>
        );

      case 'role-expertise':
        return (
          <RoleExpertiseTab
            form={form}
            options={optionsQuery.data}
            onChange={setForm}
          />
        );

      case 'projects':
        return (
          <View>
            <SectionHeading title="Projects" subtitle="Showcase your portfolio work" />

            <View style={styles.projectsHeader}>
              <Text style={styles.projectsTitle}>Your projects</Text>
              <Text style={styles.projectsSubtitle}>Add or edit portfolio projects</Text>
            </View>

            {projects.map((project) => (
              <ProjectRow key={String(project.id)} project={project} />
            ))}

            <Pressable style={styles.addProjectBtn} onPress={() => router.push('/projects')}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.addProjectText}>Add Project</Text>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBarBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Edit Profile</Text>
        <Pressable
          style={styles.previewBtn}
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={8}
        >
          <Ionicons name="eye-outline" size={16} color={colors.text} />
          <Text style={styles.previewText}>Preview</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xl + 88 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Avatar name={form.fullName ?? 'You'} size={72} />

            <View style={styles.summaryCopy}>
              <Text style={styles.summaryName} numberOfLines={2}>
                {(form.fullName ?? 'Your name').toUpperCase()}
              </Text>
              <Text style={styles.summaryMeta} numberOfLines={2}>
                {[form.role ? selectedRoleLabel : null, form.company]
                  .filter(Boolean)
                  .join(' · ') || 'Complete your profile'}
              </Text>
              <View style={styles.completeBadge}>
                <Text style={styles.completeBadgeText}>{completion}% Complete</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${completion}%` }]} />
              </View>
              <Text style={styles.progressMessage}>{completionMessage(completion)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.mainCard}>
          <EditProfileTabBar active={tab} onChange={setTab} />
          <View style={styles.contentPanel}>{renderTabContent()}</View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
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
          <Text style={styles.saveText}>
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={rolePickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setRolePickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select role</Text>
            <ScrollView style={styles.modalList}>
              {roleOptions.map((option) => {
                const active =
                  form.role === option.id ||
                  form.role === option.label ||
                  selectedRoleLabel === option.label;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.modalOption, active && styles.modalOptionActive]}
                    onPress={() => {
                      setForm((prev) => ({ ...prev, role: option.id }));
                      setRolePickerOpen(false);
                    }}
                  >
                    <Text
                      style={[styles.modalOptionText, active && styles.modalOptionTextActive]}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  previewText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
    letterSpacing: 0.2,
  },
  summaryMeta: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  completeBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#DCFCE7',
  },
  completeBadgeText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 11,
    color: colors.success,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressMessage: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  mainCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 420,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: 4,
    gap: 4,
  },
  tabLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: colors.textMuted,
  },
  tabLabelActive: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary,
  },
  tabIndicator: {
    marginTop: spacing.xs,
    width: '100%',
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabSpacer: {
    marginTop: spacing.xs,
    height: 3,
  },
  contentPanel: {
    padding: spacing.md,
  },
  sectionHeading: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  selectValue: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  groupBlock: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textMuted,
  },
  projectsHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  projectsTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  projectsSubtitle: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  projectThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  projectThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCopy: {
    flex: 1,
    minWidth: 0,
  },
  projectTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  projectMeta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  addProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  addProjectText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    opacity: 0.92,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    maxHeight: '70%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  modalTitle: {
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  modalList: {
    maxHeight: 360,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  modalOptionActive: {
    backgroundColor: colors.primaryMuted,
  },
  modalOptionText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  modalOptionTextActive: {
    color: colors.primaryDark,
  },
});
