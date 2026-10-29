import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Linking, Alert, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { timeAgo } from '@/lib/time';
import PickCard from './PickCard';

function batchStatusSummary(picks) {
  const statuses = picks.map(p => p.status);
  if (statuses.every(s => s === 'won')) return { label: 'All Won', color: COLORS.winning };
  if (statuses.every(s => s === 'lost')) return { label: 'All Lost', color: COLORS.losing };
  if (statuses.some(s => s === 'live')) return { label: 'Live', color: COLORS.live };
  if (statuses.every(s => s === 'pending')) return { label: 'Pending', color: COLORS.pending };
  const won = statuses.filter(s => s === 'won').length;
  const lost = statuses.filter(s => s === 'lost').length;
  if (won + lost > 0) return { label: `${won}W-${lost}L`, color: COLORS.brand };
  return { label: 'Pending', color: COLORS.pending };
}

export default function BatchCard({ batch, dropperName, currentUserId, onPressPick, onTailPick, onFadePick, onTailAll }) {
  const [expanded, setExpanded] = useState(false);
  const [linkQueue, setLinkQueue] = useState(null);
  const [tailingAll, setTailingAll] = useState(false);

  const { picks } = batch;
  const status = batchStatusSummary(picks);
  const allTailed = picks.every(p => (p.tails || []).some(t => t.user_id === currentUserId && t.action === 'tail'));

  const handleTailAll = async () => {
    if (tailingAll) return;
    setTailingAll(true);
    await onTailAll(batch);
    setTailingAll(false);

    const withLinks = picks.filter(p => p.share_url);
    if (withLinks.length === 0) {
      Alert.alert('🐾 Tailed all!', `Recorded your tail on all ${picks.length} picks.`);
      return;
    }

    // iOS can only bring one app to the foreground at a time, so we can't
    // reliably auto-chain openURL calls — only the first would actually
    // surface. Instead: open the first bet right away, then hand the rest to
    // the user as a tap-one-at-a-time list so they can place each and come
    // straight back for the next.
    Linking.openURL(withLinks[0].share_url).catch(() => {});
    setLinkQueue(withLinks.map((p, i) => ({ id: p.id, title: p.title, url: p.share_url, opened: i === 0 })));
  };

  const openQueueItem = (item) => {
    Linking.openURL(item.url).catch(() => {});
    setLinkQueue(prev => prev.map(x => (x.id === item.id ? { ...x, opened: true } : x)));
  };

  return (
    <View style={styles.card}>
      <View style={[styles.edge, { backgroundColor: allTailed ? COLORS.winning : 'transparent' }]} />
      <View style={styles.body}>
        <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
          <View style={styles.dropperRow}>
            <Image source={require('@/assets/logo.png')} style={styles.avatar} />
            <View>
              <Text style={styles.dropperName}>{dropperName || 'Gang member'}</Text>
              <Text style={styles.timestamp}>{timeAgo(batch.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.color + '20', borderColor: status.color }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
          <Text style={styles.title} numberOfLines={2}>{batch.title}</Text>
          <Text style={styles.summary}>{picks.length} pick{picks.length === 1 ? '' : 's'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tailAllBtn, allTailed && styles.tailAllBtnActive, tailingAll && { opacity: 0.6 }]}
          onPress={handleTailAll}
          disabled={tailingAll}
        >
          <Text style={styles.tailAllText}>{allTailed ? '✓ Tailed all' : `Tail all ${picks.length}`}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.expandHint}>{expanded ? '▾ Hide picks' : `▸ Tap to see ${picks.length} picks`}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.innerList}>
            {picks.map(pick => (
              <PickCard
                key={pick.id}
                pick={pick}
                dropperName={dropperName}
                currentUserId={currentUserId}
                onPress={() => onPressPick(pick.id)}
                onTail={() => onTailPick(pick.id)}
                onFade={() => onFadePick(pick.id)}
              />
            ))}
          </View>
        )}
      </View>

      <Modal visible={!!linkQueue} transparent animationType="fade" onRequestClose={() => setLinkQueue(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🐾 Tailed all {picks.length} picks!</Text>
            <Text style={styles.modalSubtitle}>Open each bet below to place it — come back here for the next one.</Text>
            {linkQueue?.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={styles.modalRow}
                onPress={() => openQueueItem(item)}
                disabled={item.opened}
              >
                <Text style={styles.modalRowText} numberOfLines={1}>
                  {item.opened ? '✓' : `${i + 1}.`} {item.title}
                </Text>
                {!item.opened && <Text style={styles.modalRowCta}>Open →</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setLinkQueue(null)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  dropperRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 32, height: 32, resizeMode: 'contain', borderRadius: RADIUS.full, backgroundColor: COLORS.bgInput },
  dropperName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  timestamp: { fontSize: 11, color: COLORS.textDim, marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  summary: { fontSize: 13, color: COLORS.textMid, marginBottom: SPACING.lg },
  tailAllBtn: { backgroundColor: COLORS.winning, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  tailAllBtnActive: { opacity: 0.85 },
  tailAllText: { fontSize: 14, fontWeight: '700', color: COLORS.bg },
  expandHint: { fontSize: 12, color: COLORS.textDim, textAlign: 'center', marginTop: SPACING.sm },
  innerList: { marginTop: SPACING.lg, paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.xl },
  modalCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  modalSubtitle: { fontSize: 13, color: COLORS.textMid, marginBottom: SPACING.lg },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm },
  modalRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  modalRowCta: { fontSize: 13, fontWeight: '700', color: COLORS.brand },
  modalDoneBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.brand, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  modalDoneText: { fontSize: 15, fontWeight: '700', color: COLORS.bg },
});
