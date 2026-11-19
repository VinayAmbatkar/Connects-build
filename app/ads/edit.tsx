import { useEffect, useMemo, useState } from 'react';
import { KeyboardAwareScrollView } from '@/src/components/KeyboardAwareScrollView';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { adsApi, type AdRequest, type OwnerAd, type PickedImage } from '@/src/api/ads';
import { Button } from '@/src/components/Button';
import { ListSkeleton } from '@/src/components/Skeleton';
import { appAlert } from '@/src/components/AppDialog';
import { alertApiError } from '@/src/features/billing/featureLocked';
import { SponsoredPostCard } from '@/src/features/ads/SponsoredPostCard';
import { adsKeys, toCard } from '@/src/features/ads/shared';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const MAX_TITLE = 80;
const MAX_DESC = 500;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

const BLANK: AdRequest = { title: '', description: '', linkUrl: '', cta: 'LEARN_MORE', targetAll: true, targetRegions: [], targetStates: [] };

function normalizeLink(raw: string) {
  const t = raw.trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function linkValid(raw: string) {
  const l = normalizeLink(raw);
  if (!l) return true;
  const m = /^https?:\/\/([^/?#@\s]+)(?:[/?#]\S*)?$/i.exec(l);
  return !!m && m[1].includes('.');
}

/** Create / edit the member's advertisement. ?id= edits an existing one. */
export default function EditAdScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const adId = id ? Number(id) : null;
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const catalogQ = useQuery({ queryKey: adsKeys.catalog, queryFn: adsApi.catalog, staleTime: Infinity });
  const adQ = useQuery({ queryKey: ['ads', 'one', adId], queryFn: () => adsApi.get(adId!), enabled: adId != null });

  const [form, setForm] = useState<AdRequest>(BLANK);
  const [saved, setSaved] = useState<OwnerAd | null>(null);
  const [pending, setPending] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (adQ.data) {
      const a = adQ.data;
      setSaved(a);
      setForm({ title: a.title, description: a.description, linkUrl: a.linkUrl, cta: a.cta, targetAll: a.targetAll, targetRegions: a.targetRegions, targetStates: a.targetStates });
    }
  }, [adQ.data]);

  const catalog = catalogQ.data;
  const maxImages = catalog?.maxImages ?? 3;
  const images = [...(saved?.imageUrls ?? []), ...pending.map((p) => p.uri)];

  const covered = useMemo(() => {
    const set = new Set<string>();
    catalog?.regions.forEach((r) => { if (form.targetRegions.includes(r.code)) r.states.forEach((s) => set.add(s)); });
    return set;
  }, [catalog, form.targetRegions]);
  const reach = new Set([...covered, ...form.targetStates]).size;

  const set = <K extends keyof AdRequest>(k: K, v: AdRequest[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleRegion = (code: string) => {
    setForm((f) => {
      const regions = f.targetRegions.includes(code) ? f.targetRegions.filter((c) => c !== code) : [...f.targetRegions, code];
      const now = new Set<string>();
      catalog?.regions.forEach((r) => { if (regions.includes(r.code)) r.states.forEach((s) => now.add(s)); });
      return { ...f, targetRegions: regions, targetStates: f.targetStates.filter((s) => !now.has(s)) };
    });
  };
  const toggleState = (code: string) => {
    if (covered.has(code)) return;
    set('targetStates', form.targetStates.includes(code) ? form.targetStates.filter((c) => c !== code) : [...form.targetStates, code]);
  };

  const titleErr = !form.title.trim() ? 'Add a headline' : '';
  const linkErr = linkValid(form.linkUrl) ? '' : 'Enter a valid link, like https://example.com';
  const audienceErr = !form.targetAll && reach === 0 ? 'Pick at least one region or state' : '';
  const canSave = !titleErr && !linkErr && !audienceErr && !busy;

  const pickImages = async () => {
    const remaining = maxImages - images.length;
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert('Permission needed', 'Allow photo library access to add images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      // Strong JPEG compression: a feed card never needs a full-quality
      // camera original, and this is what makes uploads fast.
      quality: 0.6,
    });
    if (result.canceled || !result.assets.length) return;
    const picked: PickedImage[] = [];
    for (const asset of result.assets.slice(0, remaining)) {
      const raw = (asset.mimeType ?? 'image/jpeg').toLowerCase();
      const type = raw === 'image/jpg' ? 'image/jpeg' : raw;
      if (!ALLOWED.has(type)) { appAlert('Unsupported image', 'Use JPG, PNG or WebP images.'); continue; }
      if (asset.fileSize != null && asset.fileSize > MAX_BYTES) { appAlert('Image too large', 'Each image must be 5 MB or smaller.'); continue; }
      picked.push({ uri: asset.uri, name: asset.fileName ?? `ad-${Date.now()}.jpg`, type });
    }
    if (!picked.length) return;
    if (saved) {
      // Existing ad: upload straight away.
      setUploading(true);
      try {
        setSaved(await adsApi.uploadImages(saved.id, picked));
        void qc.invalidateQueries({ queryKey: adsKeys.mine });
      } catch (e) {
        alertApiError(e, 'Could not upload the image');
      } finally {
        setUploading(false);
      }
    } else {
      setPending((p) => [...p, ...picked].slice(0, maxImages));
    }
  };

  const removeImage = async (uri: string) => {
    if (saved?.imageUrls.includes(uri)) {
      try {
        setSaved(await adsApi.removeImage(saved.id, uri));
        void qc.invalidateQueries({ queryKey: adsKeys.mine });
      } catch (e) {
        alertApiError(e, 'Could not remove the image');
      }
    } else {
      setPending((p) => p.filter((x) => x.uri !== uri));
    }
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    const body: AdRequest = { ...form, title: form.title.trim(), description: form.description.trim(), linkUrl: normalizeLink(form.linkUrl) };
    try {
      let ad = saved ? await adsApi.update(saved.id, body) : await adsApi.create(body);
      if (pending.length) {
        try { ad = await adsApi.uploadImages(ad.id, pending); } catch (e) { alertApiError(e, 'The images could not be uploaded'); }
      }
      await qc.invalidateQueries({ queryKey: ['ads'] });
      if (!saved) appAlert('Saved as a private draft', 'Switch it to Public when you’re ready for it to show in the feed.');
      router.back();
    } catch (e) {
      alertApiError(e, 'Could not save your ad');
    } finally {
      setBusy(false);
    }
  };

  if ((adId != null && adQ.isLoading) || catalogQ.isLoading) return <ListSkeleton />;

  const ctaLabel = catalog?.ctas.find((c) => c.code === form.cta)?.label ?? 'Learn more';
  const preview = toCard(
    { id: saved?.id ?? 0, title: form.title.trim(), description: form.description.trim(), imageUrls: images, linkUrl: normalizeLink(form.linkUrl), cta: form.cta, ctaLabel },
    user?.fullName ?? 'You',
    user?.role,
  );

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView contentContainerStyle={styles.screen}>
        <Section n={1} title="Creative" sub="What people see in their feed">
          <Field label="Headline *" count={`${form.title.length}/${MAX_TITLE}`} error={form.title ? titleErr : ''}>
            <TextInput style={styles.input} value={form.title} onChangeText={(v) => set('title', v)} maxLength={MAX_TITLE} placeholder="e.g. Premium TMT bars delivered in 48 hours" placeholderTextColor={colors.textMuted} />
          </Field>
          <Field label="Description" count={`${form.description.length}/${MAX_DESC}`}>
            <TextInput style={[styles.input, styles.multi]} value={form.description} onChangeText={(v) => set('description', v)} maxLength={MAX_DESC} multiline placeholder="Tell people what you offer" placeholderTextColor={colors.textMuted} />
          </Field>
          <Text style={styles.label}>Images *</Text>
          <View style={styles.images}>
            {images.map((uri) => (
              <View key={uri} style={styles.thumb}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} />
                <Pressable style={styles.thumbX} onPress={() => void removeImage(uri)} hitSlop={8} accessibilityLabel="Remove image">
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
            {images.length < maxImages && (
              <Pressable style={[styles.thumb, styles.addThumb]} onPress={() => void pickImages()} disabled={uploading}>
                <Ionicons name={uploading ? 'cloud-upload-outline' : 'add'} size={22} color={colors.textSecondary} />
                <Text style={styles.addText}>{uploading ? 'Uploading…' : 'Add image'}</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.hint}>Up to {maxImages} images · JPG, PNG or WebP · landscape works best</Text>
        </Section>

        <Section n={2} title="Link" sub="Where the button takes people">
          <Field label="Website link" error={linkErr}>
            <TextInput style={styles.input} value={form.linkUrl} onChangeText={(v) => set('linkUrl', v)} placeholder="https://yourwebsite.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          </Field>
          {form.linkUrl.trim() ? (
            <>
              <Text style={styles.label}>Button</Text>
              <View style={styles.chips}>
                {catalog?.ctas.map((c) => (
                  <Chip key={c.code} label={c.label} on={form.cta === c.code} onPress={() => set('cta', c.code)} />
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.hint}>No link? The button opens your COBILDS profile instead.</Text>
          )}
        </Section>

        <Section n={3} title="Audience" sub="Where your ad is shown">
          <View style={styles.choices}>
            <Choice title="All India" sub="Everyone on COBILDS" on={form.targetAll} onPress={() => set('targetAll', true)} />
            <Choice title="Regions & states" sub="Only people located there" on={!form.targetAll} onPress={() => set('targetAll', false)} />
          </View>
          {!form.targetAll && catalog && (
            <View style={styles.targeting}>
              <Text style={styles.label}>Regions</Text>
              <View style={styles.chips}>
                {catalog.regions.map((r) => (
                  <Chip key={r.code} label={`${r.name} · ${r.states.length}`} on={form.targetRegions.includes(r.code)} onPress={() => toggleRegion(r.code)} />
                ))}
              </View>
              <Text style={[styles.label, { marginTop: spacing.sm }]}>States & union territories</Text>
              {catalog.regions.map((r) => (
                <View key={r.code} style={{ gap: 6 }}>
                  <Text style={styles.group}>{r.name.toUpperCase()}</Text>
                  <View style={styles.chips}>
                    {catalog.states.filter((s) => s.region === r.code).map((s) => (
                      <Chip key={s.code} small label={s.name} on={covered.has(s.code) || form.targetStates.includes(s.code)} locked={covered.has(s.code)} onPress={() => toggleState(s.code)} />
                    ))}
                  </View>
                </View>
              ))}
              <Text style={[styles.reach, audienceErr ? { color: colors.danger } : null]}>{audienceErr || `Showing in ${reach} states / UTs`}</Text>
            </View>
          )}
          <Text style={styles.hint}>Location comes from members’ profile locations. Members without one only see All India ads.</Text>
        </Section>

        <Text style={styles.previewLabel}>FEED PREVIEW</Text>
        <SponsoredPostCard ad={preview} preview />

        <Button title={saved ? 'Save changes' : 'Save as draft'} onPress={() => void save()} loading={busy} disabled={!canSave} />
      </KeyboardAwareScrollView>
    </View>
  );
}

function Section({ n, title, sub, children }: { n: number; title: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHead}>
        <View style={styles.step}><Text style={styles.stepText}>{n}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.hint}>{sub}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function Field({ label, count, error, children }: { label: string; count?: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {(!!count || !!error) && (
        <View style={styles.foot}>
          <Text style={styles.err}>{error}</Text>
          {!!count && <Text style={styles.hint}>{count}</Text>}
        </View>
      )}
    </View>
  );
}

function Chip({ label, on, locked, small, onPress }: { label: string; on: boolean; locked?: boolean; small?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={locked} accessibilityState={{ selected: on }}
      style={[styles.chip, small && styles.chipSm, on && styles.chipOn, locked && { opacity: 0.55 }]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Choice({ title, sub, on, onPress }: { title: string; sub: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, on && styles.choiceOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.hint}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl, backgroundColor: colors.surfaceMuted },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 12 },
  sectionHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  step: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.white, fontFamily: typography.fontFamily.bold, fontSize: 12 },
  sectionTitle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md, color: colors.text },
  label: { fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.text },
  hint: { fontFamily: typography.fontFamily.regular, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  err: { fontFamily: typography.fontFamily.medium, fontSize: 12, color: colors.danger, flex: 1 },
  foot: { flexDirection: 'row', justifyContent: 'space-between' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.text, backgroundColor: colors.white,
  },
  multi: { minHeight: 96, textAlignVertical: 'top' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 104, height: 104 / 1.91, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  thumbX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center' },
  addThumb: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  addText: { fontFamily: typography.fontFamily.semibold, fontSize: 11, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipSm: { paddingHorizontal: 10, paddingVertical: 5 },
  chipOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontFamily: typography.fontFamily.medium, fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.white },
  choices: { gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  choiceTitle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm, color: colors.text },
  targeting: { gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  group: { fontFamily: typography.fontFamily.bold, fontSize: 10.5, letterSpacing: 0.8, color: colors.textMuted },
  reach: { fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.primaryDark, marginTop: 4 },
  previewLabel: { fontFamily: typography.fontFamily.bold, fontSize: 11, letterSpacing: 1, color: colors.textMuted, marginBottom: -8, marginLeft: 4 },
});
