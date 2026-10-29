import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, RefreshControl, Alert, Share, Image, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { fetchMyGangs, fetchGangMembers, createGang, joinGangByCode, leaveGang } from '@/lib/gangs';

export default function Gang() {
  const [userId, setUserId] = useState(null);
  const [gangs, setGangs] = useState([]);
  const [activeGangId, setActiveGangId] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForms, setShowForms] = useState(false);

  const [createName, setCreateName] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeGang = gangs.find(g => g.id === activeGangId);

  const fetchAll = useCallback(async (preferredGangId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const memberships = await fetchMyGangs(user.id);
    setGangs(memberships);

    const defaultName = memberships[0]?.my_display_name || (user.email ? user.email.split('@')[0] : '');
    setCreateDisplayName(prev => prev || defaultName);
    setJoinDisplayName(prev => prev || defaultName);

    const nextActive = preferredGangId && memberships.some(g => g.id === preferredGangId)
      ? preferredGangId
      : (memberships[0]?.id || null);
    setActiveGangId(nextActive);

    if (nextActive) {
      const [memberRows, { data: pickRows }] = await Promise.all([
        fetchGangMembers(nextActive),
        supabase.from('picks').select('dropper_id, status').eq('gang_id', nextActive),
      ]);
      setMembers(memberRows);

      const stats = {};
      memberRows.forEach(m => { stats[m.user_id] = { name: m.display_name, dropped: 0, won: 0, lost: 0 }; });
      (pickRows || []).forEach(p => {
        if (!stats[p.dropper_id]) stats[p.dropper_id] = { name: 'Gang member', dropped: 0, won: 0, lost: 0 };
        stats[p.dropper_id].dropped += 1;
        if (p.status === 'won') stats[p.dropper_id].won += 1;
        if (p.status === 'lost') stats[p.dropper_id].lost += 1;
      });
      const board = Object.values(stats)
        .map(s => ({ ...s, winRate: (s.won + s.lost) > 0 ? Math.round((s.won / (s.won + s.lost)) * 100) : 0 }))
        .sort((a, b) => b.won - a.won || b.winRate - a.winRate);
      setLeaderboard(board);
    } else {
      setMembers([]);
      setLeaderboard([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => { setRefreshing(true); await fetchAll(activeGangId); setRefreshing(false); };

  const handleCreate = async () => {
    if (!createName.trim() || !createDisplayName.trim()) {
      Alert.alert('Fill in a gang name and your display name');
      return;
    }
    setSubmitting(true);
    try {
      const gang = await createGang(userId, createName.trim(), createDisplayName.trim());
      setCreateName('');
      setShowForms(false);
      await fetchAll(gang.id);
      Alert.alert('🐾 Gang created!', `Share code ${gang.invite_code} with your crew.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSubmitting(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinDisplayName.trim()) {
      Alert.alert('Fill in the invite code and your display name');
      return;
    }
    setSubmitting(true);
    try {
      const gang = await joinGangByCode(userId, joinCode.trim(), joinDisplayName.trim());
      setJoinCode('');
      setShowForms(false);
      await fetchAll(gang.id);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSubmitting(false);
  };

  const handleShare = () => {
    if (!activeGang) return;
    Share.share({
      message: `Join my gang "${activeGang.name}" on SlipGang 🐕 Use code ${activeGang.invite_code} — download: https://slipgang.com`,
    });
  };

  const handleCopyCode = async () => {
    if (!activeGang) return;
    await Clipboard.setStringAsync(activeGang.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLeave = () => {
    if (!activeGang) return;
    Alert.alert('Leave Gang', `Leave "${activeGang.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await leaveGang(userId, activeGang.id);
            await fetchAll();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>Gang</Text></View>
        <View style={styles.empty}><Text style={styles.emptyText}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>Gang</Text></View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
        >
          {gangs.length === 0 ? (
            <View style={styles.empty}>
              <Image source={require('@/assets/logo.png')} style={styles.emptyLogo} />
              <Text style={styles.emptyTitle}>No gang yet</Text>
              <Text style={styles.emptyText}>Create a gang or join one with an invite code to start dropping picks.</Text>
            </View>
          ) : (
            <>
              {gangs.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
                  <View style={styles.chipRow}>
                    {gangs.map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.chip, activeGangId === g.id && styles.chipActive]}
                        onPress={() => fetchAll(g.id)}
                      >
                        <Text style={[styles.chipText, activeGangId === g.id && styles.chipTextActive]}>{g.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {activeGang && (
                <View style={styles.gangCard}>
                  <Text style={styles.gangName}>{activeGang.name}</Text>
                  <View style={styles.inviteRow}>
                    <Text style={styles.inviteLabel}>Invite Code</Text>
                    <View style={styles.inviteCodeRow}>
                      <Text style={styles.inviteCode}>{activeGang.invite_code}</Text>
                      <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                        <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.memberCount}>{members.length} member{members.length === 1 ? '' : 's'}</Text>
                  <View style={styles.gangActions}>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                      <Text style={styles.shareBtnText}>Share Invite</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
                      <Text style={styles.leaveBtnText}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>Leaderboard</Text>
              {leaderboard.length === 0 ? (
                <Text style={styles.emptyText}>No picks dropped yet.</Text>
              ) : (
                <View style={styles.leaderboard}>
                  {leaderboard.map((row, i) => (
                    <View key={i} style={[styles.leaderRow, i !== leaderboard.length - 1 && styles.leaderRowBorder]}>
                      <Text style={styles.rank}>#{i + 1}</Text>
                      <Text style={styles.leaderName} numberOfLines={1}>{row.name}</Text>
                      <Text style={styles.leaderRecord}>{row.won}-{row.lost}</Text>
                      <Text style={styles.leaderRate}>{row.winRate}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowForms(!showForms)}>
            <Text style={styles.toggleBtnText}>{showForms ? '✕ Close' : gangs.length === 0 ? '+ Create or Join a Gang' : '+ Create or Join Another'}</Text>
          </TouchableOpacity>

          {showForms && (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Create a Gang</Text>
                <TextInput
                  style={styles.input}
                  value={createName}
                  onChangeText={setCreateName}
                  placeholder="Gang name"
                  placeholderTextColor={COLORS.textDim}
                />
                <TextInput
                  style={styles.input}
                  value={createDisplayName}
                  onChangeText={setCreateDisplayName}
                  placeholder="Your display name"
                  placeholderTextColor={COLORS.textDim}
                />
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleCreate} disabled={submitting}>
                  <Text style={styles.submitText}>Create Gang</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Join a Gang</Text>
                <TextInput
                  style={styles.input}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="Invite code"
                  placeholderTextColor={COLORS.textDim}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={styles.input}
                  value={joinDisplayName}
                  onChangeText={setJoinDisplayName}
                  placeholder="Your display name"
                  placeholderTextColor={COLORS.textDim}
                />
                <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleJoin} disabled={submitting}>
                  <Text style={styles.submitText}>Join Gang</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  scrollContent: { padding: SPACING.xl },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: SPACING.md },
  emptyLogo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 16, opacity: 0.6 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 15, color: COLORS.textMid, textAlign: 'center' },
  chipRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMid },
  chipTextActive: { color: COLORS.bg },
  gangCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.xl },
  gangName: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  inviteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.sm },
  inviteLabel: { fontSize: 12, color: COLORS.textMid },
  inviteCodeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  inviteCode: { fontSize: 18, fontWeight: '800', color: COLORS.brand, letterSpacing: 2 },
  copyBtn: { backgroundColor: 'rgba(245,166,35,0.12)', borderWidth: 1, borderColor: COLORS.brand, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  copyBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.brand },
  memberCount: { fontSize: 13, color: COLORS.textMid, marginBottom: SPACING.md },
  gangActions: { flexDirection: 'row', gap: SPACING.sm },
  shareBtn: { flex: 1, backgroundColor: COLORS.brand, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.bg },
  leaveBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.losing, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  leaveBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.losing },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.md },
  leaderboard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  leaderRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rank: { fontSize: 13, fontWeight: '700', color: COLORS.textDim, width: 28 },
  leaderName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  leaderRecord: { fontSize: 13, color: COLORS.textMid, marginRight: SPACING.sm },
  leaderRate: { fontSize: 13, fontWeight: '700', color: COLORS.brand, width: 44, textAlign: 'right' },
  toggleBtn: { marginTop: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.brand, alignItems: 'center' },
  toggleBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.brand },
  formCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginTop: SPACING.lg, gap: SPACING.sm },
  formTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  submitBtn: { backgroundColor: COLORS.brand, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.xs },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.bg },
});
