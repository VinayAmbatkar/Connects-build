import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Image,
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
import { BottomSheet } from '@/src/components/BottomSheet';
import { KeyboardAwareScrollView } from '@/src/components/KeyboardAwareScrollView';
import { LocationAutocomplete } from '@/src/components/LocationAutocomplete';
import { usePlaceLabels } from '@/src/hooks/usePlaceLabels';

import { TextField } from '@/src/components/TextField';
import { getErrorMessage } from '@/src/api/client';
import { profileApi } from '@/src/api/profile';
import { projectsApi } from '@/src/api/projects';
import { RoleExpertiseTab } from '@/src/features/profile/RoleExpertiseTab';
import { BusinessVerificationCard } from '@/src/features/profile/BusinessVerificationCard';
import {
  EmploymentTypePicker,
  roleUsesEmploymentType,
} from '@/src/features/profile/EmploymentTypePicker';
import { resolveKycFlow } from '@/src/features/verification/kycLogic';
import {
  LOCK_MESSAGES,
  computeStepLocks,
  isConsumerRole,
} from '@/src/features/profile/profileLocks';
import { setEditProfileOpen } from '@/src/features/profile/profileGate';
import { INVALID_PHONE_MESSAGE, isValidPhoneNumber } from '@/src/utils/phone';
import { useKycProgress } from '@/src/features/verification/useKycVerification';
import {
  buildCategorySelections,
  normalizeOptions,
  normalizeProfileIds,
  resolveOptionLabel,
} from '@/src/features/profile/profileOptions';
import { BIO_MAX_LENGTH } from '@/src/features/profile/profileSkills';
import type { ProfessionalProfile, Project } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { DetailSkeleton } from '@/src/components/Skeleton';

// Same steps, order and rules as the web Profile page
// (Frontend-Tech .../pages/profile/Profile.component.*): Professional Info
// holds the personal *and* company details; each later step unlocks only
// once the one before it is filled in AND saved.
type MainTabId = 'professional' | 'role-expertise' | 'credentials' | 'verification' | 'projects';

type TabDef = {
  id: MainTabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ALL_TABS: TabDef[] = [
  { id: 'professional', label: 'Professional Info', icon: 'person-outline' },
  { id: 'role-expertise', label: 'Role & Expertise', icon: 'git-network-outline' },
  { id: 'credentials', label: 'Licenses', icon: 'ribbon-outline' },
  { id: 'verification', label: 'Get Verified', icon: 'shield-checkmark-outline' },
  { id: 'projects', label: 'Projects', icon: 'images-outline' },
];

/** Consumers only have Professional Info and Get Verified on the web. */
const CONSUMER_TABS: MainTabId[] = ['professional', 'verification'];

const BUSINESS_SIZES = [
  { id: '1_10', label: '1–10' },
  { id: '11_50', label: '11–50' },
  { id: '51_200', label: '51–200' },
  { id: '201_500', label: '201–500' },
  { id: '500_PLUS', label: '500+' },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
/** Current year back to 1950, newest first (web establishmentYearOptions). */
const ESTABLISHMENT_YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => CURRENT_YEAR - i);

const MAX_EMAIL_DOMAINS = 5;

/** Free webmail providers -- mirrors the web list and the backend's
 *  internal/auth/email_domains.go, which is the real gate. */
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com',
  'rediffmail.com', 'zoho.com', 'zohomail.in', 'yandex.com', 'gmx.com', 'mail.com',
]);

const WEBSITE_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;


type FormErrors = Partial<
  Record<
    | 'fullName'
    | 'phoneNumber'
    | 'company'
    | 'website'
    | 'firmLocations'
    | 'workEmail'
    | 'emailDomain'
    | 'role'
    | 'discipline',
    string
  >
>;

/** Older app builds stored the links as a JSON string in `socialMedia`;
 *  the backend's real fields are linkedin / instagram / x. */
function readSocial(raw: Record<string, unknown>) {
  let legacy: { linkedIn?: string; instagram?: string; twitter?: string } = {};
  if (typeof raw.socialMedia === 'string' && raw.socialMedia) {
    try {
      legacy = JSON.parse(raw.socialMedia);
    } catch {
      legacy = {};
    }
  }
  const pick = (...values: unknown[]) =>
    String(values.find((v) => typeof v === 'string' && v.trim()) ?? '');
  return {
    linkedin: pick(raw.linkedin, raw.linkedIn, legacy.linkedIn),
    instagram: pick(raw.instagram, legacy.instagram),
    x: pick(raw.x, raw.twitter, legacy.twitter),
  };
}

