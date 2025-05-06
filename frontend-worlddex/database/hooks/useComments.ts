import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase-client";
import { CaptureComment } from "../types";

/* --------------------------------------------------------
   A) Paginated comments for a SINGLE capture or listing
   -------------------------------------------------------- */
const fetchComments = async (
  targetId: string,
  targetType: "capture" | "listing",
  { limit = 20, page = 1 }: { limit?: number; page?: number } = {}
): Promise<{ comments: CaptureComment[]; count: number }> => {
  const offset = (page - 1) * limit;
  const targetField = targetType === "capture" ? "capture_id" : "listing_id";

  const { data, error, count } = await supabase
    .from("comments")
    .select("*", { count: "exact" })
    .eq(targetField, targetId)
    .order("created_at", { ascending: false }) // newest first
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching comments:", error);
    return { comments: [], count: 0 };
  }

  return { comments: data || [], count: count || 0 };
};

/* --------------------------------------------------------
   B) "Preview" comments for MANY captures/listings (feed page)
      – gets the first N comments per target in ONE query
   -------------------------------------------------------- */
export const fetchPreviewComments = async (
  targetIds: string[],
  targetType: "capture" | "listing",
  limitPerTarget = 3
): Promise<Record<string, CaptureComment[]>> => {
  if (!targetIds.length) return {};

  const targetField = targetType === "capture" ? "capture_id" : "listing_id";

  // Call an RPC so Postgres does LIMIT per partition.
  // (Supabase can't LIMIT nested selects yet.)
  const { data, error } = await supabase.rpc("get_preview_comments", {
    _target_ids: targetIds,
    _target_field: targetField,
    _limit: limitPerTarget,
  });

  if (error) {
    console.error("Error fetching preview comments:", error);
    return {};
  }

  /* data comes back as:
     [{ target_id: '...', id: '...', comment_text: ... }, ...]
     We reshape it into { [target_id]: Comment[] }
  */
  return (data as CaptureComment[]).reduce<Record<string, CaptureComment[]>>(
    (acc, c) => {
      const targetId = targetType === "capture" ? c.capture_id : c.listing_id;
      if (targetId) {
        (acc[targetId] ||= []).push(c);
      }
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
  listing_id,
  comment_text,
}: Pick<
  CaptureComment,
  "capture_id" | "listing_id" | "comment_text"
>): Promise<CaptureComment | null> => {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      capture_id,
      listing_id,
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
export const useComments = (
  targetId: string | null,
  targetType: "capture" | "listing",
  { limit = 20, initialPage = 1 }: { limit?: number; initialPage?: number } = {}
) => {
  const [comments, setComments] = useState<CaptureComment[]>([]);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (p = page) => {
      if (!targetId) return;
      setLoading(true);
      try {
        const { comments, count } = await fetchComments(targetId, targetType, {
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
    [targetId, targetType, limit, page]
  );

  useEffect(() => {
    load(initialPage);
  }, [targetId, targetType]);

  const addComment = async (
    commentText: string
  ): Promise<CaptureComment | null> => {
    if (!targetId) return null;
    try {
      const newComment = await createComment({
        capture_id: targetType === "capture" ? targetId : undefined,
        listing_id: targetType === "listing" ? targetId : undefined,
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
