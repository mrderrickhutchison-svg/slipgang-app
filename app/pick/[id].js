import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, RADIUS, SPORTSBOOK_COLORS, SPORTSBOOK_NAMES, PICK_STATUS_COLORS, PICK_STATUS_LABELS } from '@/lib/theme';
import { fetchGangMembersMap } from '@/lib/gangs';
import { recordTailAction } from '@/lib/picks';
import { timeAgo } from '@/lib/time';

export default function PickDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [pick, setPick] = useState(null);
  const [tails, setTails] = useState([]);
  const [nameMap, setNameMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchDetail = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: pickRow, error } = await supabase.from('picks').select('*').eq('id', id).single();
    if (error || !pickRow) { setLoading(false); return; }
    setPick(pickRow);

    const [{ data: tailRows }, names] = await Promise.all([
      supabase.from('tails').select('*').eq('pick_id', id).order('created_at', { ascending: true }),
      fetchGangMembersMap([pickRow.gang_id]),
    ]);
    setTails(tailRows || []);
    setNameMap(names);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const channel = supabase
      .channel(`pick-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tails', filter: `pick_id=eq.${id}` }, fetchDetail)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchDetail, id]);

  // Refetch whenever this screen gains focus — including when the user comes
  // back from the sportsbook app after tapping "Tail this bet".
  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  const myAction = tails.find(t => t.user_id === userId)?.action;
  const tailers = tails.filter(t => t.action === 'tail');
  const faders = tails.filter(t => t.action === 'fade');

  const handleTail = async () => {
    if (!userId || !pick) return;
    setActing(true);
    try {
      // 1. Record the tail and wait for it to land.
      await recordTailAction(pick.id, userId, 'tail');
      // 2. Refresh so the board/count/button reflect the confirmed tail immediately.
      await fetchDetail();
      // 3. Only then send them to the sportsbook to actually place it.
      if (pick.share_url) {
        await Linking.openURL(pick.share_url);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not record tail.');
    }
    setActing(false);
  };

  const handleFade = async () => {
    if (!userId || !pick) return;
    setActing(true);
    try {
      await recordTailAction(pick.id, userId, 'fade');
      await fetchDetail();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not record fade.');
    }
    setActing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}><Text style={styles.emptyText}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  if (!pick) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        </View>
        <View style={styles.empty}><Text style={styles.emptyText}>Pick not found.</Text></View>
      </SafeAreaView>
    );
  }

  const sbColor = SPORTSBOOK_COLORS[pick.sportsbook] || COLORS.textMid;
  const statusColor = PICK_STATUS_COLORS[pick.status] || COLORS.pending;
  const dropperName = nameMap[pick.dropper_id] || 'Gang member';

  const tailLabel = myAction === 'tail'
    ? (pick.share_url ? '✓ Tailing — Open FanDuel again' : '✓ Tailing')
    : (pick.share_url ? 'Tail this bet →' : 'Tail this bet');
  const fadeLabel = myAction === 'fade' ? '✓ Faded' : 'Fade';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dropperRow}>
          <Image source={require('@/assets/logo.png')} style={styles.avatar} />
          <View>
            <Text style={styles.dropperName}>{dropperName}</Text>
            <Text style={styles.timestamp}>{timeAgo(pick.created_at)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{PICK_STATUS_LABELS[pick.status] || pick.status}</Text>
          </View>
        </View>

        <Text style={styles.title}>{pick.title}</Text>

        <View style={styles.badgeRow}>
          {pick.sportsbook ? (
            <View style={[styles.sbBadge, { backgroundColor: sbColor + '20' }]}>
              <Text style={[styles.sbText, { color: sbColor }]}>{SPORTSBOOK_NAMES[pick.sportsbook] || pick.sportsbook}</Text>
            </View>
          ) : null}
          {pick.odds ? <Text style={styles.odds}>{pick.odds}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.tailCta, myAction === 'tail' && styles.tailCtaActive, acting && { opacity: 0.6 }]}
          onPress={handleTail}
          disabled={acting}
        >
          <Text style={styles.tailCtaText}>{tailLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fadeCta, myAction === 'fade' && styles.fadeCtaActive, acting && { opacity: 0.6 }]}
          onPress={handleFade}
          disabled={acting}
        >
          <Text style={[styles.fadeCtaText, myAction === 'fade' && styles.fadeCtaTextActive]}>{fadeLabel}</Text>
        </TouchableOpacity>

        <View style={styles.board}>
          <Text style={styles.boardHeading}>Tailing ({tailers.length})</Text>
          {tailers.length === 0 ? (
            <Text style={styles.boardEmpty}>No one has tailed yet.</Text>
          ) : (
            tailers.map(t => (
              <View key={t.id} style={styles.boardRow}>
                <View style={[styles.boardDot, { backgroundColor: COLORS.winning }]} />
                <Text style={styles.boardName}>{nameMap[t.user_id] || 'Gang member'}</Text>
              </View>
            ))
          )}

          <Text style={[styles.boardHeading, { marginTop: SPACING.lg }]}>Fading ({faders.length})</Text>
          {faders.length === 0 ? (
            <Text style={styles.boardEmpty}>No one has faded yet.</Text>
          ) : (
            faders.map(t => (
              <View key={t.id} style={styles.boardRow}>
                <View style={[styles.boardDot, { backgroundColor: COLORS.losing }]} />
                <Text style={styles.boardName}>{nameMap[t.user_id] || 'Gang member'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText: { color: COLORS.textMid, fontSize: 15, fontWeight: '600' },
  scrollContent: { padding: SPACING.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMid, fontSize: 15 },
  dropperRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  avatar: { width: 40, height: 40, resizeMode: 'contain', borderRadius: RADIUS.full, backgroundColor: COLORS.bgInput },
  dropperName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  timestamp: { fontSize: 12, color: COLORS.textDim, marginTop: 1 },
  statusPill: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl },
  sbBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  sbText: { fontSize: 12, fontWeight: '700' },
  odds: { fontSize: 15, fontWeight: '700', color: COLORS.textMid },
  tailCta: { backgroundColor: COLORS.winning, paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', marginBottom: SPACING.md },
  tailCtaActive: { opacity: 0.85 },
  tailCtaText: { fontSize: 17, fontWeight: '700', color: COLORS.bg },
  fadeCta: { borderWidth: 1.5, borderColor: COLORS.losing, paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', marginBottom: SPACING.xl },
  fadeCtaActive: { backgroundColor: COLORS.losing },
  fadeCtaText: { fontSize: 17, fontWeight: '700', color: COLORS.losing },
  fadeCtaTextActive: { color: COLORS.bg },
  board: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  boardHeading: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: SPACING.sm },
  boardEmpty: { fontSize: 13, color: COLORS.textDim },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  boardDot: { width: 8, height: 8, borderRadius: 4 },
  boardName: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
});