function parseMainTab(tab?: string): MainTabId {
  const normalized = String(tab ?? '').toLowerCase();
  const aliases: Record<string, MainTabId> = {
    professional: 'professional',
    profile: 'professional',
    contact: 'professional',
    company: 'professional',
    organization: 'professional',
    expertise: 'role-expertise',
    'role-expertise': 'role-expertise',
    role: 'role-expertise',
    credentials: 'credentials',
    licenses: 'credentials',
    projects: 'projects',
    verification: 'verification',
  };
  return aliases[normalized] ?? 'professional';
}

function completionMessage(percent: number) {
  if (percent >= 100) return 'Great! Your profile is complete.';
  if (percent >= 60) return 'Almost there — just a few details left.';
  if (percent >= 30) return 'Good progress. Keep filling in your profile.';
  return 'Add more details to strengthen your profile.';
}

/** Uppercase letters, digits, "." and spaces only -- same rule as signup
 *  and the web profile's full-name field. */
function normalizeFullName(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9. ]/g, '');
}

function isPersonalEmail(email: string) {
  const value = email.trim().toLowerCase();
  const at = value.lastIndexOf('@');
  return at > 0 && PUBLIC_EMAIL_DOMAINS.has(value.slice(at + 1));
}

/** Web projectsStepComplete: at least one saved project, each with a name,
 *  description and photo. */
function areProjectsComplete(projects: Project[]) {
  if (!projects.length) return false;
  return projects.every(
    (p) =>
      String(p.name ?? p.title ?? '').trim() &&
      String(p.description ?? '').trim() &&
      Array.isArray(p.photos) &&
      p.photos.length > 0,
  );
}

