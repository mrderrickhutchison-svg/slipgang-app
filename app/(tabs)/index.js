import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { fetchMyGangs, fetchGangMembersMap } from '@/lib/gangs';
import { recordTailAction, recordTailActionForPicks, groupPicksIntoFeedItems } from '@/lib/picks';
import PickCard from '@/components/PickCard';
import BatchCard from '@/components/BatchCard';

const PICKS_SELECT = '*, tails(*), batches(title, created_at)';

const PAGE_SIZE = 20;

export default function Feed() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [gangs, setGangs] = useState([]);
  const [picks, setPicks] = useState([]);
  const [nameMap, setNameMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // FlatList fires onEndReached as soon as it measures "near the end" on the
  // initial layout pass, even with no real scroll — this blocks that
  // premature auto-fire and only allows it once the user has actually
  // started dragging the list.
  const canLoadMore = useRef(false);

  // Full reload: used on mount and on pull-to-refresh. Always resets back to
  // the newest page of picks (plus gang membership + display names).
  const fetchFeed = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const memberships = await fetchMyGangs(user.id);
    setGangs(memberships);

    if (memberships.length === 0) {
      setPicks([]);
      setNameMap({});
      setHasMore(false);
      setLoading(false);
      return;
    }

    const gangIds = memberships.map(g => g.id);
    const [{ data: pickRows, error }, names] = await Promise.all([
      supabase.from('picks').select(PICKS_SELECT).order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1),
      fetchGangMembersMap(gangIds),
    ]);

    if (!error) {
      setPicks(pickRows || []);
      setHasMore((pickRows || []).length === PAGE_SIZE);
    }
    setNameMap(names);
    setLoading(false);
  }, []);

  // Lightweight realtime refresh: re-pulls only the newest page so a new pick
  // or a tail/fade count change surfaces at the top without reloading (or
  // losing the scroll position of) everything already paged in below it.
  const fetchFirstPage = useCallback(async () => {
    const { data: pickRows, error } = await supabase
      .from('picks')
      .select(PICKS_SELECT)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (error) return;

    setPicks(prev => {
      const freshIds = new Set((pickRows || []).map(p => p.id));
      const rest = prev.filter(p => !freshIds.has(p.id));
      return [...(pickRows || []), ...rest];
    });
    setHasMore((pickRows || []).length === PAGE_SIZE);
  }, []);

  const loadMore = useCallback(async () => {
    if (!canLoadMore.current || loadingMore || !hasMore) return;
    canLoadMore.current = false;
    setLoadingMore(true);
    const from = picks.length;
    const to = from + PAGE_SIZE - 1;
    const { data: pickRows, error } = await supabase
      .from('picks')
      .select(PICKS_SELECT)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && pickRows) {
      setPicks(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newOnes = pickRows.filter(p => !existingIds.has(p.id));
        return [...prev, ...newOnes];
      });
      setHasMore(pickRows.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, picks.length]);

  useEffect(() => {
    fetchFeed();
    const picksChannel = supabase
      .channel('feed-picks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks' }, fetchFirstPage)
      .subscribe();
    const tailsChannel = supabase
      .channel('feed-tails-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tails' }, fetchFirstPage)
      .subscribe();
    return () => {
      supabase.removeChannel(picksChannel);
      supabase.removeChannel(tailsChannel);
    };
  }, [fetchFeed, fetchFirstPage]);

  const onRefresh = async () => { setRefreshing(true); await fetchFeed(); setRefreshing(false); };

  const feedItems = useMemo(() => groupPicksIntoFeedItems(picks), [picks]);

  const patchTailsLocally = (pickIds, userIdForAction, action) => {
    const idSet = new Set(pickIds);
    setPicks(prev => prev.map(p => {
      if (!idSet.has(p.id)) return p;
      const others = (p.tails || []).filter(t => t.user_id !== userIdForAction);
      return {
        ...p,
        tails: [...others, { id: `local-${p.id}-${userIdForAction}`, pick_id: p.id, user_id: userIdForAction, action, created_at: new Date().toISOString() }],
      };
    }));
  };

  const handleAction = async (pickId, action) => {
    if (!userId) return;
    try {
      await recordTailAction(pickId, userId, action);
      // Patch just this pick's tails locally instead of refetching — a full
      // refetch would reset pagination back to page one on every tap.
      patchTailsLocally([pickId], userId, action);
    } catch (_e) {
      // Silently ignore — realtime/refresh will reconcile state on next fetch.
    }
  };

  // Records a tail for every pick in the batch in one upsert. Link-opening
  // (which the BatchCard itself handles) happens regardless of this outcome —
  // the task is "record all tails immediately," not gated on what the user
  // does with the sportsbook links afterward.
  const handleTailAll = async (batchItem) => {
    if (!userId) return;
    const pickIds = batchItem.picks.map(p => p.id);
    try {
      await recordTailActionForPicks(pickIds, userId, 'tail');
      patchTailsLocally(pickIds, userId, 'tail');
    } catch (_e) {
      // Silently ignore — realtime/refresh will reconcile state on next fetch.
    }
  };

  const renderEmpty = () => {
    if (loading) {
      return <View style={styles.empty}><Text style={styles.emptyText}>Loading...</Text></View>;
    }
    if (gangs.length === 0) {
      return (
        <View style={styles.empty}>
          <Image source={require('@/assets/logo.png')} style={styles.emptyLogo} />
          <Text style={styles.emptyTitle}>Join a gang first</Text>
          <Text style={styles.emptyText}>The Gang Feed shows picks from your crew. Create or join a gang to get started.</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/gang')}>
            <Text style={styles.emptyCtaText}>Go to Gang →</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Image source={require('@/assets/logo.png')} style={styles.emptyLogo} />
        <Text style={styles.emptyTitle}>No picks yet</Text>
        <Text style={styles.emptyText}>No picks yet. Drop the first one!</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/logo.png')} style={styles.headerLogo} />
          <View>
            <Text style={styles.headerTitle}>SlipGang</Text>
            <Text style={styles.headerSub}>GANG FEED</Text>
          </View>
        </View>
        {gangs.length > 0 && (
          <TouchableOpacity style={styles.dropBtn} onPress={() => router.push('/pick/new')}>
            <Text style={styles.dropBtnText}>+ Drop a Pick</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        style={styles.scroll}
        data={feedItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.type === 'batch' ? (
          <BatchCard
            batch={item}
            dropperName={nameMap[item.dropperId]}
            currentUserId={userId}
            onPressPick={(pickId) => router.push(`/pick/${pickId}`)}
            onTailPick={(pickId) => handleAction(pickId, 'tail')}
            onFadePick={(pickId) => handleAction(pickId, 'fade')}
            onTailAll={handleTailAll}
          />
        ) : (
          <PickCard
            pick={item.pick}
            dropperName={nameMap[item.pick.dropper_id]}
            currentUserId={userId}
            onPress={() => router.push(`/pick/${item.pick.id}`)}
            onTail={() => handleAction(item.pick.id, 'tail')}
            onFade={() => handleAction(item.pick.id, 'fade')}
          />
        )}
        contentContainerStyle={picks.length > 0 ? styles.pickList : styles.emptyFill}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          picks.length === 0 ? null : loadingMore ? (
            <View style={styles.footerLoading}><Text style={styles.emptyText}>Loading more...</Text></View>
          ) : (
            <View style={{ height: 100 }} />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
        onScrollBeginDrag={() => { canLoadMore.current = true; }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 44, height: 44, resizeMode: 'contain' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.brand },
  headerSub: { fontSize: 9, fontWeight: '700', color: COLORS.textMid, letterSpacing: 3, marginTop: 1 },
  dropBtn: { backgroundColor: COLORS.brand, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.full },
  dropBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.bg },
  scroll: { flex: 1 },
  pickList: { padding: SPACING.lg, gap: SPACING.md },
  emptyFill: { flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACING.xl },
  emptyLogo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 15, color: COLORS.textMid, textAlign: 'center' },
  emptyCta: { marginTop: 20, backgroundColor: COLORS.brand, paddingHorizontal: 24, paddingVertical: 14, borderRadius: RADIUS.full },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: COLORS.bg },
  footerLoading: { paddingVertical: SPACING.xl, alignItems: 'center' },
});
