import { supabase } from './supabase';

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

// One row per gang the user belongs to, with the gang's own fields flattened in
// and `my_display_name` carrying this user's per-gang handle (gang_members.display_name
// is denormalized per membership since there's no shared public profile table).
export async function fetchMyGangs(userId) {
  const { data, error } = await supabase
    .from('gang_members')
    .select('gang_id, display_name, gangs(id, name, invite_code, created_by)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || [])
    .filter(row => row.gangs)
    .map(row => ({
      id: row.gangs.id,
      name: row.gangs.name,
      invite_code: row.gangs.invite_code,
      created_by: row.gangs.created_by,
      my_display_name: row.display_name,
    }));
}

export async function fetchGangMembersMap(gangIds) {
  if (!gangIds || gangIds.length === 0) return {};
  const { data, error } = await supabase
    .from('gang_members')
    .select('user_id, display_name')
    .in('gang_id', gangIds);
  if (error) throw error;
  const map = {};
  (data || []).forEach(m => { map[m.user_id] = m.display_name; });
  return map;
}

export async function fetchGangMembers(gangId) {
  const { data, error } = await supabase
    .from('gang_members')
    .select('user_id, display_name, joined_at')
    .eq('gang_id', gangId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createGang(userId, name, displayName) {
  const invite_code = randomInviteCode();
  const { data: gang, error } = await supabase
    .from('gangs')
    .insert({ name, invite_code, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  const { error: memberError } = await supabase
    .from('gang_members')
    .insert({ gang_id: gang.id, user_id: userId, display_name: displayName });
  if (memberError) throw memberError;
  return gang;
}

export async function joinGangByCode(userId, code, displayName) {
  const { data: gang, error } = await supabase
    .from('gangs')
    .select('id, name, invite_code')
    .ilike('invite_code', code.trim())
    .maybeSingle();
  if (error) throw error;
  if (!gang) throw new Error('No gang found with that invite code.');
  const { error: memberError } = await supabase
    .from('gang_members')
    .insert({ gang_id: gang.id, user_id: userId, display_name: displayName });
  if (memberError) throw memberError;
  return gang;
}

export async function leaveGang(userId, gangId) {
  const { error } = await supabase
    .from('gang_members')
    .delete()
    .eq('gang_id', gangId)
    .eq('user_id', userId);
  if (error) throw error;
}
