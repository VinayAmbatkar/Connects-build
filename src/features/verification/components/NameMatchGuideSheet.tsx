import { type ReactNode, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/src/components/BottomSheet';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import { Banner, KycButton, kyc } from '@/src/features/verification/components/kycUi';

const AADHAAR_PAN_GUIDE = require('@/assets/images/Verification/aadhaar-pan-name-guide.webp');
const GST_NAME_GUIDE = require('@/assets/images/Verification/gst-legal-name-guide.webp');

// Source images (Frontend-Tech) are 853x300 and 1672x941.
const AADHAAR_RATIO = 853 / 300;
const GST_RATIO = 1672 / 941;
const GST_ZOOM_HEIGHT = 340;

export const GST_PORTAL_SEARCH_URL = 'https://services.gst.gov.in/services/searchtp';

type Common = {
  visible: boolean;
  onClose: () => void;
  /** True when opened because a verification attempt was rejected, rather
   *  than from the "how do I…?" help link. */
  afterFailure?: boolean;
  attemptsRemaining?: number;
};

type IdentityProps = Common & {
  variant: 'identity';
  profileName: string;
  onEditProfile: () => void;
};

type BusinessProps = Common & {
  variant: 'business';
  enteredName: string;
  onFixName: () => void;
};

export type NameMatchGuideProps = IdentityProps | BusinessProps;

export function NameMatchGuideSheet(props: NameMatchGuideProps) {
  return props.variant === 'identity' ? <IdentityGuide {...props} /> : <BusinessGuide {...props} />;
}

function AttemptsHint({ afterFailure, attemptsRemaining }: Pick<Common, 'afterFailure' | 'attemptsRemaining'>) {
  if (!afterFailure || attemptsRemaining === undefined) return null;
  if (attemptsRemaining <= 0) {
    return <Banner tone="warning" message="No attempts left for now. Fix your details, then try again later." />;
  }
  return (
    <Banner
      tone="warning"
      message={`${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left. Double-check before you retry.`}
    />
  );
}

function Rule({ children }: { children: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons name="checkmark-circle" size={18} color={kyc.success} />
      <Text style={styles.ruleText}>{children}</Text>
    </View>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <View style={styles.rule}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.ruleText}>{children}</Text>
    </View>
  );
}

function IdentityGuide({ visible, onClose, afterFailure, attemptsRemaining, profileName, onEditProfile }: IdentityProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      tall
      title={afterFailure ? "Your name didn't match your Aadhaar" : 'Use your name as per Aadhaar'}
      subtitle="Your profile name must be exactly the same as the name printed on your Aadhaar card and PAN card."
      footer={
        <View style={styles.footer}>
          <KycButton testID="guide-edit-profile" title="Edit my profile name" icon="create-outline" onPress={onEditProfile} />
          <KycButton variant="link" title={afterFailure ? "I'll do it later" : 'Got it'} onPress={onClose} />
        </View>
      }
    >
      <View style={styles.body} testID="identity-name-guide">
        <View style={styles.compare}>
          <Text style={styles.compareLabel}>Name on your profile</Text>
          <Text style={styles.compareValue}>{profileName || 'Not set'}</Text>
        </View>

        <View style={styles.imageCard}>
          <Image
            source={AADHAAR_PAN_GUIDE}
            style={[styles.image, { aspectRatio: AADHAAR_RATIO }]}
            resizeMode="contain"
            accessibilityLabel="Sample Aadhaar and PAN cards with the name field highlighted"
          />
          <Text style={styles.caption}>Check the highlighted Name field on your Aadhaar and PAN card.</Text>
        </View>

        <View style={styles.rules}>
          <Rule>Same spelling as on your Aadhaar, letter for letter</Rule>
          <Rule>Aadhaar is what we verify against -- if it differs from your PAN, use the Aadhaar name</Rule>
          <Rule>Same order of first, middle and last name</Rule>
          <Rule>Include middle names or initials exactly as printed</Rule>
          <Rule>No titles or nicknames (Mr, Dr, Er…)</Rule>
        </View>

        <AttemptsHint afterFailure={afterFailure} attemptsRemaining={attemptsRemaining} />
      </View>
    </BottomSheet>
  );
}

