import { supabase, Tables } from '../../database/supabase-client';
import { CaptureLike } from '../../database/types';

/* ---------- like / unlike ---------------------------------------------- */
export const likeCapture = async (captureId: string) => {
  // user_id comes from RLS, so we only need capture_id
  const { error } = await supabase
    .from('likes')
    .upsert({ capture_id: captureId, user_id: (await supabase.auth.getUser()).data.user?.id }, { onConflict: 'capture_id,user_id' });
  if (error) throw error;
};

export const unlikeCapture = async (captureId: string) => {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('capture_id', captureId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
  if (error) throw error;
};

/* ---------- fetch "which of these captures did I like?" ----------------- */
export const fetchLikedCaptureIds = async (
  captureIds: string[]
): Promise<Set<string>> => {
  if (!captureIds.length) return new Set();

  const { data, error } = await supabase
    .from('likes')
    .select('capture_id')
    .in('capture_id', captureIds)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id);        // RLS limits rows to *my* likes

  if (error) {
    console.error(error);
    return new Set();
  }

  return new Set((data as Pick<CaptureLike, 'capture_id'>[]).map(r => r.capture_id));
};
