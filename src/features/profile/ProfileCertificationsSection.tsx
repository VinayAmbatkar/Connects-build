import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSectionCard } from '@/src/features/profile/ProfileSectionCard';
import { formatMonthYear, issuerLabel } from '@/src/features/credentials/credentialLogic';
import type { Credential } from '@/src/api/credentials';
import type { ProfessionalProfile } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { openInApp } from '@/src/utils/openInApp';
const LINKEDIN_BLUE = '#0A66C2';
const PREVIEW_COUNT = 3;

/** Licences first, then certifications -- the shape the backend embeds in
 *  every profile response (`licenses` + `certifications`). */
export function parseCredentials(profile?: ProfessionalProfile | null): Credential[] {
  const licenses = Array.isArray(profile?.licenses) ? profile.licenses : [];
  const certifications = Array.isArray(profile?.certifications) ? profile.certifications : [];
  return [...licenses, ...certifications].filter((c) => c && typeof c === 'object' && (c.name || c.issuerName));
}

function CredentialRow({ cred }: { cred: Credential }) {
  const isLicense = cred.kind === 'LICENSE';
  const title = cred.name || issuerLabel(cred);
  const issuer = cred.name ? issuerLabel(cred) : '';
  const issued = formatMonthYear(cred.issueDate) || (cred.issueYear ? String(cred.issueYear) : '');
  const expires = formatMonthYear(cred.expiryDate);

  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        <Ionicons name={isLicense ? 'shield-checkmark-outline' : 'ribbon-outline'} size={22} color={LINKEDIN_BLUE} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {issuer ? <Text style={styles.issuer}>{issuer}</Text> : null}
        {issued || expires ? (
          <Text style={styles.meta}>
            {issued ? `Issued ${issued}` : ''}
            {issued && (expires || cred.expired) ? ' · ' : ''}
            {cred.expired ? 'Expired' : expires ? `Expires ${expires}` : ''}
          </Text>
        ) : null}
        {cred.credentialNumber ? (
          <Text style={styles.meta}>
            {isLicense ? 'Reg. no.' : 'Credential ID'} {cred.credentialNumber}
          </Text>
        ) : null}

        <View style={styles.links}>
          {cred.credentialUrl ? (
            <Pressable
              accessibilityRole="link"
              style={styles.credentialBtn}
              onPress={() => openInApp(cred.credentialUrl)}
            >
              <Text style={styles.credentialText}>Show credential</Text>
              <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
            </Pressable>
          ) : null}
          {cred.documentUrl ? (
            <Pressable
              accessibilityRole="link"
              style={styles.credentialBtn}
              onPress={() => openInApp(cred.documentUrl, cred.name)}
            >
              <Text style={styles.credentialText}>View certificate</Text>
              <Ionicons name="document-outline" size={14} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type Props = {
  profile?: ProfessionalProfile | null;
  /** Omit on someone else's profile (read-only). */
  onEdit?: () => void;
};

export function ProfileCertificationsSection({ profile, onEdit }: Props) {
  const credentials = parseCredentials(profile);
  const preview = credentials.slice(0, PREVIEW_COUNT);

  if (!credentials.length) {
    if (!onEdit) return null;
    return (
      <ProfileSectionCard title="Licenses & certifications" onAdd={onEdit} onEdit={onEdit}>
        <Text style={styles.empty}>
          Add your licenses, registrations and professional certificates to build trust and get verified.
        </Text>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard
      title={`Licenses & certifications (${credentials.length})`}
      onAdd={onEdit}
      onEdit={onEdit}
      footer={
        credentials.length > PREVIEW_COUNT && onEdit ? `Show all ${credentials.length}` : undefined
      }
      onFooterPress={onEdit}
    >
      {(onEdit ? preview : credentials).map((cred, index, list) => (
        <View key={`${cred.kind}-${cred.id}`}>
          <CredentialRow cred={cred} />
          {index < list.length - 1 ? <View style={styles.divider} /> : null}
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
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
