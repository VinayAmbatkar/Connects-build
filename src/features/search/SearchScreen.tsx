import { useEffect, useMemo, useRef, useState } from 'react';
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
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { searchApi } from '@/src/api/search';
import { normalizeOptions, resolveOptionLabel } from '@/src/features/profile/profileOptions';
import { profileApi } from '@/src/api/profile';
import {
  SEARCH_SUGGESTIONS,
  addRecentPersonSearch,
  addRecentTextSearch,
  clearRecentSearches,
  loadRecentSearches,
  removeRecentSearch,
  type RecentSearch,
} from '@/src/features/search/recentSearches';
import type { ProfessionalSearchResult } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  initialQuery?: string;
  /** Show back button (default true for stack route). */
  showBack?: boolean;
};

function personId(item: ProfessionalSearchResult) {
  return String(item.userId ?? item.id);
}

function personName(item: ProfessionalSearchResult) {
  return item.fullName ?? item.name ?? 'Professional';
}

function personHeadline(
  item: ProfessionalSearchResult,
  roleLabel?: string,
) {
  return [roleLabel ?? item.role, item.company, item.location]
    .filter(Boolean)
    .join(' · ');
}

export function SearchScreen({ initialQuery = '', showBack = true }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery.trim());
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const optionsQuery = useQuery({
    queryKey: ['profile-options'],
    queryFn: profileApi.options,
    staleTime: 5 * 60_000,
  });

  const roleOptions = useMemo(
    () => normalizeOptions(optionsQuery.data?.roles),
    [optionsQuery.data?.roles],
  );

  useEffect(() => {
    void loadRecentSearches().then(setRecent);
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const debounced = useDebouncedValue(query.trim(), 280);

  const suggestionsQuery = useQuery({
    queryKey: ['search-suggest', debounced],
    queryFn: () => searchApi.freeText(debounced, 8),
    enabled: debounced.length >= 1 && submitted.length === 0,
  });

  const resultsQuery = useQuery({
    queryKey: ['search-results', submitted],
    queryFn: () => searchApi.freeText(submitted, 30),
    enabled: submitted.length >= 1,
  });

  const runTextSearch = async (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setQuery(cleaned);
    setSubmitted(cleaned);
    const next = await addRecentTextSearch(cleaned);
    setRecent(next);
  };

  const openPerson = async (item: ProfessionalSearchResult) => {
    const id = personId(item);
    const name = personName(item);
    const next = await addRecentPersonSearch({
      userId: id,
      name,
      role: item.role,
      company: item.company,
      location: item.location,
    });
    setRecent(next);
    router.push(`/public-profile/${id}`);
  };

  const visibleRecent = showAllRecent ? recent : recent.slice(0, 5);
  const showingResults = submitted.length > 0;
  const showingTypeahead = !showingResults && debounced.length >= 1;
  const showingIdle = !showingResults && debounced.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (submitted) setSubmitted('');
            }}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={() => void runTextSearch(query)}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => {
                setQuery('');
                setSubmitted('');
                inputRef.current?.focus();
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showingIdle ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {recent.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent</Text>
                <View style={styles.sectionActions}>
                  {recent.length > 5 ? (
                    <Pressable onPress={() => setShowAllRecent((v) => !v)} hitSlop={6}>
                      <Text style={styles.linkText}>
                        {showAllRecent ? 'Show less' : 'Show all'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={async () => {
                      await clearRecentSearches();
                      setRecent([]);
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                </View>
              </View>

              {visibleRecent.map((item) =>
                item.type === 'person' ? (
                  <Pressable
                    key={`person-${item.userId}`}
                    style={styles.row}
                    onPress={() => router.push(`/public-profile/${item.userId}`)}
                  >
                    <Avatar name={item.name} size={44} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {[
                          resolveOptionLabel(roleOptions, item.role) ?? item.role,
                          item.company,
                          item.location,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => void removeRecentSearch(item).then(setRecent)}
                    >
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  </Pressable>
                ) : (
                  <Pressable
                    key={`text-${item.term}`}
                    style={styles.row}
                    onPress={() => void runTextSearch(item.term)}
                  >
                    <View style={styles.clockIcon}>
                      <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.rowTitleFlex} numberOfLines={1}>
                      {item.term}
                    </Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => void removeRecentSearch(item).then(setRecent)}
                    >
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  </Pressable>
                ),
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Try searching for</Text>
            {SEARCH_SUGGESTIONS.map((term) => (
              <Pressable
                key={term}
                style={styles.row}
                onPress={() => void runTextSearch(term)}
              >
                <View style={styles.trendIcon}>
                  <Ionicons name="trending-up" size={18} color={colors.primaryDark} />
                </View>
                <Text style={styles.rowTitleFlex}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {showingTypeahead ? (
        <View style={styles.body}>
          {suggestionsQuery.isFetching ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={suggestionsQuery.data ?? []}
              keyExtractor={(item, index) => `${personId(item)}-${index}`}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <Pressable
                  style={styles.viewAllRow}
                  onPress={() => void runTextSearch(debounced)}
                >
                  <Ionicons name="search-outline" size={18} color={colors.primary} />
                  <Text style={styles.viewAllText}>
                    See all results for “{debounced}”
                  </Text>
                </Pressable>
              }
              ListEmptyComponent={
                <EmptyState
                  title="No people found"
                  message="Try a different name, role, or company."
                />
              }
              renderItem={({ item }) => {
                const roleLabel =
                  resolveOptionLabel(roleOptions, item.role) ?? item.role;
                return (
                  <Pressable style={styles.row} onPress={() => void openPerson(item)}>
                    <Avatar name={personName(item)} size={44} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {personName(item)}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {personHeadline(item, roleLabel)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      ) : null}

      {showingResults ? (
        <View style={styles.body}>
          {resultsQuery.isFetching ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={resultsQuery.data ?? []}
              keyExtractor={(item, index) => `${personId(item)}-${index}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                (resultsQuery.data?.length ?? 0) === 0 ? styles.emptyList : undefined
              }
              ListHeaderComponent={
                <Text style={styles.resultsCount}>
                  {(resultsQuery.data?.length ?? 0) > 0
                    ? `${resultsQuery.data?.length} people`
                    : 'People'}
                </Text>
              }
              ListEmptyComponent={
                <EmptyState
                  title="No matches"
                  message={`Nothing found for “${submitted}”. Try another term.`}
                />
              }
              renderItem={({ item }) => {
                const roleLabel =
                  resolveOptionLabel(roleOptions, item.role) ?? item.role;
                return (
                  <Pressable style={styles.resultCard} onPress={() => void openPerson(item)}>
                    <Avatar name={personName(item)} size={52} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {personName(item)}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={2}>
                        {personHeadline(item, roleLabel)}
                      </Text>
                      {item.bio ? (
                        <Text style={styles.bio} numberOfLines={2}>
                          {item.bio}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.text,
    paddingVertical: 0,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  clearText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  rowTitleFlex: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  rowMeta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  clockIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  viewAllText: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  resultsCount: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  resultCard: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bio: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textMuted,
  },
  emptyList: {
    flexGrow: 1,
  },
});
