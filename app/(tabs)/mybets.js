import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, RADIUS, SPORTSBOOK_COLORS, SPORTSBOOK_NAMES, STATUS_COLORS } from '@/lib/theme';
import BetCard from '@/components/BetCard';

const GROUP_MODES = ['Game', 'Book', 'Status', 'Sport', 'Type'];
const VIEWS = ['Active', 'Settled'];

export default function MyBets() {
  const [view, setView] = useState('Active');
  const [bets, setBets] = useState([]);
  const [summary, setSummary] = useState({ total: 0, winning: 0, losing: 0, pending: 0, totalRisk: 0 });
  const [groupMode, setGroupMode] = useState('Game');
  const [settledBets, setSettledBets] = useState([]);
  const [settledStats, setSettledStats] = useState({ wins: 0, losses: 0, netPL: 0, wagered: 0, winRate: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBets = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: activeData }, { data: settledData }] = await Promise.all([
      supabase
        .from('bets')
        .select('*, bet_legs(*)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'winning', 'losing'])
        .order('created_at', { ascending: false }),
      supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['won', 'lost', 'pushed', 'cashed_out'])
        .order('settled_at', { ascending: false })
        .limit(50),
    ]);

    if (activeData) {
      setBets(activeData);
      const w = activeData.filter(b => b.status === 'winning').length;
      const l = activeData.filter(b => b.status === 'losing').length;
      const p = activeData.filter(b => b.status === 'pending').length;
      const risk = activeData.reduce((s, b) => s + Number(b.stake || 0), 0);
      setSummary({ total: activeData.length, winning: w, losing: l, pending: p, totalRisk: risk });
    }

    if (settledData) {
      setSettledBets(settledData);
      const wins = settledData.filter(b => b.status === 'won').length;
      const losses = settledData.filter(b => b.status === 'lost').length;
      const wagered = settledData.reduce((s, b) => s + Number(b.stake || 0), 0);
      const returned = settledData.filter(b => b.status === 'won').reduce((s, b) => s + Number(b.potential_payout || 0), 0);
      const netPL = returned - wagered;
      const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
      setSettledStats({ wins, losses, netPL, wagered, winRate });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBets();
    const channel = supabase
      .channel('bets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, fetchBets)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchBets]);

  const onRefresh = async () => { setRefreshing(true); await fetchBets(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/logo.png')} style={styles.headerLogo} />
          <View>
            <Text style={styles.headerTitle}>SlipGang</Text>
            <Text style={styles.headerSub}>THE DOGHOUSE</Text>
          </View>
        </View>
        <View style={styles.proBadge}><Text style={styles.proText}>FREE</Text></View>
      </View>

      <View style={styles.viewToggleRow}>
        {VIEWS.map(v => (
          <TouchableOpacity
            key={v}
            style={[styles.viewToggleBtn, view === v && styles.viewToggleBtnActive]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.viewToggleText, view === v && styles.viewToggleTextActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5A623" />}>
        {view === 'Active' ? (
          <>
            <View style={styles.commandCenter}>
              <View style={styles.statRow}>
                <StatBox label="Active" value={summary.total} />
                <StatBox label="Winning" value={summary.winning} color="#00D26A" />
                <StatBox label="Losing" value={summary.losing} color="#FF4D6A" />
                <StatBox label="Pending" value={summary.pending} color="#8B95A5" />
              </View>
              <View style={styles.riskRow}>
                <Text style={styles.riskLabel}>Total at Risk</Text>
                <Text style={styles.riskValue}>${summary.totalRisk.toLocaleString()}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
              <View style={styles.tabRow}>
                {GROUP_MODES.map(mode => (
                  <TouchableOpacity key={mode} style={[styles.tab, groupMode === mode && styles.tabActive]} onPress={() => setGroupMode(mode)}>
                    <Text style={[styles.tabText, groupMode === mode && styles.tabTextActive]}>{mode}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {loading ? (
              <View style={styles.empty}><Text style={styles.emptyText}>Loading...</Text></View>
            ) : bets.length === 0 ? (
              <View style={styles.empty}>
                <Image source={require('@/assets/logo.png')} style={styles.emptyLogo} />
                <Text style={styles.emptyTitle}>The Doghouse is empty</Text>
                <Text style={styles.emptyText}>Add your first bet to start tracking!</Text>
              </View>
            ) : (
              <View style={styles.betList}>{bets.map(bet => <BetCard key={bet.id} bet={bet} />)}</View>
            )}
          </>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: settledStats.netPL >= 0 ? '#00D26A' : '#FF4D6A' }]}>{settledStats.netPL >= 0 ? '+' : ''}${Math.abs(settledStats.netPL).toLocaleString()}</Text>
                <Text style={styles.statLabel}>Net P&L</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{settledStats.wins}W-{settledStats.losses}L</Text>
                <Text style={styles.statLabel}>Record</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#F5A623' }]}>{settledStats.winRate}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>${settledStats.wagered.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Wagered</Text>
              </View>
            </View>
            {loading ? (
              <View style={styles.empty}><Text style={styles.emptyText}>Loading...</Text></View>
            ) : settledBets.length === 0 ? (
              <View style={styles.empty}>
                <Image source={require('@/assets/logo.png')} style={styles.emptyLogo} />
                <Text style={styles.emptyTitle}>No settled bets yet</Text>
                <Text style={styles.emptyText}>Your results will show up here once bets settle.</Text>
              </View>
            ) : (
              <View style={styles.betList}>
                {settledBets.map(bet => (
                  <View key={bet.id} style={styles.historyCard}>
                    <View style={[styles.historyStatus, { backgroundColor: STATUS_COLORS[bet.status] }]} />
                    <View style={styles.historyBody}>
                      <View style={styles.historyTop}>
                        <View style={[styles.sbBadge, { backgroundColor: (SPORTSBOOK_COLORS[bet.sportsbook] || '#8B95A5') + '20' }]}>
                          <Text style={[styles.sbText, { color: SPORTSBOOK_COLORS[bet.sportsbook] || '#8B95A5' }]}>{SPORTSBOOK_NAMES[bet.sportsbook] || bet.sportsbook}</Text>
                        </View>
                        <Text style={[styles.historyResult, { color: STATUS_COLORS[bet.status] }]}>{bet.status === 'won' ? 'WON' : bet.status === 'lost' ? 'LOST' : 'PUSH'}</Text>
                      </View>
                      <Text style={styles.historyDesc} numberOfLines={1}>{bet.raw_source || bet.bet_type}</Text>
                      <View style={styles.historyBottom}>
                        <Text style={styles.historyOdds}>{bet.odds}</Text>
                        <Text style={styles.historyStake}>${Number(bet.stake).toFixed(2)} → {bet.status === 'won' ? '$' + Number(bet.potential_payout).toLocaleString() : '$0'}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 110, height: 110, resizeMode: 'contain' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#F5A623' },
  headerSub: { fontSize: 9, fontWeight: '700', color: '#8B95A5', letterSpacing: 3, marginTop: 1 },
  proBadge: { backgroundColor: '#0F1218', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  proText: { fontSize: 11, fontWeight: '700', color: '#8B95A5' },
  viewToggleRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  viewToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: 'rgba(245,166,35,0.12)', borderColor: COLORS.brand },
  viewToggleText: { fontSize: 14, fontWeight: '700', color: COLORS.textMid },
  viewToggleTextActive: { color: COLORS.brand },
  scroll: { flex: 1 },
  commandCenter: { margin: 16, backgroundColor: '#0F1218', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#8B95A5', marginTop: 2 },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  riskLabel: { fontSize: 13, color: '#8B95A5' },
  riskValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  tabScroll: { marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#0F1218', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tabActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8B95A5' },
  tabTextActive: { color: '#07090D' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyLogo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#8B95A5', textAlign: 'center' },
  betList: { paddingHorizontal: 16, gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#0F1218', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  historyCard: { backgroundColor: '#0F1218', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', overflow: 'hidden' },
  historyStatus: { width: 4 },
  historyBody: { flex: 1, padding: 16 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sbBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sbText: { fontSize: 11, fontWeight: '700' },
  historyResult: { fontSize: 13, fontWeight: '800' },
  historyDesc: { fontSize: 14, color: '#FFFFFF', fontWeight: '600', marginBottom: 8 },
  historyBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  historyOdds: { fontSize: 13, color: '#8B95A5', fontWeight: '600' },
  historyStake: { fontSize: 13, color: '#8B95A5' },
});