function ProjectRow({ project }: { project: Project }) {
  const title = project.name ?? project.title ?? 'Untitled project';
  const imageUrl = Array.isArray(project.photos) ? project.photos[0] : undefined;
  const year = project.endDate
    ? String(project.endDate).slice(0, 4)
    : project.startDate
      ? String(project.startDate).slice(0, 4)
      : null;

  return (
    <Pressable
      style={styles.projectRow}
      onPress={() =>
        router.push({ pathname: '/projects', params: { id: String(project.id) } })
      }
      accessibilityRole="button"
      accessibilityLabel={`Edit ${title}`}
    >
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
        {year ? <Text style={styles.projectMeta}>{year}</Text> : null}
      </View>
      <Ionicons name="pencil" size={16} color={colors.textMuted} />
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

function GroupTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.groupTitle}>{children}</Text>;
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

function ReadOnlyField({ label, value, hint, required }: {
  label: string;
  value: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText} numberOfLines={1}>
          {value || '—'}
        </Text>
        <Ionicons name="lock-closed-outline" size={15} color={colors.textMuted} />
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function LockedPanel({ message, actionLabel, onAction }: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.lockedPanel}>
      <View style={styles.lockedIcon}>
        <Ionicons name="lock-closed" size={20} color={colors.primary} />
      </View>
      <Text style={styles.lockedTitle}>This step is locked</Text>
      <Text style={styles.lockedBody}>{message}</Text>
      <Pressable style={styles.lockedBtn} onPress={onAction} accessibilityRole="button">
        <Text style={styles.lockedBtnText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

type TabBarProps = {
  tabs: TabDef[];
  active: MainTabId;
  locked: Partial<Record<MainTabId, boolean>>;
  onPress: (tab: MainTabId) => void;
};

function EditProfileTabBar({ tabs, active, locked, onPress }: TabBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Partial<Record<MainTabId, number>>>({});

  // Keep the active tab in view when it changes (e.g. after "Continue").
  useEffect(() => {
    const x = positions.current[active];
    if (x != null) scrollRef.current?.scrollTo({ x: Math.max(0, x - 24), animated: true });
  }, [active]);

  return (
    <View style={styles.tabBarWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          const isLocked = !!locked[tab.id];
          const tint = isActive ? colors.primary : colors.textMuted;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onPress(tab.id)}
              onLayout={(e) => {
                positions.current[tab.id] = e.nativeEvent.layout.x;
              }}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive, disabled: isLocked }}
              accessibilityLabel={isLocked ? `${tab.label}, locked` : tab.label}
            >
              <View>
                <Ionicons name={tab.icon} size={21} color={isLocked ? colors.border : tint} />
                {isLocked ? (
                  <View style={styles.tabLockBadge}>
                    <Ionicons name="lock-closed" size={9} color={colors.white} />
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  isLocked && styles.tabLabelLocked,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function EditProfileScreen() {
  const params = useLocalSearchParams<{ tab?: string; onboarding?: string }>();
  const isSignupOnboarding = String(params.onboarding ?? '') === '1';
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<MainTabId>(() => parseMainTab(params.tab));
  const [form, setForm] = useState<ProfessionalProfile>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [firmLocationPickerOpen, setFirmLocationPickerOpen] = useState(false);
  const [serviceLocationPickerOpen, setServiceLocationPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [emailDomainInput, setEmailDomainInput] = useState('');

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

  const saved = profileQuery.data;

  // While this screen is up, a gated request elsewhere shouldn't pop a
  // "go to Edit Profile" prompt -- the user is already here.
  useEffect(() => {
    setEditProfileOpen(true);
    return () => setEditProfileOpen(false);
  }, []);

  // A professional who still owes company / role / discipline. No popup
  // here: people arrive from that very popup (Home / Discover / Profile
  // tabs) or from signup.
  const gatedProfile =
    !!saved && saved.profileComplete === false && !isConsumerRole(saved.role);
  const { progress: kycProgress, isLoading: kycLoading } = useKycProgress(
    resolveKycFlow(saved?.role, saved?.employmentType),
    saved?.verified,
  );
  const firmLocationLabels = usePlaceLabels(form.firmLocationIds ?? []);
  const serviceLocationLabels = usePlaceLabels(form.serviceLocations ?? []);

  useEffect(() => {
    if (!profileQuery.data) return;
    const raw = profileQuery.data as Record<string, unknown>;
    setForm({
      ...profileQuery.data,
      ...normalizeProfileIds(raw),
      ...readSocial(raw),
      fullName: normalizeFullName(String(profileQuery.data.fullName ?? '')),
      emailDomains: Array.isArray(raw.emailDomains) ? raw.emailDomains.map(String) : [],
    });
  }, [profileQuery.data]);

  useEffect(() => {
    if (params.tab) setTab(parseMainTab(params.tab));
  }, [params.tab]);

  const roleOptions = normalizeOptions(optionsQuery.data?.roles);
  const specializationOptions = normalizeOptions(optionsQuery.data?.specializations);
  const selectedRoleLabel =
    resolveOptionLabel(roleOptions, form.role) ?? form.role ?? 'Select role';

  const isConsumer = isConsumerRole(form.role ?? saved?.role);
  const liveFlow = resolveKycFlow(form.role, form.employmentType);
  const isEmployeeFlow = liveFlow === 'employee';
  const isBusinessFlow = liveFlow === 'business';
  const businessVerified =
    kycProgress.flow === 'business' && kycProgress.secondDone && !kycLoading;
  const projects = Array.isArray(projectsQuery.data) ? projectsQuery.data : [];
  const emailDomains = (form.emailDomains as string[] | undefined) ?? [];

  // ── Step locks (web roleStepLocked / projectsRoleChainLocked /
  //    credentialsStepLocked / projectsStepLocked) ──────────────────────
  const {
    basicInfoComplete,
    roleExpertiseComplete,
    roleStepLocked,
    roleChainLocked,
    credentialsLocked,
    projectsLocked,
  } = computeStepLocks({ live: form, saved, verificationComplete: kycProgress.complete });
  const locked: Partial<Record<MainTabId, boolean>> = {
    'role-expertise': roleStepLocked,
    credentials: credentialsLocked,
    projects: projectsLocked,
  };

  const tabs = isConsumer ? ALL_TABS.filter((t) => CONSUMER_TABS.includes(t.id)) : ALL_TABS;
  const activeTab: MainTabId = tabs.some((t) => t.id === tab) ? tab : 'professional';

  // Web progress: Professional Info / Role & Expertise / Projects (consumers: 2 steps).
  const completion = useMemo(() => {
    const steps = isConsumer ? 2 : 3;
    let done = 0;
    if (basicInfoComplete) done++;
    if (roleExpertiseComplete) done++;
    if (!isConsumer && areProjectsComplete(projects)) done++;
    return Math.round((done / steps) * 100);
  }, [isConsumer, basicInfoComplete, roleExpertiseComplete, projects]);

  const onTabPress = (next: MainTabId) => {
    if (next === 'role-expertise' && locked['role-expertise']) {
      appAlert('This step is locked', LOCK_MESSAGES.role);
      return;
    }
    if (next === 'credentials' && credentialsLocked) {
      appAlert('This step is locked', LOCK_MESSAGES.credentials);
      return;
    }
    if (next === 'projects' && projectsLocked) {
      if (roleChainLocked) {
        appAlert('This step is locked', LOCK_MESSAGES.projectsRole);
      } else {
        appAlert('This step is locked', LOCK_MESSAGES.projectsVerify, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Continue to Verification', onPress: () => setTab('verification') },
        ]);
      }
      return;
    }
    setTab(next);
  };

  const validateProfessional = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.fullName?.trim()) next.fullName = 'Please add your full name.';
    const phone = form.phoneNumber?.trim() ?? '';
    if (!phone) next.phoneNumber = 'Phone number is required.';
    else if (!isValidPhoneNumber(phone, form.phoneCountryCode)) next.phoneNumber = INVALID_PHONE_MESSAGE;
    const website = form.website?.trim();
    if (website && !WEBSITE_PATTERN.test(website.toLowerCase())) {
      next.website = 'Please enter a valid website URL (e.g. https://yourcompany.com)';
    }
    if (isConsumer) return next;

    if (!form.company?.trim()) next.company = 'Please add your company name.';
    if (!isEmployeeFlow && !(form.firmLocationIds?.length ?? 0)) {
      next.firmLocations = 'Add at least one firm location.';
    }
    if (isEmployeeFlow) {
      const workEmail = String(form.workEmail ?? '').trim();
      if (!workEmail) next.workEmail = 'Enter your work email at this company.';
      else if (!EMAIL_PATTERN.test(workEmail)) next.workEmail = 'Enter a valid company work email address.';
      else if (isPersonalEmail(workEmail)) {
        next.workEmail =
          "Use your company email — personal addresses like Gmail can't be verified as a work email.";
      } else if (workEmail.toLowerCase() === String(form.email ?? '').trim().toLowerCase()) {
        next.workEmail = 'This is your login email — enter the email your company gave you.';
      }
    }
    return next;
  };

  const validateRole = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.role?.trim()) next.role = 'Please select a role.';
    if (!isConsumer && !(form.disciplineIds?.length ?? 0)) {
      next.discipline = 'Please select at least one discipline.';
    }
    return next;
  };

  const buildPayload = (): ProfessionalProfile => {
    // Drop the legacy social fields the backend never read.
    const { socialMedia: _s, linkedIn: _l, twitter: _t, ...rest } = form;
    const tree = buildCategorySelections(form, saved?.categorySelections, specializationOptions);
    return {
      ...rest,
      fullName: form.fullName?.trim(),
      yearsExperience: Number(form.yearsExperience) || 0,
      establishmentYear: Number(form.establishmentYear) || 0,
      categorySelections: tree ?? [],
      // Only organisations whitelist employee domains (backend enforces too).
      emailDomains: isBusinessFlow ? emailDomains : [],
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (section: 'professional' | 'role-expertise') => {
      // Captured before saving: the refetch below flips `gatedProfile`.
      const wasGated = gatedProfile;
      await profileApi.save(buildPayload());
      return { section, wasGated };
    },
    onSuccess: async ({ section, wasGated }) => {
      // Wait for the fresh profile so the step locks reflect the save.
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      // Employment type decides the verification flow.
      void queryClient.invalidateQueries({ queryKey: ['verification-status'] });

      // Short labels so the two buttons sit on one line each.
      if (section === 'professional' && !isConsumer) {
        appAlert('Professional Info saved', 'Next: add your role and expertise.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Continue', onPress: () => setTab('role-expertise') },
        ]);
      } else if (
        section === 'role-expertise' &&
        wasGated &&
        queryClient.getQueryData<ProfessionalProfile>(['my-profile'])?.profileComplete
      ) {
        // This save is what completed the profile -- everything unlocks now.
        appAlert('Your profile is ready', 'You can now use everything on CoBilds.', [
          { text: 'Add licenses', style: 'cancel', onPress: () => setTab('credentials') },
          { text: 'Go to Home', onPress: () => router.replace('/(tabs)/feed') },
        ]);
      } else if (section === 'role-expertise') {
        appAlert('Role & Expertise saved', 'Next: add your licenses and certifications.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Continue', onPress: () => setTab('credentials') },
        ]);
      } else {
        appAlert('Saved', 'Your profile was updated.');
      }
    },
    onError: (error) => appAlert('Save failed', getErrorMessage(error)),
  });

  const onSave = () => {
    const section = activeTab === 'role-expertise' ? 'role-expertise' : 'professional';
    const nextErrors = section === 'professional' ? validateProfessional() : validateRole();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      appAlert('A few details are missing', Object.values(nextErrors).join('\n'));
      return;
    }
    saveMutation.mutate(section);
  };

  if (profileQuery.isLoading) return <DetailSkeleton />;

  const set = (key: keyof ProfessionalProfile, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const addEmailDomain = () => {
    const domain = emailDomainInput.trim().toLowerCase().replace(/^@/, '');
    if (!domain) return;
    let error = '';
    if (!DOMAIN_PATTERN.test(domain)) error = 'Enter a valid domain, e.g. yourcompany.com';
    else if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
      error = `@${domain} is a public email provider and can't be whitelisted.`;
    } else if (emailDomains.length >= MAX_EMAIL_DOMAINS) {
      error = `You can whitelist up to ${MAX_EMAIL_DOMAINS} domains.`;
    }
    setErrors((prev) => ({ ...prev, emailDomain: error || undefined }));
    if (error) return;
    if (!emailDomains.includes(domain)) set('emailDomains', [...emailDomains, domain]);
    setEmailDomainInput('');
  };

  const renderLocationChips = (
    ids: string[],
    labels: string[],
    onRemove: (index: number) => void,
  ) =>
    ids.length ? (
      <View style={styles.chips}>
        {ids.map((id, index) => (
          <Pressable
            key={`${id}-${index}`}
            style={styles.chip}
            onPress={() => onRemove(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${labels[index] ?? 'location'}`}
          >
            <Text style={styles.chipText}>{labels[index] ?? 'Location'}</Text>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    ) : null;

  const renderProfessional = () => (
    <View>
      <SectionHeading
        title={isConsumer ? 'Personal details' : 'Professional details'}
        subtitle="Keep your contact details and company information current."
      />

      <GroupTitle>{isConsumer ? 'Personal Info' : 'Professional Info'}</GroupTitle>
      <TextField
        label="Full name"
        required
        autoCapitalize="characters"
        placeholder="JANE DOE"
        value={String(form.fullName ?? '')}
        onChangeText={(v) => set('fullName', normalizeFullName(v))}
        error={errors.fullName}
      />
      {!errors.fullName ? (
        <Text style={[styles.fieldHint, styles.hintUnderField]}>
          Full name as per Aadhaar card or PAN
        </Text>
      ) : null}

      <ReadOnlyField
        label="Email"
        required
        value={String(form.email ?? '')}
        hint="This can't be changed here. Contact support if you need to update it."
      />

      <TextField
        label="Phone number"
        required
        keyboardType="phone-pad"
        maxLength={15}
        placeholder="98765 43210"
        value={String(form.phoneNumber ?? '')}
        onChangeText={(v) => set('phoneNumber', v.replace(/[^0-9]/g, '').slice(0, 15))}
        // Say so as soon as they leave the field, not only on Save.
        onBlur={() => {
          const phone = String(form.phoneNumber ?? '').trim();
          setErrors((prev) => ({
            ...prev,
            phoneNumber: !phone
              ? 'Phone number is required.'
              : isValidPhoneNumber(phone, form.phoneCountryCode)
                ? undefined
                : INVALID_PHONE_MESSAGE,
          }));
        }}
        error={errors.phoneNumber}
      />

      {!isConsumer ? (
        <>
          <TextField
            label="Years of experience"
            keyboardType="number-pad"
            placeholder="e.g. 8"
            maxLength={2}
            value={form.yearsExperience ? String(form.yearsExperience) : ''}
            onChangeText={(v) => {
              const years = Math.min(60, Number(v.replace(/[^0-9]/g, '')) || 0);
              set('yearsExperience', years);
            }}
          />
          <TextField
            label="About"
            multiline
            placeholder="Tell others about your experience and what you're working on..."
            style={styles.multiline}
            value={String(form.bio ?? '')}
            onChangeText={(v) => set('bio', v.slice(0, BIO_MAX_LENGTH))}
          />
          <TextField
            label="LinkedIn"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="linkedin.com/in/yourname"
            value={String(form.linkedin ?? '')}
            onChangeText={(v) => set('linkedin', v)}
          />
          <TextField
            label="Instagram"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="instagram.com/yourhandle"
            value={String(form.instagram ?? '')}
            onChangeText={(v) => set('instagram', v)}
          />
          <TextField
            label="X"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="x.com/yourhandle"
            value={String(form.x ?? '')}
            onChangeText={(v) => set('x', v)}
          />

          <View style={styles.groupDivider} />
          <GroupTitle>Company Information</GroupTitle>
          <TextField
            label="Company"
            required
            placeholder="Your company name"
            value={String(form.company ?? '')}
            onChangeText={(v) => set('company', v)}
            error={errors.company}
          />
          <TextField
            label="Website"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://yourcompany.com"
            value={String(form.website ?? '')}
            onChangeText={(v) => set('website', v)}
            error={errors.website}
          />

          <View style={styles.fieldBlock}>
            <FieldLabel required={!isEmployeeFlow}>Firm location(s)</FieldLabel>
            <Pressable
              style={[styles.picker, errors.firmLocations ? styles.pickerError : null]}
              onPress={() => setFirmLocationPickerOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <Text style={styles.pickerPlaceholder}>Add company location</Text>
              <Ionicons name="add" size={18} color={colors.primary} />
            </Pressable>
            {renderLocationChips(form.firmLocationIds ?? [], firmLocationLabels, (index) =>
              set(
                'firmLocationIds',
                (form.firmLocationIds ?? []).filter((_, i) => i !== index),
              ),
            )}
            {errors.firmLocations ? (
              <Text style={styles.errorText}>{errors.firmLocations}</Text>
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <FieldLabel>Service location(s)</FieldLabel>
            <Pressable
              style={styles.picker}
              onPress={() => setServiceLocationPickerOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="navigate-outline" size={18} color={colors.textMuted} />
              <Text style={styles.pickerPlaceholder}>Add area you serve</Text>
              <Ionicons name="add" size={18} color={colors.primary} />
            </Pressable>
            {renderLocationChips(form.serviceLocations ?? [], serviceLocationLabels, (index) =>
              set(
                'serviceLocations',
                (form.serviceLocations ?? []).filter((_, i) => i !== index),
              ),
            )}
          </View>

          <View style={styles.fieldBlock}>
            <FieldLabel>
              Business size <Text style={styles.optionalNote}>(No. of Employees)</Text>
            </FieldLabel>
            <View style={styles.sizeRow}>
              {BUSINESS_SIZES.map((size) => {
                const active = form.businessSize === size.id;
                return (
                  <Pressable
                    key={size.id}
                    onPress={() => set('businessSize', active ? '' : size.id)}
                    style={[styles.sizeChip, active && styles.sizeChipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.sizeChipText, active && styles.sizeChipTextActive]}>
                      {size.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <FieldLabel>Year of establishment</FieldLabel>
            <Pressable
              style={styles.picker}
              onPress={() => setYearPickerOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text
                style={[
                  styles.pickerPlaceholder,
                  form.establishmentYear ? styles.pickerValue : null,
                ]}
              >
                {form.establishmentYear ? String(form.establishmentYear) : 'Select year'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {isEmployeeFlow ? (
            <View>
              <TextField
                label="Work email"
                required
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@yourcompany.com"
                value={String(form.workEmail ?? '')}
                onChangeText={(v) => set('workEmail', v)}
                error={errors.workEmail}
              />
              {!errors.workEmail ? (
                <Text style={[styles.fieldHint, styles.hintUnderField]}>
                  Only visible to you. You'll confirm it with a one-time code in Get Verified.
                </Text>
              ) : null}
            </View>
          ) : null}

          {isBusinessFlow ? (
            <View style={styles.fieldBlock}>
              <FieldLabel>
                Whitelisted employee email domains{' '}
                <Text style={styles.optionalNote}>(optional)</Text>
              </FieldLabel>
              {!businessVerified ? (
                <View style={styles.domainsLocked}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.domainsLockedText}>
                    Only verified businesses can whitelist employee email domains. Verify your
                    business (GST) first.
                  </Text>
                  <Pressable onPress={() => setTab('verification')} hitSlop={6}>
                    <Text style={styles.linkText}>Verify business</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={[styles.fieldHint, { marginBottom: spacing.sm }]}>
                    Employees who select your organization during verification can only verify a
                    work email on these domains, e.g. @vshop.com.
                  </Text>
                  <TextField
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="@yourcompany.com"
                    value={emailDomainInput}
                    editable={emailDomains.length < MAX_EMAIL_DOMAINS}
                    onChangeText={(v) => {
                      setEmailDomainInput(v);
                      if (errors.emailDomain) setErrors((p) => ({ ...p, emailDomain: undefined }));
                    }}
                    onSubmitEditing={addEmailDomain}
                    returnKeyType="done"
                    error={errors.emailDomain}
                    rightAddon={
                      <Pressable
                        onPress={addEmailDomain}
                        disabled={!emailDomainInput.trim()}
                        hitSlop={6}
                      >
                        <Text
                          style={[
                            styles.linkText,
                            !emailDomainInput.trim() && styles.linkTextDisabled,
                          ]}
                        >
                          Add
                        </Text>
                      </Pressable>
                    }
                  />
                  {emailDomains.length ? (
                    <View style={styles.chips}>
                      {emailDomains.map((domain) => (
                        <Pressable
                          key={domain}
                          style={styles.chip}
                          onPress={() =>
                            set('emailDomains', emailDomains.filter((d) => d !== domain))
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Remove @${domain}`}
                        >
                          <Text style={styles.chipText}>@{domain}</Text>
                          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const renderRoleSection = () => (
    <View style={styles.roleSection}>
      <ReadOnlyField
        label="Role"
        required
        value={selectedRoleLabel}
        hint="Your role is set when you sign up. Contact support to change it."
      />
      {roleUsesEmploymentType(form.role) ? (
        <EmploymentTypePicker
          value={form.employmentType}
          savedValue={saved?.employmentType}
          onChange={(value) => set('employmentType', value)}
        />
      ) : null}
    </View>
  );

  const credentialCount =
    (Array.isArray(form.licenses) ? form.licenses.length : 0) +
    (Array.isArray(form.certifications) ? form.certifications.length : 0);
  const credentialNames = [...(form.licenses ?? []), ...(form.certifications ?? [])]
    .map((c) => c.name || c.bodyShortName || c.issuerName)
    .filter(Boolean)
    .slice(0, 3);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'professional':
        return renderProfessional();

      case 'role-expertise':
        if (locked['role-expertise']) {
          return (
            <LockedPanel
              message={LOCK_MESSAGES.role}
              actionLabel="Go to Professional Info"
              onAction={() => setTab('professional')}
            />
          );
        }
        return (
          <RoleExpertiseTab
            form={form}
            options={optionsQuery.data}
            onChange={(next) => {
              setForm(next);
              if (errors.discipline) setErrors((p) => ({ ...p, discipline: undefined }));
            }}
            roleSection={renderRoleSection()}
            error={errors.discipline}
          />
        );

      case 'credentials':
        if (credentialsLocked) {
          return (
            <LockedPanel
              message={LOCK_MESSAGES.credentials}
              actionLabel="Go to Role & Expertise"
              onAction={() => onTabPress('role-expertise')}
            />
          );
        }
        return (
          <View>
            <SectionHeading
              title="Licenses & Certifications"
              subtitle="Optional — add licences and certificates to build trust."
            />
            {credentialCount ? (
              <View style={styles.credentialSummary}>
                <Ionicons name="ribbon" size={20} color={colors.primary} />
                <View style={styles.flex}>
                  <Text style={styles.credentialCount}>
                    {credentialCount} added
                  </Text>
                  {credentialNames.length ? (
                    <Text style={styles.credentialNames} numberOfLines={2}>
                      {credentialNames.join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            <Pressable
              style={styles.outlineBtn}
              onPress={() => router.push('/credentials')}
              accessibilityRole="button"
            >
              <Ionicons
                name={credentialCount ? 'pencil' : 'add'}
                size={17}
                color={colors.primary}
              />
              <Text style={styles.outlineBtnText}>
                {credentialCount ? 'Manage licenses & certifications' : 'Add license or certification'}
              </Text>
            </Pressable>
          </View>
        );

      case 'projects':
        if (projectsLocked) {
          return roleChainLocked ? (
            <LockedPanel
              message={LOCK_MESSAGES.projectsRole}
              actionLabel="Go to Role & Expertise"
              onAction={() => onTabPress('role-expertise')}
            />
          ) : (
            <LockedPanel
              message={LOCK_MESSAGES.projectsVerify}
              actionLabel="Continue to Verification"
              onAction={() => setTab('verification')}
            />
          );
        }
        return (
          <View>
            <View style={styles.projectsHeader}>
              <View style={styles.flex}>
                <Text style={styles.sectionTitle}>Projects</Text>
                <Text style={styles.sectionSubtitle}>Showcase your completed work.</Text>
              </View>
              {projects.length ? (
                <Pressable
                  style={styles.smallAddBtn}
                  onPress={() => router.push('/projects')}
                  accessibilityRole="button"
                  accessibilityLabel="Add project"
                  hitSlop={6}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.smallAddText}>Add</Text>
                </Pressable>
              ) : null}
            </View>
            {projects.length ? (
              projects.map((project) => <ProjectRow key={String(project.id)} project={project} />)
            ) : (
              <Pressable
                style={styles.outlineBtn}
                onPress={() => router.push('/projects')}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.outlineBtnText}>Add Project</Text>
              </Pressable>
            )}
          </View>
        );

      case 'verification':
        return (
          <View>
            <SectionHeading
              title="Get Verified"
              subtitle="Track your verification steps and verified profile status."
            />
            {kycLoading ? (
              <Text style={styles.verificationLoading}>Loading verification status...</Text>
            ) : kycProgress.complete ? (
              <Pressable
                style={styles.verifiedState}
                onPress={() => router.push('/verification')}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark-circle" size={30} color={colors.success} />
                <View style={styles.verifiedCopy}>
                  <Text style={styles.verifiedTitle}>Profile verified</Text>
                  <Text style={styles.verifiedDescription}>
                    Your required verification steps are complete. Your verified badge is shown on your profile.
                  </Text>
                  <Text style={styles.linkText}>View verification details</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ) : (
              <View style={styles.verificationPromoWrap}>
                <BusinessVerificationCard
                  progress={kycProgress}
                  onPress={() => router.push('/verification')}
                />
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  // Only these two steps save from here; Licenses / Projects / Get Verified
  // each save on their own screens.
  const showSave =
    activeTab === 'professional' || (activeTab === 'role-expertise' && !locked['role-expertise']);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.topBarBtn}
          onPress={() =>
            // Until the profile is complete the tabs would only bounce back
            // here, so Back goes to My Profile (always open) instead.
            gatedProfile ? router.replace('/(tabs)/profile') : router.back()
          }
          hitSlop={8}
          accessibilityLabel="Back"
        >
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

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: showSave ? spacing.lg : spacing.xl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        // The step tabs stay pinned under the top bar while scrolling.
        stickyHeaderIndices={[1]}
      >
        <View style={styles.headerBlock}>
          {isSignupOnboarding ? (
            <View style={styles.onboardingPrompt}>
              <View style={styles.onboardingIcon}>
                <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.onboardingText}>
                  Add your experience, expertise, and projects so clients can discover you and feel confident connecting.
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.summaryCard}>
            <Avatar name={form.fullName ?? 'You'} size={60} />
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryName} numberOfLines={1}>
                {(form.fullName ?? 'Your name').toUpperCase()}
              </Text>
              <Text style={styles.summaryMeta} numberOfLines={1}>
                {[form.role ? selectedRoleLabel : null, form.company]
                  .filter(Boolean)
                  .join(' · ') || 'Complete your profile'}
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${completion}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{completion}%</Text>
              </View>
              <Text style={styles.progressMessage}>{completionMessage(completion)}</Text>
            </View>
          </View>
        </View>

        <EditProfileTabBar tabs={tabs} active={activeTab} locked={locked} onPress={onTabPress} />

        <View style={styles.contentCard}>{renderTabContent()}</View>
      </KeyboardAwareScrollView>

      {showSave ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Pressable
            accessibilityRole="button"
            onPress={onSave}
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
      ) : null}

      <LocationAutocomplete
        visible={firmLocationPickerOpen}
        onClose={() => setFirmLocationPickerOpen(false)}
        onSelect={(location) => {
          const value = location.placeId || location.name;
          set('firmLocationIds', [...new Set([...(form.firmLocationIds ?? []), value])]);
          setFirmLocationPickerOpen(false);
        }}
        placeholder="Search company locations"
      />
      <LocationAutocomplete
        visible={serviceLocationPickerOpen}
        onClose={() => setServiceLocationPickerOpen(false)}
        onSelect={(location) => {
          const value = location.placeId || location.name;
          set('serviceLocations', [...new Set([...(form.serviceLocations ?? []), value])]);
          setServiceLocationPickerOpen(false);
        }}
        placeholder="Search areas you serve"
      />
      <BottomSheet
        visible={yearPickerOpen}
        title="Year of establishment"
        onClose={() => setYearPickerOpen(false)}
        tall
      >
        {form.establishmentYear ? (
          <Pressable
            style={styles.yearRow}
            onPress={() => {
              set('establishmentYear', undefined);
              setYearPickerOpen(false);
            }}
          >
            <Text style={styles.yearClear}>Clear selection</Text>
          </Pressable>
        ) : null}
        {ESTABLISHMENT_YEARS.map((year) => {
          const active = form.establishmentYear === year;
          return (
            <Pressable
              key={year}
              style={[styles.yearRow, active && styles.yearRowActive]}
              onPress={() => {
                set('establishmentYear', year);
                setYearPickerOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.yearText, active && styles.yearTextActive]}>{year}</Text>
              {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    flexGrow: 1,
  },
  headerBlock: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  onboardingPrompt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F6D6B6',
    backgroundColor: '#FFF8F1',
  },
  onboardingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE9D5',
  },
  onboardingTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  onboardingText: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
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
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressPercent: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.primary,
  },
  progressMessage: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  tabBarWrap: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tabBar: {
    paddingHorizontal: spacing.xs,
  },
  tabItem: {
    minWidth: 84,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  tabLockBadge: {
    position: 'absolute',
    right: -7,
    bottom: -3,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textMuted,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  tabLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  tabLabelActive: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary,
  },
  tabLabelLocked: {
    color: colors.textMuted,
    opacity: 0.7,
  },
  tabIndicator: {
    marginTop: spacing.xs,
    alignSelf: 'stretch',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabIndicatorActive: {
    backgroundColor: colors.primary,
  },
  contentCard: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
  groupTitle: {
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  groupDivider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  optionalNote: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  required: {
    color: colors.danger,
  },
  fieldHint: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  hintUnderField: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.danger,
  },
  readOnlyBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  readOnlyText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  picker: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pickerError: {
    borderColor: colors.danger,
  },
  pickerPlaceholder: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textMuted,
  },
  pickerValue: {
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.text,
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  sizeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  sizeChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  sizeChipTextActive: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.primaryDark,
  },
  domainsLocked: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  domainsLockedText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  linkText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  linkTextDisabled: {
    color: colors.textMuted,
  },
  roleSection: {
    marginBottom: spacing.sm,
  },
  lockedPanel: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  lockedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
    marginBottom: spacing.sm,
  },
  lockedTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  lockedBody: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  lockedBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  lockedBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  credentialSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  credentialCount: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  credentialNames: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  projectsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  smallAddText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
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
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  outlineBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  verificationLoading: {
    paddingVertical: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  verificationPromoWrap: {
    marginHorizontal: -spacing.md,
  },
  verifiedState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  verifiedCopy: {
    flex: 1,
    gap: 4,
  },
  verifiedTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.success,
  },
  verifiedDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  yearRowActive: {
    backgroundColor: colors.primaryMuted,
  },
  yearText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.text,
  },
  yearTextActive: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.primaryDark,
  },
  yearClear: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
  footer: {
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
});