function BusinessGuide({ visible, onClose, afterFailure, attemptsRemaining, enteredName, onFixName }: BusinessProps) {
  const [zoomed, setZoomed] = useState(false);
  const close = () => {
    setZoomed(false);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      tall
      title={afterFailure ? "Business name didn't match GST" : 'Use your exact GST business name'}
      subtitle="Enter the Legal Name of Business exactly as it appears on your GST registration."
      footer={
        <View style={styles.footer}>
          <KycButton
            testID="guide-fix-business-name"
            title="Fix business name"
            icon="create-outline"
            onPress={() => {
              setZoomed(false);
              onFixName();
            }}
          />
          <KycButton
            variant="secondary"
            title="Open GST portal"
            icon="open-outline"
            onPress={() => void Linking.openURL(GST_PORTAL_SEARCH_URL)}
          />
        </View>
      }
    >
      <View style={styles.body} testID="business-name-guide">
        {enteredName.trim() ? (
          <View style={styles.compare}>
            <Text style={styles.compareLabel}>You entered</Text>
            <Text style={styles.compareValue}>{enteredName.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.imageCard}>
          {zoomed ? (
            <ScrollView horizontal showsHorizontalScrollIndicator testID="gst-guide-zoomed">
              <Image
                source={GST_NAME_GUIDE}
                style={{ height: GST_ZOOM_HEIGHT, width: GST_ZOOM_HEIGHT * GST_RATIO }}
                resizeMode="contain"
                accessibilityLabel="Sample GST taxpayer details with Legal Name of Business highlighted"
              />
            </ScrollView>
          ) : (
            <Image
              source={GST_NAME_GUIDE}
              style={[styles.image, { aspectRatio: GST_RATIO }]}
              resizeMode="contain"
              accessibilityLabel="Sample GST taxpayer details with Legal Name of Business highlighted"
            />
          )}
          <Pressable
            testID="gst-guide-zoom"
            onPress={() => setZoomed((z) => !z)}
            style={styles.zoomBtn}
            accessibilityRole="button"
            hitSlop={6}
          >
            <Ionicons name={zoomed ? 'contract-outline' : 'expand-outline'} size={15} color={kyc.navy} />
            <Text style={styles.zoomText}>{zoomed ? 'Fit to screen' : 'Tap to enlarge'}</Text>
          </Pressable>
        </View>

        <View style={styles.rules}>
          <Step n={1}>
            Open the GST portal → <Text style={styles.bold}>Search Taxpayer</Text> and enter your GSTIN.
          </Step>
          <Step n={2}>
            Copy the <Text style={styles.bold}>Legal Name of Business</Text>, not the Trade Name.
          </Step>
          <Step n={3}>Paste it here exactly, including spaces and punctuation (e.g. PRIVATE LIMITED).</Step>
        </View>

        <AttemptsHint afterFailure={afterFailure} attemptsRemaining={attemptsRemaining} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.sm },
  footer: { gap: spacing.xs },
  compare: {
    padding: spacing.md - 4,
    borderRadius: radius.md,
    backgroundColor: kyc.dangerTint,
    borderLeftWidth: 3,
    borderLeftColor: kyc.danger,
  },
  compareLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  compareValue: {
    marginTop: 2,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  imageCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  image: { width: '100%', height: undefined, borderRadius: radius.sm },
  caption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  zoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: kyc.tint,
  },
  zoomText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: kyc.navy,
  },
  rules: { gap: spacing.sm + 2 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  ruleText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.text,
  },
  bold: { fontFamily: typography.fontFamily.bold },
  stepNum: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: 10,
    backgroundColor: kyc.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.white,
  },
});
