import { supabase } from './supabase';

export async function recordTailAction(pickId, userId, action) {
  const { error } = await supabase
    .from('tails')
    .upsert({ pick_id: pickId, user_id: userId, action }, { onConflict: 'pick_id,user_id' });
  if (error) throw error;
}

// Same upsert as recordTailAction, but for every pick in a batch at once — one
// request instead of N, so "Tail all" lands as a single atomic write.
export async function recordTailActionForPicks(pickIds, userId, action) {
  if (!pickIds || pickIds.length === 0) return;
  const rows = pickIds.map(pickId => ({ pick_id: pickId, user_id: userId, action }));
  const { error } = await supabase
    .from('tails')
    .upsert(rows, { onConflict: 'pick_id,user_id' });
  if (error) throw error;
}

// Collapses a flat, newest-first picks array into feed items: standalone
// picks (batch_id null) stay as single items, and picks sharing a batch_id
// collapse into one batch item positioned where that batch_id first appears.
export function groupPicksIntoFeedItems(picks) {
  const items = [];
  const batchIndex = new Map();

  for (const pick of picks) {
    if (!pick.batch_id) {
      items.push({ type: 'pick', key: `pick-${pick.id}`, pick });
      continue;
    }
    if (batchIndex.has(pick.batch_id)) {
      items[batchIndex.get(pick.batch_id)].picks.push(pick);
    } else {
      batchIndex.set(pick.batch_id, items.length);
      items.push({
        type: 'batch',
        key: `batch-${pick.batch_id}`,
        batchId: pick.batch_id,
        title: pick.batches?.title,
        createdAt: pick.batches?.created_at || pick.created_at,
        dropperId: pick.dropper_id,
        picks: [pick],
      });
    }
  }
  return items;
}
