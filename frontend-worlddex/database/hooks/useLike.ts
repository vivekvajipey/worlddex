import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase-client";
import { CaptureLike } from "../types";

/* ---------- like / unlike ---------------------------------------------- */
const likeCapture = async (captureId: string) => {
  // user_id comes from RLS, so we only need capture_id
  const { error } = await supabase.from("likes").upsert(
    {
      capture_id: captureId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    },
    { onConflict: "capture_id,user_id" }
  );
  if (error) throw error;
};

const unlikeCapture = async (captureId: string) => {
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("capture_id", captureId)
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id);
  if (error) throw error;
};

/* ---------- fetch "which of these captures did I like?" ----------------- */
const fetchLikedCaptureIds = async (
  captureIds: string[]
): Promise<Set<string>> => {
  if (!captureIds.length) return new Set();

  const { data, error } = await supabase
    .from("likes")
    .select("capture_id")
    .in("capture_id", captureIds)
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id); // RLS limits rows to *my* likes

  if (error) {
    console.error(error);
    return new Set();
  }

  return new Set(
    (data as Pick<CaptureLike, "capture_id">[]).map((r) => r.capture_id)
  );
};

// React hook
export const useLike = (captureId: string | null) => {
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  /* initial load */
  useEffect(() => {
    if (!captureId) return;
    fetchLikedCaptureIds([captureId])
      .then((set) => setLiked(set.has(captureId)))
      .catch(console.error);
  }, [captureId]);

  /* toggle */
  const toggle = useCallback(async () => {
    if (!captureId || busy) return;
    setBusy(true);
    try {
      if (liked) await unlikeCapture(captureId);
      else await likeCapture(captureId);
      setLiked(!liked); // optimistic
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [captureId, liked, busy]);

  return { liked, busy, toggle };
};
