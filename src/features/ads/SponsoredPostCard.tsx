import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { trackAd, type AdCard } from '@/src/api/ads';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const ROLE_LABELS: Record<string, string> = {
  CONSULTANTS: 'Consultant',
  BUILDERS_CONTRACTORS: 'Builder / Contractor',
  VENDORS: 'Vendor',
  CONSUMER: 'Member',
  OTHERS: 'Professional',
};

function initials(name: string) {
  const parts = (name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function domainOf(url?: string) {
  if (!url) return '';
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].replace(/^www\./, '') : '';
}

type Props = {
  ad: AdCard;
  /** Editor preview: no tracking, no navigation. */
  preview?: boolean;
};

/**
 * A sponsored post between feed posts ("Promoted"). Impressions are
 * reported by the feed list's viewability callback, not here; this card
 * reports clicks:
 * - image / headline / CTA -> advertiser link (in-app browser), CLICK
 *   (no link: the CTA opens their profile)
 * - name / avatar -> their COBILDS profile, PROFILE_CLICK
 */
export function SponsoredPostCard({ ad, preview }: Props) {
  const [width, setWidth] = useState(0);
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const subtitle = ad.advertiser.company || ROLE_LABELS[ad.advertiser.role ?? ''] || '';
  const domain = domainOf(ad.linkUrl);
  const long = ad.description.length > 160;

  const openProfile = () => {
    if (preview || !ad.advertiser.id) return;
    trackAd(ad.id, 'PROFILE_CLICK');
    router.push(`/public-profile/${ad.advertiser.id}` as Href);
  };

  const openLink = () => {
    if (preview) return;
    if (!ad.linkUrl) {
      openProfile();
      return;
    }
    trackAd(ad.id, 'CLICK');
    void WebBrowser.openBrowserAsync(ad.linkUrl).catch(() => undefined);
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const imageHeight = width / 1.91;

  return (
    <View style={styles.card} onLayout={onLayout} accessibilityLabel={`Sponsored by ${ad.advertiser.name}`}>
      <View style={styles.head}>
        <Pressable onPress={openProfile} style={styles.avatar} accessibilityRole="button" accessibilityLabel={`View ${ad.advertiser.name}'s profile`}>
          <Text style={styles.avatarText}>{initials(ad.advertiser.name)}</Text>
        </Pressable>
        <View style={styles.who}>
          <Pressable onPress={openProfile} style={styles.nameRow} hitSlop={6}>
            <Text style={styles.name} numberOfLines={1}>{ad.advertiser.name || 'Your name'}</Text>
            {(ad.advertiser.verified || ad.advertiser.businessVerified) && (
              <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
            )}
          </Pressable>
          <Text style={styles.meta} numberOfLines={1}>
            {subtitle ? `${subtitle} · ` : ''}Promoted
            {ad.own ? '  ·  Your ad' : ''}
          </Text>
        </View>
      </View>

      {!!ad.description && (
        <Pressable style={styles.body} onPress={() => setExpanded(true)} disabled={!long || expanded}>
          <Text style={styles.desc} numberOfLines={long && !expanded ? 3 : undefined}>{ad.description}</Text>
          {long && !expanded && <Text style={styles.more}>…see more</Text>}
        </Pressable>
      )}

      {width > 0 && (
        ad.imageUrls.length > 0 ? (
          <View>
            <FlatList
              data={ad.imageUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(u, i) => `${i}:${u}`}
              onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1)))}
              renderItem={({ item }) => (
                <Pressable onPress={openLink} accessibilityLabel={ad.title}>
                  <Image source={{ uri: item }} style={{ width, height: imageHeight }} resizeMode="cover" />
                </Pressable>
              )}
            />
            {ad.imageUrls.length > 1 && (
              <View style={styles.dots} pointerEvents="none">
                {ad.imageUrls.map((u, i) => (
                  <View key={`${i}:${u}`} style={[styles.dot, i === slide && styles.dotOn]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.noImage, { height: imageHeight }]}>
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
            <Text style={styles.noImageText}>Add an image</Text>
          </View>
        )
      )}

      <Pressable style={styles.ctaBar} onPress={openLink}>
        <View style={styles.ctaText}>
          <Text style={styles.title} numberOfLines={2}>{ad.title || 'Your headline'}</Text>
          {!!domain && <Text style={styles.domain}>{domain}</Text>}
        </View>
        <Pressable style={styles.cta} onPress={openLink} accessibilityRole="button">
          <Text style={styles.ctaLabel}>{ad.linkUrl ? ad.ctaLabel : 'View profile'}</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, paddingBottom: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 15 },
  who: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  name: { fontFamily: typography.fontFamily.semibold, fontSize: 15, color: colors.text, flexShrink: 1 },
  meta: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 1 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm + 4 },
  desc: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, lineHeight: 20, color: colors.textSecondary },
  more: { fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotOn: { width: 18, backgroundColor: colors.white },
  noImage: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: 6 },
  noImageText: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: colors.textMuted },
  ctaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ctaText: { flex: 1, minWidth: 0 },
  title: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm, color: colors.text },
  domain: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ctaLabel: { fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.primary },
});
