import { useCallback, useRef, useState, useEffect } from "react";
import { IdentifyRequest, IdentifyResponse, Tier1Result, Tier2Result } from "../../../shared/types/identify";
import { API_URL } from "../config";

import EventSource from "react-native-sse";

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
  // Add a ref for tracking fallback polling
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failedSSERef = useRef<boolean>(false);

  // Add a polling fallback function
  const pollForResults = useCallback(async (jobId: string, retryCount = 0) => {
    try {
      console.log(`⚠️ [FALLBACK] Polling for results of job ${jobId}, attempt ${retryCount + 1}`);
      
      // Create a custom endpoint that returns the current job state
      const response = await fetch(`${API_URL}/identify/job/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to poll job status: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`⚠️ [FALLBACK] Poll result:`, result);
      
      if (result.status === "completed" && result.data) {
        console.log(`⚠️ [FALLBACK] Job completed, setting tier2 data:`, result.data);
        setTier2(result.data as Tier2Result);
        setLoad(false);
        return;
      } else if (result.status === "failed") {
        console.log(`⚠️ [FALLBACK] Job failed`);
        setError(new Error("Tier-2 identification failed"));
        setLoad(false);
        return;
      }
      
      // If still pending and we haven't exceeded max retries, schedule another poll
      if (retryCount < 20) {
        pollTimerRef.current = setTimeout(() => {
          pollForResults(jobId, retryCount + 1);
        }, 2000); // Poll every 2 seconds
      } else {
        console.log(`⚠️ [FALLBACK] Max polling attempts reached`);
        setError(new Error("Timed out waiting for identification results"));
        setLoad(false);
      }
    } catch (err) {
      console.error(`⚠️ [FALLBACK] Error polling:`, err);
      setError(err instanceof Error ? err : new Error("Error checking identification status"));
      setLoad(false);
    }
  }, [API_URL]);
  
  // Cleanup function for both SSE and polling
  const cleanup = useCallback(() => {
    if (esRef.current) {
      console.log("⚠️ Cleaning up SSE connection");
      esRef.current.close();
      esRef.current = null;
    }
    
    if (pollTimerRef.current) {
      console.log("⚠️ Cleaning up polling timer");
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

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

      console.log("==== IDENTIFY API RESPONSE ====");
      console.log("Status:", body.status);
      console.log("Tier1:", JSON.stringify(body.tier1));
      console.log("JobId:", body.jobId);
      console.log("Tier2:", body.tier2 ? JSON.stringify(body.tier2) : "none");

      setTier1(body.tier1);

      // ── already done ───────────────────────────────
      if (body.status === "done") {
        setTier2(body.tier2 ?? null);
        setLoad(false);
        return;
      }

      // ── still running – open SSE stream ────────────
      const url = `${API_URL}/identify/stream/${body.jobId}`;
      console.log("⚠️ OPENING SSE CONNECTION TO:", url);

      // Add extensive debugging
      console.log("⚠️ EventSource implementation being used:", EventSource.name || "Unknown");
      console.log("⚠️ Current API_URL:", API_URL);

      // Wrap EventSource creation in try/catch
      try {
        const es = new EventSource(url);
        console.log("⚠️ EventSource instance created successfully");
        esRef.current = es;

        // Debugging handlers
        // @ts-ignore
        es.onopen = () => {
          console.log("⚠️ SSE CONNECTION OPENED");
        };

        // Add error handler with detailed logging
        // @ts-ignore
        es.onerror = (err: Event) => {
          console.error("⚠️ SSE ERROR:", err);
          console.error("⚠️ SSE ERROR TYPE:", err.type);
          console.error("⚠️ SSE ERROR TARGET:", err.target);
          
          // If we've already failed and started polling, don't do it again
          if (!failedSSERef.current && body.jobId) {
            console.log("⚠️ SSE connection failed, switching to polling fallback");
            failedSSERef.current = true;
            
            // Wait a bit before starting to poll to give SSE a chance to recover
            setTimeout(() => {
              if (esRef.current) {
                esRef.current.close();
                esRef.current = null;
              }
              
              pollForResults(body.jobId as string);
            }, 3000);
          }
        };

        // Handle all messages - the server sends data:... events, not typed events
        // @ts-ignore
        es.addEventListener('message', (evt: any) => {
          console.log("⚠️ SSE 'message' EVENT LISTENER triggered", evt.data);
          
          try {
            // Ensure we have event data as string
            if (typeof evt.data !== 'string') {
              console.error("⚠️ SSE message data is not a string:", evt.data);
              return;
            }
            
            const parsed = JSON.parse(evt.data);
            
            // Check what type of event it is
            if (parsed.event === "completed" && parsed.data) {
              console.log("⚠️ SSE COMPLETED event received, updating tier2 with:", JSON.stringify(parsed.data));
              
              // Type assertion to ensure Tier2Result type
              const tier2Data = parsed.data as Tier2Result;
              setTier2(tier2Data);
              console.log("⚠️ Updated tier2 state with:", JSON.stringify(tier2Data));
              
              // Close the connection after getting data
              es.close();
              setLoad(false);
            } else if (parsed.event === "failed") {
              console.log("⚠️ SSE FAILED event");
              setError(new Error("Tier-2 identification failed"));
              es.close();
              setLoad(false);
            }
          } catch (error) {
            console.error("⚠️ Error processing SSE message:", error);
          }
        });

      } catch (esError) {
        console.error("⚠️ ERROR CREATING EVENTSOURCE:", esError);
        setError(new Error("Failed to establish real-time connection"));
        setLoad(false);
      }

    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setLoad(false);
    }
  }, [API_URL, pollForResults]);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const reset = () => {
    cleanup();
    failedSSERef.current = false;
    setTier1(null); setTier2(null); setError(null); setLoad(false);
  };

  return { identify, tier1, tier2, isLoading: isLoading, error, reset };
};
