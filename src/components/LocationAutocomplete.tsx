import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/src/components/BottomSheet';
import {
  getPlacePredictions,
  getPlaceDetails,
  type LocationAutocompleteResult,
  type PlacePrediction,
} from '@/src/api/googlePlaces';
import { LOCATION_OPTIONS, type CategoryOption } from '@/src/constants/category';
import { colors, spacing, typography } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Fired when the user picks a location. */
  onSelect: (result: LocationAutocompleteResult) => void;
  /** Pre-filled location name (displayed in the input). */
  initialValue?: string;
  placeholder?: string;
  country?: string;
};

export function LocationAutocomplete({
  visible,
  onClose,
  onSelect,
  initialValue = '',
  placeholder = 'Search city or area',
  country = 'in',
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [filteredFallback, setFilteredFallback] = useState<CategoryOption[]>(
    LOCATION_OPTIONS,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useGoogle, setUseGoogle] = useState<boolean | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasApiKey = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    setUseGoogle(hasApiKey);
  }, [hasApiKey]);

  type SheetItem = {
    id: string;
    label: string;
    source: 'google' | 'fallback';
    placeId?: string;
  };

  const items = useMemo<SheetItem[]>(() => {
    const google: SheetItem[] = predictions.map((p) => ({
      id: p.placeId,
      label: p.secondaryText ? `${p.displayName}, ${p.secondaryText}` : p.displayName,
      source: 'google',
      placeId: p.placeId,
    }));
    const fallback: SheetItem[] = filteredFallback.map((o) => ({
      id: o.id,
      label: o.label,
      source: 'fallback',
    }));
    return [...google, ...fallback];
  }, [predictions, filteredFallback]);

  const clearSearch = () => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }
    setPredictions([]);
    setFilteredFallback(LOCATION_OPTIONS);
    setLoading(false);
    setError(null);
  };

  const runSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        clearSearch();
        return;
      }
      if (!useGoogle) {
        // No API key: fall back to static options filtered by query.
        const q = trimmed.toLowerCase();
        setFilteredFallback(
          LOCATION_OPTIONS.filter((o) => o.label.toLowerCase().includes(q)),
        );
        setPredictions([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setPredictions([]);
      setFilteredFallback([]);

      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(async () => {
        try {
          const list = await getPlacePredictions(trimmed, { country });
          setPredictions(list);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Location search failed');
          setLoading(false);
          setPredictions([]);
        }
      }, 300);
    },
    [country, useGoogle],
  );

  useEffect(() => {
    runSearch(query);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, runSearch]);

  const onInputChange = (text: string) => {
    setQuery(text);
  };

  const selectSheetItem = async (item: SheetItem) => {
    if (item.source === 'fallback') {
      onSelect({
        name: item.label,
        placeId: item.id,
        lat: 0,
        lng: 0,
        formattedAddress: item.label,
        addressComponents: [],
      });
      return;
    }
    setLoading(true);
    try {
      const placeId = item.placeId ?? item.id;
      const details = await getPlaceDetails(placeId);
      onSelect(details);
    } catch (err) {
      // Fallback: use prediction data directly.
      const sheetItem = items.find((i) => i.id === item.id);
      onSelect({
        name: sheetItem?.label ?? item.label,
        placeId: item.placeId ?? item.id,
        lat: 0,
        lng: 0,
        formattedAddress: item.label,
        addressComponents: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Select Location"
      subtitle="Search for a city or area."
      onClose={onClose}
      tall
      fixedHeight
    >
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onInputChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && useGoogle !== false ? (
          <Pressable
            onPress={() => {
              setQuery('');
              clearSearch();
            }}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isGoogle = item.source === 'google';
            return (
              <Pressable
                key={item.id}
                style={styles.optionRow}
                onPress={() => void selectSheetItem(item)}
              >
                <Text style={styles.optionText} numberOfLines={1}>
                  {item.label}
                </Text>
                {isGoogle ? (
                  <Ionicons name="map" size={16} color={colors.textMuted} />
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {query.trim().length > 0
                  ? 'No locations found. Try another name.'
                  : 'Start typing to search locations.'}
              </Text>
            </View>
          }
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  errorWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
