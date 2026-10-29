import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, SPORTSBOOK_COLORS, SPORTSBOOK_NAMES, PICK_STATUS_COLORS, PICK_STATUS_LABELS } from '@/lib/theme';
import { timeAgo } from '@/lib/time';

export default function PickCard({ pick, dropperName, currentUserId, onPress, onTail, onFade }) {
  const tails = pick.tails || [];
  const tailCount = tails.filter(t => t.action === 'tail').length;
  const fadeCount = tails.filter(t => t.action === 'fade').length;
  const myAction = tails.find(t => t.user_id === currentUserId)?.action;

  const sbColor = SPORTSBOOK_COLORS[pick.sportsbook] || COLORS.textMid;
  const statusColor = PICK_STATUS_COLORS[pick.status] || COLORS.pending;
  const edgeColor = myAction === 'tail' ? COLORS.winning : myAction === 'fade' ? COLORS.losing : 'transparent';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.edge, { backgroundColor: edgeColor }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.dropperRow}>
            <Image source={require('@/assets/logo.png')} style={styles.avatar} />
            <View>
              <Text style={styles.dropperName}>{dropperName || 'Gang member'}</Text>
              <Text style={styles.timestamp}>{timeAgo(pick.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{PICK_STATUS_LABELS[pick.status] || pick.status}</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{pick.title}</Text>

        <View style={styles.badgeRow}>
          {pick.sportsbook ? (
            <View style={[styles.sbBadge, { backgroundColor: sbColor + '20' }]}>
              <Text style={[styles.sbText, { color: sbColor }]}>{SPORTSBOOK_NAMES[pick.sportsbook] || pick.sportsbook}</Text>
            </View>
          ) : null}
          {pick.odds ? <Text style={styles.odds}>{pick.odds}</Text> : null}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.tailBtn, myAction === 'tail' && styles.tailBtnActive]}
            onPress={onTail}
          >
            <Text style={[styles.tailText, myAction === 'tail' && styles.actionTextActive]}>Tail · {tailCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.fadeBtn, myAction === 'fade' && styles.fadeBtnActive]}
            onPress={onFade}
          >
            <Text style={[styles.fadeText, myAction === 'fade' && styles.actionTextActive]}>Fade · {fadeCount}</Text>
          </TouchableOpacity>
        </View>
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
  edge: { width: 4 },
  body: { flex: 1, padding: SPACING.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  dropperRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 32, height: 32, resizeMode: 'contain', borderRadius: RADIUS.full, backgroundColor: COLORS.bgInput },
  dropperName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  timestamp: { fontSize: 11, color: COLORS.textDim, marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  sbBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  sbText: { fontSize: 11, fontWeight: '700' },
  odds: { fontSize: 13, fontWeight: '700', color: COLORS.textMid },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1.5 },
  tailBtn: { borderColor: COLORS.winning, backgroundColor: COLORS.winningBg },
  tailBtnActive: { backgroundColor: COLORS.winning },
  fadeBtn: { borderColor: COLORS.losing, backgroundColor: COLORS.losingBg },
  fadeBtnActive: { backgroundColor: COLORS.losing },
  tailText: { fontSize: 13, fontWeight: '700', color: COLORS.winning },
  fadeText: { fontSize: 13, fontWeight: '700', color: COLORS.losing },
  actionTextActive: { color: COLORS.bg },
});
