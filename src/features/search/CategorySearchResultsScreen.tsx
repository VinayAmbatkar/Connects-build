import { alertApiError } from '@/src/features/billing/featureLocked';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { VerifiedName } from '@/src/components/VerifiedName';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EmptyState, ErrorState } from '@/src/components/EmptyState';
import { connectionsApi } from '@/src/api/connections';
import { getErrorMessage } from '@/src/api/client';
import { searchApi } from '@/src/api/search';
import {
  LOCATION_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  getCategoryRoleLabel,
  getDisciplinesForRole,
  getLocationLabel,
  getOptionLabel,
  getSpecializationsForDiscipline,
  type CategoryOption,
} from '@/src/constants/category';
import { toCategoryParam, useSearchFlowStore } from '@/src/features/search/searchFlowStore';
import type { ProfessionalSearchResult } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { usePlaceLabel } from '@/src/hooks/usePlaceLabels';
import { formatRoleLabel } from '@/src/features/profile/profileFormat';
import { VERIFIED_BLUE } from '@/src/components/PremiumBadge';
import { ListSkeleton } from '@/src/components/Skeleton';
type FilterKey = 'location' | 'projectType' | 'discipline' | 'category' | null;

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={active ? colors.white : colors.text}
      />
    </Pressable>
  );
}

function OptionRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.optionRow, active && styles.optionRowActive]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {label}
      </Text>
      {active ? (
        <Ionicons name="checkmark" size={18} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

export function CategorySearchResultsScreen() {
  const insets = useSafeAreaInsets();
  const pull = usePullToRefresh();
  const queryClient = useQueryClient();
  const role = useSearchFlowStore((s) => s.role);
  const location = useSearchFlowStore((s) => s.location);
  const placeId = useSearchFlowStore((s) => s.placeId);
  const projectTypes = useSearchFlowStore((s) => s.projectTypes);
  const selectedDisciplines = useSearchFlowStore((s) => s.disciplines);
  const selectedSpecializations = useSearchFlowStore((s) => s.specializations);
  const setLocation = useSearchFlowStore((s) => s.setLocation);
  const toggleProjectType = useSearchFlowStore((s) => s.toggleProjectType);
  const toggleDiscipline = useSearchFlowStore((s) => s.toggleDiscipline);
  const toggleSpecialization = useSearchFlowStore((s) => s.toggleSpecialization);
  const setProjectTypes = useSearchFlowStore((s) => s.setProjectTypes);
  const setDisciplines = useSearchFlowStore((s) => s.setDisciplines);
  const setSpecializations = useSearchFlowStore((s) => s.setSpecializations);

  const [query, setQuery] = useState('');
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const roleLabel = getCategoryRoleLabel(role) || 'professionals';
  const locationLabel = getLocationLabel(location) || location;
  const city = locationLabel.split(',')[0]?.trim() || locationLabel || 'Location';
  const disciplines = useMemo(() => getDisciplinesForRole(role), [role]);
  // Categories offered by the selected types (empty when none picked).
  const specializations = useMemo(
    () => selectedDisciplines.flatMap((d) => getSpecializationsForDiscipline(d)),
    [selectedDisciplines],
  );

  /** "Residential +2" -- a chip-sized summary of a multi-select. */
  const summarize = (options: CategoryOption[], ids: string[], fallback: string) => {
    const first = getOptionLabel(options, ids[0] ?? '');
    if (!ids.length || !first) return fallback;
    return ids.length > 1 ? `${first} +${ids.length - 1}` : first;
  };
  const projectTypeLabel = summarize(PROJECT_TYPE_OPTIONS, projectTypes, 'Project type');
  const disciplineLabel = summarize(disciplines, selectedDisciplines, 'Type');
  const categoryLabel = summarize(specializations, selectedSpecializations, 'Category');

  const searchQuery = useQuery({
    queryKey: ['category-search', role, location, placeId, projectTypes, selectedDisciplines, selectedSpecializations],
    enabled: Boolean(role && location),
    queryFn: () =>
      searchApi.category({
        role,
        location,
        place_id: placeId || undefined,
        // Comma-joined: axios would send arrays as projectType[]=..., which
        // the backend doesn't read. It accepts repeated or comma lists.
        projectType: projectTypes.length ? projectTypes.join(',') : undefined,
        category: selectedDisciplines.length ? toCategoryParam(selectedDisciplines, selectedSpecializations) : undefined,
        limit: 50,
        page: 1,
      }),
  });

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
  });

  const connectMutation = useMutation({
    mutationFn: (recipientId: string | number) => connectionsApi.send(recipientId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      appAlert('Request sent', 'Connection request sent.');
    },
    onError: (error) => alertApiError(error),
  });

  const results = searchQuery.data?.results ?? [];
  const total = searchQuery.data?.total ?? results.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return results;
    return results.filter((item) => {
      const hay = [
        item.fullName,
        item.name,
        item.company,
        item.role,
        item.bio,
        item.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [results, query]);

  const connectedIds = useMemo(() => {
    const list = Array.isArray(connectionsQuery.data) ? connectionsQuery.data : [];
    const ids = new Set<string>();
    for (const c of list) {
      const status = String(c.status ?? '').toUpperCase();
      if (status !== 'ACCEPTED' && status !== 'CONNECTED' && status !== 'PENDING') {
        continue;
      }
      [c.otherPartyId, c.userId, c.requesterId, c.recipientId].forEach((id) => {
        if (id != null) ids.add(String(id));
      });
    }
    return ids;
  }, [connectionsQuery.data]);

  const sheetTitle =
    openFilter === 'location'
      ? 'Select Location'
      : openFilter === 'projectType'
        ? 'Select Project Type'
        : openFilter === 'discipline'
          ? `Select Type of ${roleLabel}`
          : openFilter === 'category'
            ? 'Select Category'
            : '';

  const sheetOptions: CategoryOption[] =
    openFilter === 'location'
      ? LOCATION_OPTIONS
      : openFilter === 'projectType'
        ? PROJECT_TYPE_OPTIONS
        : openFilter === 'discipline'
          ? disciplines
          : openFilter === 'category'
            ? specializations
            : [];

  const sheetSelected: string[] =
    openFilter === 'location'
      ? [location]
      : openFilter === 'projectType'
        ? projectTypes
        : openFilter === 'discipline'
          ? selectedDisciplines
          : openFilter === 'category'
            ? selectedSpecializations
            : [];

  // Location is single-choice (closes the sheet); the rest toggle and the
  // results update live behind the sheet.
  const onPickOption = (id: string) => {
    if (openFilter === 'location') {
      setLocation(id, id);
      setOpenFilter(null);
    } else if (openFilter === 'projectType') toggleProjectType(id);
    else if (openFilter === 'discipline') toggleDiscipline(id);
    else if (openFilter === 'category') toggleSpecialization(id);
  };

  const clearSheetSelection = () => {
    if (openFilter === 'projectType') setProjectTypes([]);
    else if (openFilter === 'discipline') setDisciplines([]);
    else if (openFilter === 'category') setSpecializations([]);
  };

  if (!role || !location) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState
          title="Incomplete search"
          message="Start again from Find Connections."
          onRetry={() => router.replace('/(tabs)/connect' as Href)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerSearch}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${roleLabel.toLowerCase()}...`}
            placeholderTextColor={colors.textMuted}
            style={styles.headerSearchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <FilterChip
            label={city}
            active={Boolean(location)}
            onPress={() => setOpenFilter('location')}
          />
          <FilterChip
            label={projectTypeLabel}
            active={projectTypes.length > 0}
            onPress={() => setOpenFilter('projectType')}
          />
          <FilterChip
            label={disciplineLabel}
            active={selectedDisciplines.length > 0}
            onPress={() => setOpenFilter('discipline')}
          />
          {specializations.length > 0 ? (
            <FilterChip
              label={categoryLabel}
              active={selectedSpecializations.length > 0}
              onPress={() => setOpenFilter('category')}
            />
          ) : null}
        </ScrollView>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryLeft}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={styles.summaryLoc}>{city}</Text>
          <Text style={styles.summaryDot}>·</Text>
          <Text style={styles.summaryCount}>
            {searchQuery.isLoading
              ? 'Searching…'
              : `${total} result${total === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/connect/wizard' as Href)}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {searchQuery.isLoading ? (
        <ListSkeleton />
      ) : searchQuery.isError ? (
        <ErrorState
          title="Search failed"
          message={getErrorMessage(searchQuery.error)}
          onRetry={() => void searchQuery.refetch()}
        />
      ) : (
        <FlatList
          refreshControl={pull.refreshControl}
          data={filtered}
          keyExtractor={(item, index) => String(item.userId ?? item.id ?? index)}
          contentContainerStyle={
            filtered.length ? styles.list : styles.emptyList
          }
          ListEmptyComponent={
            <EmptyState
              title="No matches found."
              message="Try changing filters above to find more professionals."
            />
          }
          renderItem={({ item }) => (
            <ResultCard
              item={item}
              busy={connectMutation.isPending}
              alreadyLinked={connectedIds.has(
                String(item.userId ?? item.id ?? ''),
              )}
              onOpen={() => {
                const id = item.userId ?? item.id;
                if (id == null) return;
                router.push(`/public-profile/${id}` as Href);
              }}
              onConnect={() => {
                const id = item.userId ?? item.id;
                if (id == null) return;
                connectMutation.mutate(id);
              }}
            />
          )}
        />
      )}

      {/* Floating "glass" bar: the tab bar is hidden in this flow, so this
          is the way out -- home, or back to the role picker. */}
      <View
        pointerEvents="box-none"
        style={[styles.glassWrap, { bottom: Math.max(insets.bottom, spacing.sm) + spacing.xs }]}
      >
        <View style={styles.glassBar}>
          <Pressable
            style={styles.glassBtn}
            onPress={() => leaveFlow('/(tabs)/feed')}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <Ionicons name="home-outline" size={18} color={colors.text} />
            <Text style={styles.glassBtnText}>Home</Text>
          </Pressable>
          <View style={styles.glassDivider} />
          <Pressable
            style={styles.glassBtn}
            onPress={() => leaveFlow('/(tabs)/connect')}
            accessibilityRole="button"
            accessibilityLabel="Reselect role"
          >
            <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
            <Text style={[styles.glassBtnText, styles.glassBtnTextAccent]}>Change role</Text>
          </Pressable>
        </View>
      </View>

      <BottomSheet
        visible={openFilter != null}
        title={sheetTitle}
        subtitle={openFilter === 'location' ? 'Tap a location to update results.' : 'Select one or more -- results update as you go.'}
        onClose={() => setOpenFilter(null)}
        tall
        footer={
          openFilter && openFilter !== 'location' ? (
            <View style={styles.sheetFooter}>
              {sheetSelected.length ? (
                <Pressable style={[styles.clearBtn, styles.sheetFooterBtn]} onPress={clearSheetSelection}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.doneBtn, styles.sheetFooterBtn]} onPress={() => setOpenFilter(null)}>
                <Text style={styles.doneBtnText}>Done{sheetSelected.length ? ` (${sheetSelected.length})` : ''}</Text>
              </Pressable>
            </View>
          ) : null
        }
      >
        {sheetOptions.map((opt) => (
          <OptionRow
            key={opt.id}
            label={opt.label}
            active={sheetSelected.includes(opt.id)}
            onPress={() => onPickOption(opt.id)}
          />
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

/** Close the wizard/results stack, then open a tab -- so Back from there
 *  doesn't land in the old results again. */
function leaveFlow(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(href);
}

function initialsFrom(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function ResultCard({
  item,
  alreadyLinked,
  busy,
  onOpen,
  onConnect,
}: {
  item: ProfessionalSearchResult;
  alreadyLinked: boolean;
  busy: boolean;
  onOpen: () => void;
  onConnect: () => void;
}) {
  const name = item.fullName ?? item.name ?? item.company ?? 'Professional';
  const company = item.company && item.company !== name ? item.company : null;

  const specialtyLabels = useMemo(() => {
    const specs = getSpecializationsForDiscipline(
      Array.isArray(item.disciplineIds) ? String(item.disciplineIds[0] ?? '') : '',
    );
    const fromIds = (item.specializationIds ?? [])
      .map((id) => getOptionLabel(specs, String(id)) || String(id))
      .filter(Boolean)
      .slice(0, 3);
    if (fromIds.length) return fromIds;
    return [formatRoleLabel(item.role), company].filter(Boolean).map(String).slice(0, 3);
  }, [item.disciplineIds, item.specializationIds, item.role, company]);

  const specialties = specialtyLabels.join(' · ');

  const loc =
    item.location ||
    (Array.isArray(item.serviceLocations)
      ? String(item.serviceLocations[0] ?? '')
      : '') ||
    (Array.isArray(item.firmLocationIds)
      ? String(item.firmLocationIds[0] ?? '')
      : '');
  const locLabel = usePlaceLabel(loc);

  const rating =
    typeof item.rating === 'number'
      ? item.rating
      : typeof item.averageRating === 'number'
        ? item.averageRating
        : null;
  const reviewCount =
    typeof item.reviewCount === 'number'
      ? item.reviewCount
      : typeof item.reviews === 'number'
        ? item.reviews
        : null;

  // "0+ years" says nothing -- only show real experience.
  const years = item.yearsExperience ? `${item.yearsExperience}+ yrs experience` : '';
  const infoLine = [locLabel, years].filter(Boolean).join(' · ');

  return (
    <Pressable
      style={styles.card}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${name}${item.verified ? ', verified' : ''}`}
    >
      <View style={styles.logo}>
        <Text style={styles.logoText}>{initialsFrom(name) || '?'}</Text>
        {item.verified ? (
          // Tick on the avatar too, so it reads at a glance down the list.
          <View style={styles.logoTick}>
            <Ionicons name="checkmark-circle" size={16} color={VERIFIED_BLUE} />
          </View>
        ) : null}
      </View>

      <View style={styles.cardMain}>
        {/* The tick is on the avatar -- not repeated after the name. */}
        <Text style={styles.cardName} numberOfLines={1}>
          {name}
        </Text>

        {specialties ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {specialties}
          </Text>
        ) : null}

        {/* Location and experience share one line -- no gap between them. */}
        {infoLine ? (
          <View style={styles.infoRow}>
            {locLabel ? (
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            ) : null}
            <Text style={styles.cardLoc} numberOfLines={1}>
              {infoLine}
            </Text>
          </View>
        ) : null}

        {rating != null ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.primary} />
            <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            {reviewCount != null ? (
              <Text style={styles.ratingCount}>({reviewCount} reviews)</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <Pressable
        style={[styles.connectBtn, alreadyLinked && styles.connectDisabled]}
        disabled={alreadyLinked || busy}
        onPress={onConnect}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={alreadyLinked ? 'Request pending' : `Connect with ${name}`}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Ionicons
              name={alreadyLinked ? 'time-outline' : 'person-add-outline'}
              size={13}
              color={alreadyLinked ? colors.textMuted : colors.primary}
            />
            <Text
              style={[styles.connectBtnText, alreadyLinked && styles.connectDisabledText]}
            >
              {alreadyLinked ? 'Pending' : 'Connect'}
            </Text>
          </>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetFooter: { flexDirection: 'row', gap: 10 },
  sheetFooterBtn: { flex: 1 },
  doneBtn: {
    minHeight: 46,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { fontFamily: typography.fontFamily.semibold, fontSize: 15, color: colors.white },
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerSearchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  chipsWrap: {
    height: 42,
    marginBottom: 8,
  },
  chipsRow: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 180,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.text,
    maxWidth: 140,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  summaryLoc: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  summaryDot: {
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  summaryCount: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: spacing.md,
    // Room for the floating glass bar.
    paddingBottom: 120,
  },
  emptyList: { flexGrow: 1, paddingBottom: 120 },
  glassWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glassBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  glassBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  glassBtnTextAccent: {
    color: colors.primary,
  },
  glassDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: colors.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionRowActive: {
    backgroundColor: colors.primaryMuted,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.primaryDark,
    fontFamily: typography.fontFamily.semibold,
  },
  clearBtn: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTick: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    borderRadius: 9,
    backgroundColor: colors.white,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  logoText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.primaryDark,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  cardMeta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardLoc: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  ratingRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  ratingValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  ratingCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  connectDisabled: {
    borderColor: colors.border,
  },
  connectBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  connectDisabledText: {
    color: colors.textMuted,
  },
});
