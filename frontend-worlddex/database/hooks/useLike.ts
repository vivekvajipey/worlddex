import { useState, useEffect, useCallback } from 'react';
import { likeCapture, unlikeCapture, fetchLikedCaptureIds } from '../../src/api/likes';

export const useLike = (captureId: string | null) => {
  const [liked, setLiked] = useState(false);
  const [busy,  setBusy]  = useState(false);

  /* initial load */
  useEffect(() => {
    if (!captureId) return;
    fetchLikedCaptureIds([captureId])
      .then(set => setLiked(set.has(captureId)))
      .catch(console.error);
  }, [captureId]);

  /* toggle */
  const toggle = useCallback(async () => {
    if (!captureId || busy) return;
    setBusy(true);
    try {
      if (liked) await unlikeCapture(captureId);
      else       await likeCapture(captureId);
      setLiked(!liked);                 // optimistic
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [captureId, liked, busy]);

  return { liked, busy, toggle };
};
