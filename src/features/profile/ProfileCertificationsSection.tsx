import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMonthYear } from '@/src/features/profile/profileFormat';
import { ProfileSectionCard } from '@/src/features/profile/ProfileSectionCard';
import { SkillsDiamondRow } from '@/src/features/profile/SkillsDiamondRow';
import type { Certification, ProfessionalProfile } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const LINKEDIN_BLUE = '#0A66C2';
const PREVIEW_COUNT = 2;

export function parseCertifications(profile?: ProfessionalProfile | null): Certification[] {
  const raw = profile?.certifications;
  if (!Array.isArray(raw)) return [];

  const items: Certification[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const cert = item as Certification;
    const name = String(cert.name ?? cert.title ?? '').trim();
    if (!name) continue;
    items.push({
      ...cert,
      name,
      issuer: cert.issuer ? String(cert.issuer) : undefined,
    });
  }
  return items;
}

function CertificationRow({
  cert,
  skills,
}: {
  cert: Certification;
  skills: string[];
}) {
  const issued = formatMonthYear(cert.issuedDate ?? cert.issueDate);
  const certSkills = Array.isArray(cert.skills)
    ? cert.skills.map(String)
    : skills.slice(0, 2);

  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        <Ionicons name="ribbon-outline" size={22} color={LINKEDIN_BLUE} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{cert.name}</Text>
        {cert.issuer ? <Text style={styles.issuer}>{cert.issuer}</Text> : null}
        {issued ? <Text style={styles.meta}>Issued {issued}</Text> : null}
        {cert.credentialId ? (
          <Text style={styles.meta}>Credential ID {cert.credentialId}</Text>
        ) : null}

        {cert.credentialUrl ? (
          <Pressable
            style={styles.credentialBtn}
            onPress={() => Linking.openURL(String(cert.credentialUrl))}
          >
            <Text style={styles.credentialText}>Show credential</Text>
            <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        <SkillsDiamondRow skills={certSkills} />
      </View>
    </View>
  );
}

type Props = {
  profile?: ProfessionalProfile | null;
  fallbackSkills?: string[];
  onEdit?: () => void;
};

export function ProfileCertificationsSection({
  profile,
  fallbackSkills = [],
  onEdit,
}: Props) {
  const certifications = parseCertifications(profile);
  const preview = certifications.slice(0, PREVIEW_COUNT);

  if (!certifications.length) {
    return (
      <ProfileSectionCard title="Licenses & certifications" onAdd={onEdit} onEdit={onEdit}>
        <Text style={styles.empty}>
          Add licenses and certifications when your profile includes them.
        </Text>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard
      title={`Licenses & certifications (${certifications.length})`}
      onAdd={onEdit}
      onEdit={onEdit}
      footer={
        certifications.length > PREVIEW_COUNT
          ? `Show all ${certifications.length} licenses`
          : undefined
      }
      onFooterPress={onEdit}
    >
      {preview.map((cert, index) => (
        <View key={`${cert.name}-${index}`}>
          <CertificationRow cert={cert} skills={fallbackSkills} />
          {index < preview.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  issuer: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  credentialBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  credentialText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  empty: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
