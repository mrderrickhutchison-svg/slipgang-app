import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING, RADIUS, SPORTSBOOK_NAMES } from '@/lib/theme';
import { parseBetText } from '@/lib/betParser';

const SPORTSBOOKS = ['fanduel', 'draftkings', 'betmgm', 'caesars', 'espnbet', 'fanatics'];
const BET_TYPES = ['single', 'parlay', 'sgp'];
const LEG_TYPE_LABELS = { moneyline: 'ML', spread: 'Spread', total: 'Total', player_prop: 'Prop' };
const LEG_TYPE_ORDER = ['moneyline', 'spread', 'total', 'player_prop'];

export default function AddBet() {
  const [mode, setMode] = useState('paste'); // 'paste', 'manual', or 'screenshot'
  const [sportsbook, setSportsbook] = useState('fanduel');
  const [betType, setBetType] = useState('single');
  const [odds, setOdds] = useState('');
  const [stake, setStake] = useState('');
  const [description, setDescription] = useState('');
  const [numLegs, setNumLegs] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [editedBet, setEditedBet] = useState(null);
  const [loading, setLoading] = useState(false);

  const needsReviewNow = editedBet ? (!editedBet.odds || !editedBet.stake || editedBet.legs.length === 0) : false;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow SlipGang to access your photos to upload bet screenshots.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setScreenshot(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow SlipGang to use your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) {
      setScreenshot(result.assets[0]);
    }
  };

  const calcPayout = () => {
    if (!odds || !stake) return '—';
    const o = parseInt(odds);
    const s = parseFloat(stake);
    if (isNaN(o) || isNaN(s)) return '—';
    let payout;
    if (o > 0) payout = s * (o / 100) + s;
    else payout = s * (100 / Math.abs(o)) + s;
    return `$${payout.toFixed(2)}`;
  };

  const submitManual = async () => {
    if (!odds || !stake) {
      Alert.alert('Fill in odds and stake');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const oddsNum = parseInt(odds);
    const stakeNum = parseFloat(stake);
    const oddsDecimal = oddsNum > 0 ? (oddsNum / 100) + 1 : (100 / Math.abs(oddsNum)) + 1;
    const payout = stakeNum * oddsDecimal;

    const { error } = await supabase.from('bets').insert({
      user_id: user.id,
      sportsbook,
      bet_type: betType,
      odds: (oddsNum > 0 ? '+' : '') + oddsNum,
      odds_decimal: oddsDecimal,
      stake: stakeNum,
      potential_payout: Math.round(payout * 100) / 100,
      status: 'pending',
      source: 'manual',
      raw_source: description || null,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('🐾 Bet tracked!', 'Your bet is in The Doghouse.');
      // Reset form
      setOdds('');
      setStake('');
      setDescription('');
    }
  };

  const submitScreenshot = async () => {
    if (!screenshot) {
      Alert.alert('Select a screenshot first');
      return;
    }
    setLoading(true);

    // Upload image to Supabase Storage
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const fileName = `${user.id}/${Date.now()}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(screenshot.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from('bet-screenshots')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    Alert.alert('Screenshot saved!', "Automatic reading isn't available yet — please use the Paste tab to add this bet's details.");
    setScreenshot(null);
  };

  const handleParseBet = () => {
    const result = parseBetText(pasteText);
    setParsed(result);
    if (result.data.sportsbook) setSportsbook(result.data.sportsbook);
    if (result.ok) {
      setEditedBet({
        bet_type: result.data.bet_type,
        odds: result.data.odds || '',
        stake: result.data.stake != null ? String(result.data.stake) : '',
        potential_payout: result.data.potential_payout != null ? String(result.data.potential_payout) : '',
        legs: result.data.legs.map(leg => ({ selection: leg.selection, type: leg.type })),
      });
    } else {
      setEditedBet(null);
    }
  };

  const updateLeg = (index, changes) => {
    setEditedBet(prev => ({
      ...prev,
      legs: prev.legs.map((leg, i) => i === index ? { ...leg, ...changes } : leg),
    }));
  };

  const removeLeg = (index) => {
    setEditedBet(prev => ({ ...prev, legs: prev.legs.filter((_, i) => i !== index) }));
  };

  const cycleLegType = (index) => {
    setEditedBet(prev => {
      const current = prev.legs[index].type;
      const next = LEG_TYPE_ORDER[(LEG_TYPE_ORDER.indexOf(current) + 1) % LEG_TYPE_ORDER.length];
      return { ...prev, legs: prev.legs.map((leg, i) => i === index ? { ...leg, type: next } : leg) };
    });
  };

  const submitPaste = async () => {
    if (!editedBet || editedBet.legs.length === 0) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const oddsNum = parseInt(editedBet.odds, 10);
    const oddsDecimal = !isNaN(oddsNum) ? (oddsNum > 0 ? (oddsNum / 100) + 1 : (100 / Math.abs(oddsNum)) + 1) : null;
    const stakeNum = parseFloat(editedBet.stake);
    const payoutNum = parseFloat(editedBet.potential_payout);

    const { data: newBet, error } = await supabase.from('bets').insert({
      user_id: user.id,
      sportsbook,
      bet_type: editedBet.bet_type,
      odds: editedBet.odds || 'TBD',
      odds_decimal: oddsDecimal,
      stake: isNaN(stakeNum) ? 0 : stakeNum,
      potential_payout: isNaN(payoutNum) ? 0 : payoutNum,
      status: 'pending',
      source: 'share_extension',
      confirmation_status: needsReviewNow ? 'pending_confirmation' : 'confirmed',
      parsed_data: { raw_text: pasteText, parsed: parsed.data, edited: editedBet },
    }).select().single();

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    const legsPayload = editedBet.legs.map((leg, i) => ({
      bet_id: newBet.id,
      selection: leg.selection,
      leg_type: leg.type,
      status: 'pending',
      sort_order: i,
    }));

    const { error: legsError } = await supabase.from('bet_legs').insert(legsPayload);

    setLoading(false);
    if (legsError) {
      Alert.alert('Error', legsError.message);
    } else {
      Alert.alert('🐾 Bet tracked!', 'Your bet is in The Doghouse.');
      setPasteText('');
      setParsed(null);
      setEditedBet(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Bet</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'paste' && styles.modeBtnActive]}
              onPress={() => setMode('paste')}
            >
              <Text style={[styles.modeText, mode === 'paste' && styles.modeTextActive]}>📋 Paste</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
              onPress={() => setMode('manual')}
            >
              <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>✏️ Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'screenshot' && styles.modeBtnActive]}
              onPress={() => setMode('screenshot')}
            >
              <Text style={[styles.modeText, mode === 'screenshot' && styles.modeTextActive]}>📸 Screenshot</Text>
            </TouchableOpacity>
          </View>

          {/* Sportsbook selector */}
          <Text style={styles.label}>Sportsbook</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {SPORTSBOOKS.map(sb => (
                <TouchableOpacity
                  key={sb}
                  style={[styles.chip, sportsbook === sb && styles.chipActive]}
                  onPress={() => setSportsbook(sb)}
                >
                  <Text style={[styles.chipText, sportsbook === sb && styles.chipTextActive]}>
                    {SPORTSBOOK_NAMES[sb] || sb}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {mode === 'manual' && (
            <>
              {/* Bet type */}
              <Text style={styles.label}>Bet Type</Text>
              <View style={styles.chipRow}>
                {BET_TYPES.map(bt => (
                  <TouchableOpacity
                    key={bt}
                    style={[styles.chip, betType === bt && styles.chipActive]}
                    onPress={() => setBetType(bt)}
                  >
                    <Text style={[styles.chipText, betType === bt && styles.chipTextActive]}>
                      {bt === 'sgp' ? 'SGP' : bt.charAt(0).toUpperCase() + bt.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text style={styles.label}>What's the bet?</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., Chiefs ML, Mahomes 2+ TD"
                placeholderTextColor={COLORS.textDim}
                multiline
              />

              {/* Odds + Stake */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Odds</Text>
                  <TextInput
                    style={styles.input}
                    value={odds}
                    onChangeText={setOdds}
                    placeholder="+150 or -110"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stake ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={stake}
                    onChangeText={setStake}
                    placeholder="50"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Payout preview */}
              <View style={styles.payoutRow}>
                <Text style={styles.payoutLabel}>Potential Payout</Text>
                <Text style={styles.payoutValue}>{calcPayout()}</Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={submitManual}
                disabled={loading}
              >
                <Text style={styles.submitText}>{loading ? 'Saving...' : '🐾 Track this bet'}</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'screenshot' && (
            <>
              {/* Screenshot upload */}
              <Text style={styles.label}>Upload Bet Slip (Fallback)</Text>

              {screenshot ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: screenshot.uri }} style={styles.preview} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setScreenshot(null)}>
                    <Text style={styles.removeText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadRow}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                    <Text style={styles.uploadEmoji}>🖼️</Text>
                    <Text style={styles.uploadText}>Photo Library</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
                    <Text style={styles.uploadEmoji}>📷</Text>
                    <Text style={styles.uploadText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.helperNote}>
                Screenshot reading is coming soon. For now, use Paste for instant tracking — it's faster and more accurate.
              </Text>

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={submitScreenshot}
                disabled={loading}
              >
                <Text style={styles.submitText}>{loading ? 'Uploading...' : '🐾 Upload & Track'}</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'paste' && (
            <>
              {/* Paste bet slip */}
              <Text style={styles.label}>Paste Bet Slip</Text>
              <TextInput
                style={styles.pasteInput}
                value={pasteText}
                onChangeText={(t) => { setPasteText(t); setParsed(null); setEditedBet(null); }}
                placeholder="Paste your copied bet slip text here..."
                placeholderTextColor={COLORS.textDim}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.helperNote}>
                Copy your bet slip from FanDuel or DraftKings (tap Share {'>'} Copy), then paste it here.
              </Text>

              <TouchableOpacity
                style={[styles.parseBtn, !pasteText.trim() && { opacity: 0.5 }]}
                onPress={handleParseBet}
                disabled={!pasteText.trim()}
              >
                <Text style={styles.parseBtnText}>🔍 Parse Bet</Text>
              </TouchableOpacity>

              {parsed && (
                <View style={styles.previewCard}>
                  {!parsed.ok || !editedBet ? (
                    <Text style={styles.previewEmpty}>Couldn't find any bet legs in that text. Try pasting more of the slip.</Text>
                  ) : (
                    <>
                      {needsReviewNow && (
                        <View style={styles.reviewNote}>
                          <Text style={styles.reviewNoteText}>⚠️ Double-check the details below before saving.</Text>
                        </View>
                      )}

                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Sportsbook</Text>
                        <Text style={styles.previewValue}>{SPORTSBOOK_NAMES[sportsbook] || sportsbook}</Text>
                      </View>

                      <Text style={styles.editLabel}>Bet Type</Text>
                      <View style={styles.chipRow}>
                        {BET_TYPES.map(bt => (
                          <TouchableOpacity
                            key={bt}
                            style={[styles.chip, editedBet.bet_type === bt && styles.chipActive]}
                            onPress={() => setEditedBet(prev => ({ ...prev, bet_type: bt }))}
                          >
                            <Text style={[styles.chipText, editedBet.bet_type === bt && styles.chipTextActive]}>
                              {bt === 'sgp' ? 'SGP' : bt.charAt(0).toUpperCase() + bt.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Odds</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editedBet.odds}
                            onChangeText={(t) => setEditedBet(prev => ({ ...prev, odds: t }))}
                            placeholder="+150 or -110"
                            placeholderTextColor={COLORS.textDim}
                            keyboardType="numbers-and-punctuation"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.editLabel}>Stake ($)</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editedBet.stake}
                            onChangeText={(t) => setEditedBet(prev => ({ ...prev, stake: t }))}
                            placeholder="50"
                            placeholderTextColor={COLORS.textDim}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>

                      <Text style={styles.editLabel}>Potential Payout ($)</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editedBet.potential_payout}
                        onChangeText={(t) => setEditedBet(prev => ({ ...prev, potential_payout: t }))}
                        placeholder="310"
                        placeholderTextColor={COLORS.textDim}
                        keyboardType="decimal-pad"
                      />

                      <Text style={styles.legsHeading}>Legs ({editedBet.legs.length})</Text>
                      <View style={styles.legsList}>
                        {editedBet.legs.map((leg, i) => (
                          <View key={i} style={styles.legEditRow}>
                            <TextInput
                              style={styles.legEditInput}
                              value={leg.selection}
                              onChangeText={(t) => updateLeg(i, { selection: t })}
                              placeholderTextColor={COLORS.textDim}
                              multiline
                            />
                            <TouchableOpacity style={styles.legTypeBadge} onPress={() => cycleLegType(i)}>
                              <Text style={styles.legTypeBadgeText}>{LEG_TYPE_LABELS[leg.type] || leg.type}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.legRemoveBtn} onPress={() => removeLeg(i)}>
                              <Text style={styles.legRemoveText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                      {editedBet.legs.length === 0 && (
                        <Text style={styles.previewEmpty}>No legs left — add at least one to save.</Text>
                      )}

                      <TouchableOpacity
                        style={[styles.submitBtn, (loading || editedBet.legs.length === 0) && { opacity: 0.6 }]}
                        onPress={submitPaste}
                        disabled={loading || editedBet.legs.length === 0}
                      >
                        <Text style={styles.submitText}>{loading ? 'Saving...' : '🐾 Track this bet'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
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
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.xl },
  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  modeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: 'rgba(245,166,35,0.12)', borderColor: COLORS.brand },
  modeText: { fontSize: 15, fontWeight: '600', color: COLORS.textMid },
  modeTextActive: { color: COLORS.brand },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  chipRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMid },
  chipTextActive: { color: COLORS.bg },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: SPACING.md },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payoutLabel: { fontSize: 14, color: COLORS.textMid },
  payoutValue: { fontSize: 22, fontWeight: '800', color: COLORS.winning },
  submitBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  submitText: { fontSize: 17, fontWeight: '700', color: COLORS.bg },
  uploadRow: { flexDirection: 'row', gap: SPACING.md },
  uploadBtn: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingVertical: 40,
    alignItems: 'center',
  },
  uploadEmoji: { fontSize: 32, marginBottom: SPACING.sm },
  uploadText: { fontSize: 14, color: COLORS.textMid },
  previewWrap: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  preview: { width: '100%', height: 300, resizeMode: 'contain', backgroundColor: COLORS.bgCard },
  removeBtn: { padding: SPACING.md, alignItems: 'center', backgroundColor: COLORS.bgCard },
  removeText: { color: COLORS.losing, fontWeight: '600' },
  pasteInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 160,
  },
  parseBtn: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  parseBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.brand },
  helperNote: { fontSize: 12, color: COLORS.textDim, marginTop: SPACING.sm, lineHeight: 17 },
  previewCard: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  reviewNote: {
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1,
    borderColor: COLORS.brand,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  reviewNoteText: { color: COLORS.brand, fontSize: 13, fontWeight: '600' },
  previewEmpty: { color: COLORS.textMid, fontSize: 14, textAlign: 'center', paddingVertical: SPACING.lg },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewLabel: { fontSize: 13, color: COLORS.textMid },
  previewValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  legsHeading: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  legsList: { gap: SPACING.sm },
  editLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMid, marginBottom: SPACING.xs, marginTop: SPACING.md },
  editInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  legEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legEditInput: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  legTypeBadge: { backgroundColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  legTypeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMid },
  legRemoveBtn: { padding: SPACING.xs },
  legRemoveText: { color: COLORS.losing, fontSize: 16, fontWeight: '700' },
});
