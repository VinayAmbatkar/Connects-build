import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '@/src/theme/tokens';

/**
 * Pull-to-refresh for a screen: swiping down refetches every query the
 * screen currently shows (all *active* react-query queries), so a screen
 * needs no list of what to reload. Pass `onRefresh` for extra work that
 * isn't a query.
 *
 * Usage: `<ScrollView refreshControl={usePullToRefresh().refreshControl} />`
 * (or FlatList). Not for edit forms -- refetching would reset unsaved input.
 */
export function usePullToRefresh(onRefresh?: () => Promise<unknown> | void) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ type: 'active' }),
        onRefresh?.(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, onRefresh]);

  return {
    refreshing,
    onRefresh: refresh,
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        tintColor={colors.primary}
        colors={[colors.primary]}
      />
    ),
  };
}
