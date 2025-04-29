import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase-client";
import { CaptureComment } from "../types";

/* --------------------------------------------------------
   A) Paginated comments for a SINGLE capture
   -------------------------------------------------------- */
const fetchCaptureComments = async (
  captureId: string,
  { limit = 20, page = 1 }: { limit?: number; page?: number } = {}
): Promise<{ comments: CaptureComment[]; count: number }> => {
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("comments")
    .select("*", { count: "exact" })
    .eq("capture_id", captureId)
    .order("created_at", { ascending: false }) // newest first
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching comments:", error);
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
  const { data, error } = await supabase.rpc("get_preview_comments", {
    _capture_ids: captureIds,
    _limit: limitPerCapture,
  });

  if (error) {
    console.error("Error fetching preview comments:", error);
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
}: Pick<
  CaptureComment,
  "capture_id" | "comment_text"
>): Promise<CaptureComment | null> => {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      capture_id,
      comment_text,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();
  if (error) {
    console.error("Error creating comment:", error);
    return null;
  }
  return data;
};

const updateComment = async (
  id: string,
  updates: Partial<Pick<CaptureComment, "comment_text">>
): Promise<CaptureComment | null> => {
  const { data, error } = await supabase
    .from("comments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Error updating comment:", error);
    return null;
  }
  return data;
};

const deleteComment = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) {
    console.error("Error deleting comment:", error);
    return false;
  }
  return true;
};

// React hook
export const useCaptureComments = (
  captureId: string | null,
  { limit = 20, initialPage = 1 }: { limit?: number; initialPage?: number } = {}
) => {
  const [comments, setComments] = useState<CaptureComment[]>([]);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (p = page) => {
      if (!captureId) return;
      setLoading(true);
      try {
        const { comments, count } = await fetchCaptureComments(captureId, {
          limit,
          page: p,
        });
        setComments(comments);
        setTotal(count);
        setPage(p);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    },
    [captureId, limit, page]
  );

  useEffect(() => {
    load(initialPage);
  }, [captureId]);

  const addComment = async (
    commentText: string
  ): Promise<CaptureComment | null> => {
    if (!captureId) return null;
    try {
      const newComment = await createComment({
        capture_id: captureId,
        comment_text: commentText,
      });
      if (newComment) {
        setComments((prev) => [newComment, ...prev]);
        setTotal((prev) => prev + 1);
      }
      return newComment;
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error("Unknown error adding comment")
      );
      return null;
    }
  };

  const editComment = async (
    id: string,
    commentText: string
  ): Promise<CaptureComment | null> => {
    try {
      const updatedComment = await updateComment(id, {
        comment_text: commentText,
      });
      if (updatedComment) {
        setComments((prev) =>
          prev.map((c) => (c.id === id ? updatedComment : c))
        );
      }
      return updatedComment;
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error("Unknown error updating comment")
      );
      return null;
    }
  };

  const removeComment = async (id: string): Promise<boolean> => {
    try {
      const success = await deleteComment(id);
      if (success) {
        setComments((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);
      }
      return success;
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error("Unknown error deleting comment")
      );
      return false;
    }
  };

  return {
    comments,
    loading,
    error,
    page,
    pageCount: Math.ceil(total / limit),
    fetchPage: load,
    refresh: () => load(1),
    addComment,
    editComment,
    removeComment,
  };
};
