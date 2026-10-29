import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { fetchMyGangs } from '@/lib/gangs';
import { createBatchWithPicks } from '@/lib/batches';

const SPORTSBOOKS = ['fanduel', 'draftkings', 'betmgm', 'caesars', 'espnbet', 'fanatics'];
const SPORTSBOOK_LABELS = { fanduel: 'FanDuel', draftkings: 'DraftKings', betmgm: 'BetMGM', caesars: 'Caesars', espnbet: 'ESPN BET', fanatics: 'Fanatics' };
const MODES = [{ key: 'single', label: 'Single Pick' }, { key: 'batch', label: 'Batch' }];

export default function DropPick() {
  const router = useRouter();
  const [mode, setMode] = useState('single');
  const [userId, setUserId] = useState(null);
  const [gangs, setGangs] = useState([]);
  const [gangId, setGangId] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [title, setTitle] = useState('');
  const [odds, setOdds] = useState('');
  const [sportsbook, setSportsbook] = useState('fanduel');
  const [batchTitle, setBatchTitle] = useState('');
  const [batchPicks, setBatchPicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingGangs, setLoadingGangs] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingGangs(false); return; }
      setUserId(user.id);
      const memberships = await fetchMyGangs(user.id);
      setGangs(memberships);
      if (memberships.length > 0) setGangId(memberships[0].id);
      setLoadingGangs(false);
    })();
  }, []);

  const resetPickFields = () => {
    setTitle('');
    setOdds('');
    setShareUrl('');
  };

  const handleSubmitSingle = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'e.g. "Cardinals NFC Champion"');
      return;
    }
    if (!gangId) {
      Alert.alert('Pick a gang to drop this in');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('picks').insert({
      gang_id: gangId,
      dropper_id: userId,
      title: title.trim(),
      odds: odds.trim() || null,
      sportsbook,
      share_url: shareUrl.trim() || null,
      status: 'pending',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  };

  const handleAddPickToBatch = () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'e.g. "Cardinals NFC Champion"');
      return;
    }
    setBatchPicks(prev => [...prev, { title: title.trim(), odds: odds.trim(), sportsbook, shareUrl: shareUrl.trim() }]);
    resetPickFields();
  };

  const removeBatchPick = (index) => {
    setBatchPicks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitBatch = async () => {
    if (!batchTitle.trim()) {
      Alert.alert('Add a batch title', 'e.g. "Sunday Card"');
      return;
    }
    if (batchPicks.length === 0) {
      Alert.alert('Add at least one pick to the batch');
      return;
    }
    if (!gangId) {
      Alert.alert('Pick a gang to drop this in');
      return;
    }
    setLoading(true);
    try {
      await createBatchWithPicks(gangId, userId, batchTitle.trim(), batchPicks);
      router.back();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Cancel</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'batch' ? 'Drop a Batch' : 'Drop a Pick'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.chipRow}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeChip, mode === m.key && styles.chipActive]}
                onPress={() => setMode(m.key)}
              >
                <Text style={[styles.chipText, mode === m.key && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {gangs.length > 1 && (
            <>
              <Text style={styles.label}>Drop to which gang?</Text>
              <View style={styles.chipRow}>
                {gangs.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, gangId === g.id && styles.chipActive]}
                    onPress={() => setGangId(g.id)}
                  >
                    <Text style={[styles.chipText, gangId === g.id && styles.chipTextActive]}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {mode === 'batch' && (
            <>
              <Text style={styles.label}>Batch Title</Text>
              <TextInput
                style={styles.input}
                value={batchTitle}
                onChangeText={setBatchTitle}
                placeholder="e.g. Sunday Card"
                placeholderTextColor={COLORS.textDim}
              />

              {batchPicks.length > 0 && (
                <View style={styles.batchList}>
                  <Text style={styles.label}>Picks in this batch ({batchPicks.length})</Text>
                  {batchPicks.map((p, i) => (
                    <View key={i} style={[styles.batchPickRow, i === batchPicks.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.batchPickTitle} numberOfLines={1}>{p.title}</Text>
                        <Text style={styles.batchPickMeta}>
                          {SPORTSBOOK_LABELS[p.sportsbook]}{p.odds ? ` · ${p.odds}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeBatchPick(i)}>
                        <Text style={styles.removeText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionLabel}>{batchPicks.length === 0 ? 'Add the first pick' : 'Add another pick'}</Text>
            </>
          )}

          <Text style={styles.label}>Sportsbook</Text>
          <View style={styles.chipRow}>
            {SPORTSBOOKS.map(sb => (
              <TouchableOpacity
                key={sb}
                style={[styles.chip, sportsbook === sb && styles.chipActive]}
                onPress={() => setSportsbook(sb)}
              >
                <Text style={[styles.chipText, sportsbook === sb && styles.chipTextActive]}>{SPORTSBOOK_LABELS[sb]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>FanDuel/Sportsbook Share Link</Text>
          <TextInput
            style={styles.input}
            value={shareUrl}
            onChangeText={setShareUrl}
            placeholder="Paste the share URL (optional)"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Cardinals NFC Champion"
            placeholderTextColor={COLORS.textDim}
          />

          <Text style={styles.label}>Odds</Text>
          <TextInput
            style={styles.input}
            value={odds}
            onChangeText={setOdds}
            placeholder="+150 or -110"
            placeholderTextColor={COLORS.textDim}
            keyboardType="numbers-and-punctuation"
          />

          {mode === 'single' ? (
            <TouchableOpacity
              style={[styles.submitBtn, (loading || loadingGangs) && { opacity: 0.6 }]}
              onPress={handleSubmitSingle}
              disabled={loading || loadingGangs}
            >
              <Text style={styles.submitText}>{loading ? 'Dropping...' : '🐾 Drop this pick'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.addPickBtn} onPress={handleAddPickToBatch}>
                <Text style={styles.addPickText}>+ Add pick to batch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (loading || loadingGangs || batchPicks.length === 0) && { opacity: 0.6 }]}
                onPress={handleSubmitBatch}
                disabled={loading || loadingGangs || batchPicks.length === 0}
              >
                <Text style={styles.submitText}>
                  {loading ? 'Dropping...' : `🐾 Drop ${batchPicks.length} pick${batchPicks.length === 1 ? '' : 's'}`}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText: { color: COLORS.textMid, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  scrollContent: { padding: SPACING.xl },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.brand, marginTop: SPACING.xl, marginBottom: -SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  modeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMid },
  chipTextActive: { color: COLORS.bg },
  input: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.text, fontSize: 15 },
  submitBtn: { backgroundColor: COLORS.brand, paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.xl },
  submitText: { fontSize: 17, fontWeight: '700', color: COLORS.bg },
  addPickBtn: { borderWidth: 1.5, borderColor: COLORS.brand, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.xl },
  addPickText: { fontSize: 15, fontWeight: '700', color: COLORS.brand },
  batchList: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginTop: SPACING.lg },
  batchPickRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  batchPickTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  batchPickMeta: { fontSize: 12, color: COLORS.textMid, marginTop: 2 },
  removeText: { color: COLORS.losing, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
});
