import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/EmptyState';
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
import { useSearchFlowStore } from '@/src/features/search/searchFlowStore';
import type { ProfessionalSearchResult } from '@/src/types/api';
import { colors, spacing, typography } from '@/src/theme/tokens';

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
  const queryClient = useQueryClient();
  const role = useSearchFlowStore((s) => s.role);
  const location = useSearchFlowStore((s) => s.location);
  const projectType = useSearchFlowStore((s) => s.projectType);
  const discipline = useSearchFlowStore((s) => s.discipline);
  const specialization = useSearchFlowStore((s) => s.specialization);
  const setLocation = useSearchFlowStore((s) => s.setLocation);
  const setProjectType = useSearchFlowStore((s) => s.setProjectType);
  const setDiscipline = useSearchFlowStore((s) => s.setDiscipline);
  const setSpecialization = useSearchFlowStore((s) => s.setSpecialization);

  const [query, setQuery] = useState('');
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const roleLabel = getCategoryRoleLabel(role) || 'professionals';
  const locationLabel = getLocationLabel(location) || location;
  const city = locationLabel.split(',')[0]?.trim() || locationLabel || 'Location';
  const disciplines = useMemo(() => getDisciplinesForRole(role), [role]);
  const specializations = useMemo(
    () => getSpecializationsForDiscipline(discipline),
    [discipline],
  );

  const projectTypeLabel =
    getOptionLabel(PROJECT_TYPE_OPTIONS, projectType) || 'Project type';
  const disciplineLabel =
    getOptionLabel(disciplines, discipline) || `Type of ${roleLabel}`;
  const categoryLabel =
    getOptionLabel(specializations, specialization) || 'Category';

  const searchQuery = useQuery({
    queryKey: [
      'category-search',
      role,
      location,
      projectType,
      discipline,
      specialization,
    ],
    enabled: Boolean(role && location),
    queryFn: () =>
      searchApi.category({
        role,
        location,
        projectType: projectType || undefined,
        discipline: discipline || undefined,
        specialization: specialization || undefined,
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
      Alert.alert('Request sent', 'Connection request sent.');
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
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

  const sheetSelectedId =
    openFilter === 'location'
      ? location
      : openFilter === 'projectType'
        ? projectType
        : openFilter === 'discipline'
          ? discipline
          : openFilter === 'category'
            ? specialization
            : '';

  const onPickOption = (id: string) => {
    if (openFilter === 'location') setLocation(id);
    else if (openFilter === 'projectType') setProjectType(id);
    else if (openFilter === 'discipline') setDiscipline(id);
    else if (openFilter === 'category') setSpecialization(id);
    setOpenFilter(null);
  };

  const clearSheetSelection = () => {
    if (openFilter === 'projectType') setProjectType('');
    else if (openFilter === 'discipline') setDiscipline('');
    else if (openFilter === 'category') setSpecialization('');
    setOpenFilter(null);
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
            label={projectType ? projectTypeLabel : 'Project type'}
            active={Boolean(projectType)}
            onPress={() => setOpenFilter('projectType')}
          />
          <FilterChip
            label={discipline ? disciplineLabel : 'Type'}
            active={Boolean(discipline)}
            onPress={() => setOpenFilter('discipline')}
          />
          {specializations.length > 0 || specialization ? (
            <FilterChip
              label={specialization ? categoryLabel : 'Category'}
              active={Boolean(specialization)}
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
        <LoadingState />
      ) : searchQuery.isError ? (
        <ErrorState
          title="Search failed"
          message={getErrorMessage(searchQuery.error)}
          onRetry={() => void searchQuery.refetch()}
        />
      ) : (
        <FlatList
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

      <BottomSheet
        visible={openFilter != null}
        title={sheetTitle}
        subtitle="Tap an option to update results."
        onClose={() => setOpenFilter(null)}
        tall
        footer={
          openFilter !== 'location' && sheetSelectedId ? (
            <Pressable style={styles.clearBtn} onPress={clearSheetSelection}>
              <Text style={styles.clearBtnText}>Clear filter</Text>
            </Pressable>
          ) : null
        }
      >
        {sheetOptions.map((opt) => (
          <OptionRow
            key={opt.id}
            label={opt.label}
            active={opt.id === sheetSelectedId}
            onPress={() => onPickOption(opt.id)}
          />
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
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
    return [item.role, company].filter(Boolean).map(String).slice(0, 3);
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
  const locLabel = loc ? getLocationLabel(loc) || loc : '';

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

  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>{initialsFrom(name) || '?'}</Text>
      </View>

      <View style={styles.cardMain}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {name}
          </Text>
          <Pressable hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {specialties ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {specialties}
          </Text>
        ) : null}

        {locLabel ? (
          <Text style={styles.cardLoc} numberOfLines={1}>
            {locLabel}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          {rating != null ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color={colors.primary} />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              {reviewCount != null ? (
                <Text style={styles.ratingCount}>({reviewCount} reviews)</Text>
              ) : null}
            </View>
          ) : item.yearsExperience != null ? (
            <Text style={styles.cardLoc}>
              {item.yearsExperience}+ years experience
            </Text>
          ) : (
            <View />
          )}

          <Pressable
            style={[styles.connectBtn, alreadyLinked && styles.connectDisabled]}
            disabled={alreadyLinked || busy}
            onPress={onConnect}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[
                  styles.connectBtnText,
                  alreadyLinked && styles.connectDisabledText,
                ]}
              >
                {alreadyLinked ? 'Pending' : 'Connect'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: spacing.xxl,
  },
  emptyList: { flexGrow: 1 },
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
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardName: {
    flex: 1,
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
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  cardFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingRow: {
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
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
