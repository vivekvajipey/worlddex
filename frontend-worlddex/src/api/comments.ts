import { supabase } from '../../database/supabase-client';
import { CaptureComment } from '../../database/types';

/* --------------------------------------------------------
   A) Paginated comments for a SINGLE capture
   -------------------------------------------------------- */
export const fetchCaptureComments = async (
  captureId: string,
  { limit = 20, page = 1 }: { limit?: number; page?: number } = {}
): Promise<{ comments: Comment[]; count: number }> => {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('comments')
    .select('*', { count: 'exact' })
    .eq('capture_id', captureId)
    .order('created_at', { ascending: false })   // newest first
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching comments:', error);
    return { comments: [], count: 0 };
  }

  return { comments: data || [], count: count || 0 };
};

/* --------------------------------------------------------
   B) "Preview" comments for MANY captures (feed page)
      – gets the first N comments per capture in ONE query
   -------------------------------------------------------- */
export const fetchPreviewComments = async (
  captureIds: string[],
  limitPerCapture = 3
): Promise<Record<string, CaptureComment[]>> => {
  if (!captureIds.length) return {};

  // Call an RPC so Postgres does LIMIT per partition.
  // (Supabase can't LIMIT nested selects yet.)
  const { data, error } = await supabase
    .rpc('get_preview_comments', {
      _capture_ids: captureIds,
      _limit: limitPerCapture,
    });

  if (error) {
    console.error('Error fetching preview comments:', error);
    return {};
  }

  /* data comes back as:
     [{ capture_id: '...', id: '...', comment_text: ... }, ...]
     We reshape it into { [capture_id]: Comment[] }
  */
  return (data as CaptureComment[]).reduce<Record<string, CaptureComment[]>>(
    (acc, c) => {
      (acc[c.capture_id] ||= []).push(c);
      return acc;
    },
    {}
  );
};

/* --------------------------------------------------------
   C) CRUD
   -------------------------------------------------------- */
export const createComment = async ({
  capture_id,
  comment_text,
}: Pick<CaptureComment, 'capture_id' | 'comment_text'>): Promise<CaptureComment | null> => {
  const { data, error } = await supabase
    .from('comments')
    .insert({ capture_id, comment_text, user_id: (await supabase.auth.getUser()).data.user?.id })
    .select()
    .single();
  if (error) {
    console.error('Error creating comment:', error);
    return null;
  }
  return data;
};

export const updateComment = async (
  id: string,
  updates: Partial<Pick<CaptureComment, 'comment_text'>>
): Promise<CaptureComment | null> => {
  const { data, error } = await supabase
    .from('comments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating comment:', error);
    return null;
  }
  return data;
};

export const deleteComment = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
  return true;
};
