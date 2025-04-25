import { useCallback, useRef, useState } from "react";
import { IdentifyRequest, IdentifyResponse, Tier1Result, Tier2Result } from "../../../shared/types/identify";
import { API_URL } from "../config";

// pick whichever EventSource impl you installed ⬇️
import EventSource from "react-native-sse";         // <-- if you chose react-native-sse
// import { EventSourcePolyfill as EventSource } from "event-source-polyfill";

// EventSource type augmentation to allow string event types
declare module "react-native-sse" {
  interface EventSource {
    addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  }
}

export const useIdentify = () => {
  const [tier1, setTier1]     = useState<Tier1Result  | null>(null);
  const [tier2, setTier2]     = useState<Tier2Result  | null>(null);
  const [isLoading, setLoad]  = useState(false);
  const [error, setError]     = useState<Error | null>(null);

  const esRef = useRef<EventSource | null>(null);

  /** call Tier-1; transparently stream Tier-2 if needed */
  const identify = useCallback( async (payload: IdentifyRequest) => {
    setError(null); setTier1(null); setTier2(null); setLoad(true);

    try {
      const res  = await fetch(`${API_URL}/identify`, {
        method : "POST",
        headers: { "Content-Type":"application/json" },
        body   : JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Identify failed – ${res.statusText}`);
      const body = await res.json() as IdentifyResponse;

      setTier1(body.tier1);

      // ── already done ───────────────────────────────
      if (body.status === "done") {
        setTier2(body.tier2 ?? null);
        setLoad(false);
        return;
      }

      // ── still running – open SSE stream ────────────
      const url = `${API_URL}/identify/stream/${body.jobId}`;
      const es  = new EventSource(url);
      esRef.current = es;

      // @ts-ignore - Custom event types
      es.addEventListener("completed", (evt: MessageEvent) => {
        const { data } = JSON.parse(evt.data);   // server packs {event,data}
        setTier2(data as Tier2Result);
        es.close(); setLoad(false);
      });

      // @ts-ignore - Custom event types
      es.addEventListener("failed", () => {
        setError(new Error("Tier-2 identification failed"));
        es.close(); setLoad(false);
      });

    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setLoad(false);
    }
  }, []);

  const reset = () => {
    esRef.current?.close();
    setTier1(null); setTier2(null); setError(null); setLoad(false);
  };

  return { identify, tier1, tier2, isLoading: isLoading, error, reset };
};
