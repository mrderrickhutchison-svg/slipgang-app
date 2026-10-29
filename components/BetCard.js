import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, SPORTSBOOK_COLORS, SPORTSBOOK_NAMES, STATUS_COLORS } from '@/lib/theme';

export default function BetCard({ bet }) {
  const [expanded, setExpanded] = useState(false);
  const legs = bet.bet_legs || [];
  const isParlay = legs.length > 1;
  const legsWon = legs.filter(l => l.status === 'won' || l.status === 'winning').length;
  const sbColor = SPORTSBOOK_COLORS[bet.sportsbook] || COLORS.textMid;
  const statusColor = STATUS_COLORS[bet.status] || COLORS.pending;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => isParlay && setExpanded(!expanded)}
      activeOpacity={isParlay ? 0.7 : 1}
    >
      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.body}>
        {/* Top row: sportsbook + type + odds */}
        <View style={styles.topRow}>
          <View style={styles.badges}>
            <View style={[styles.sbBadge, { backgroundColor: sbColor + '20' }]}>
              <Text style={[styles.sbText, { color: sbColor }]}>
                {SPORTSBOOK_NAMES[bet.sportsbook] || bet.sportsbook}
              </Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {bet.bet_type === 'sgp' ? 'SGP' : bet.bet_type.charAt(0).toUpperCase() + bet.bet_type.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.odds, { color: statusColor }]}>{bet.odds}</Text>
        </View>

        {/* Description or first leg */}
        <Text style={styles.description} numberOfLines={2}>
          {bet.raw_source || legs[0]?.selection || 'Bet'}
        </Text>

        {/* Parlay progress */}
        {isParlay && (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              {legs.map((leg, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressSegment,
                    {
                      flex: 1,
                      backgroundColor:
                        leg.status === 'won' || leg.status === 'winning' ? COLORS.winning :
                        leg.status === 'lost' || leg.status === 'losing' ? COLORS.losing :
                        COLORS.textDim + '40',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.progressText}>
              {legsWon}/{legs.length} legs
            </Text>
          </View>
        )}

        {/* Stake / Payout */}
        <View style={styles.stakeRow}>
          <Text style={styles.stakeText}>${Number(bet.stake).toFixed(2)} stake</Text>
          <Text style={styles.payoutText}>→ ${Number(bet.potential_payout).toLocaleString()}</Text>
        </View>

        {/* Expanded legs */}
        {expanded && legs.length > 0 && (
          <View style={styles.legsContainer}>
            {legs.map((leg, i) => (
              <View key={i} style={styles.legRow}>
                <View style={[styles.legDot, { backgroundColor: STATUS_COLORS[leg.status] || COLORS.pending }]} />
                <View style={styles.legInfo}>
                  <Text style={styles.legSelection}>{leg.selection}</Text>
                  {leg.stat_current != null && leg.stat_target != null && (
                    <Text style={styles.legStat}>
                      {leg.stat_current}/{leg.stat_target} {leg.stat_type?.replace(/_/g, ' ')}
                    </Text>
                  )}
                </View>
                <Text style={[styles.legStatus, { color: STATUS_COLORS[leg.status] || COLORS.pending }]}>
                  {leg.status === 'winning' ? '✓' : leg.status === 'losing' ? '✗' : leg.status === 'won' ? '✓' : leg.status === 'lost' ? '✗' : '•'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Expand hint */}
        {isParlay && !expanded && (
          <Text style={styles.expandHint}>Tap to see legs ↓</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusBar: { width: 4 },
  body: { flex: 1, padding: SPACING.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  badges: { flexDirection: 'row', gap: SPACING.sm },
  sbBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  sbText: { fontSize: 11, fontWeight: '700' },
  typeBadge: { backgroundColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  typeText: { fontSize: 11, fontWeight: '600', color: COLORS.textMid },
  odds: { fontSize: 16, fontWeight: '800' },
  description: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  progressBar: { flex: 1, height: 6, borderRadius: 3, flexDirection: 'row', gap: 2, overflow: 'hidden' },
  progressSegment: { borderRadius: 3 },
  progressText: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
  stakeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stakeText: { fontSize: 13, color: COLORS.textMid },
  payoutText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  legsContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  legDot: { width: 8, height: 8, borderRadius: 4 },
  legInfo: { flex: 1 },
  legSelection: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  legStat: { fontSize: 12, color: COLORS.textMid, marginTop: 2 },
  legStatus: { fontSize: 16, fontWeight: '800' },
  expandHint: { fontSize: 12, color: COLORS.textDim, textAlign: 'center', marginTop: SPACING.sm },
});
