import { supabase } from './supabase';

// Creates the batch row, then inserts every pick in it with that batch_id set.
// `picks` is an array of { title, odds, sportsbook, shareUrl }.
export async function createBatchWithPicks(gangId, dropperId, title, picks) {
  const { data: batch, error } = await supabase
    .from('batches')
    .insert({ gang_id: gangId, dropper_id: dropperId, title })
    .select()
    .single();
  if (error) throw error;

  const rows = picks.map(p => ({
    gang_id: gangId,
    dropper_id: dropperId,
    batch_id: batch.id,
    title: p.title,
    odds: p.odds || null,
    sportsbook: p.sportsbook,
    share_url: p.shareUrl || null,
    status: 'pending',
  }));

  const { error: picksError } = await supabase.from('picks').insert(rows);
  if (picksError) throw picksError;

  return batch;
}
