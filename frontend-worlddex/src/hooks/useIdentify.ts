import { useCallback, useRef, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IdentifyRequest, IdentifyResponse, Tier1Result, Tier2Result } from "../../../shared/types/identify";
import { API_URL } from "../config";
import EventSource from "react-native-sse";

// Configuration constants
const TIMEOUTS = {
  INITIAL_POST: 4000,      // 4s for initial identify request
  SSE_CONNECTION: 2000,    // 2s to establish SSE connection
  SSE_COMPLETE: 10000,     // 10s for SSE to complete (5s processing + buffer)
  POLL_REQUEST: 3000,      // 3s per poll request
  TOTAL_OPERATION: 15000,  // 15s absolute maximum
} as const;

const POLL_INTERVAL = 1000; // 1s between polls (more responsive)

// Custom error class for timeout tracking
class TimeoutError extends Error {
  constructor(operation: string, timeout: number) {
    super(`${operation} timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

// Helper to create AbortController with timeout
const createAbortController = (timeoutMs: number, operation: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new TimeoutError(operation, timeoutMs));
  }, timeoutMs);
  
  return {
    controller,
    cleanup: () => clearTimeout(timeoutId)
  };
};

// SSE monitoring with promise interface
const monitorSSE = (url: string, signal: AbortSignal): Promise<Tier2Result> => {
  return new Promise((resolve, reject) => {
    let es: EventSource | null = null;
    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    let messageTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const cleanup = () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (messageTimeout) clearTimeout(messageTimeout);
      if (es) {
        try {
          es.close();
        } catch (e) {
          console.error("Error closing EventSource:", e);
        }
      }
    };

    // Handle abort signal
    if (signal.aborted) {
      reject(new Error("Operation aborted"));
      return;
    }
    
    const abortHandler = () => {
      cleanup();
      reject(new Error("Operation aborted"));
    };
    signal.addEventListener('abort', abortHandler);

    try {
      es = new EventSource(url);
      
      // Timeout for connection establishment
      connectionTimeout = setTimeout(() => {
        cleanup();
        reject(new TimeoutError("SSE connection", TIMEOUTS.SSE_CONNECTION));
      }, TIMEOUTS.SSE_CONNECTION);

      es.addEventListener('open', () => {
        console.log("📡 SSE connection established");
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        // Start timeout for receiving completion message
        messageTimeout = setTimeout(() => {
          cleanup();
          reject(new TimeoutError("SSE completion", TIMEOUTS.SSE_COMPLETE));
        }, TIMEOUTS.SSE_COMPLETE);
      });

      es.addEventListener('error', (error: Event) => {
        console.error("📡 SSE error:", error);
        cleanup();
        reject(new Error("SSE connection failed"));
      });

      es.addEventListener('message', (event: MessageEvent) => {
        console.log("📡 SSE message:", event.data);
        
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.event === "completed" && parsed.data) {
            console.log("✅ SSE completed successfully");
            cleanup();
            signal.removeEventListener('abort', abortHandler);
            resolve(parsed.data as Tier2Result);
          } else if (parsed.event === "failed") {
            cleanup();
            signal.removeEventListener('abort', abortHandler);
            reject(new Error(parsed.error || "Tier-2 identification failed"));
          } else if (parsed.event === "heartbeat") {
            console.log("💓 SSE heartbeat received");
            // Reset the message timeout on heartbeat
            if (messageTimeout) {
              clearTimeout(messageTimeout);
              messageTimeout = setTimeout(() => {
                cleanup();
                reject(new TimeoutError("SSE completion", TIMEOUTS.SSE_COMPLETE));
              }, TIMEOUTS.SSE_COMPLETE);
            }
          }
        } catch (parseError) {
          console.error("Failed to parse SSE message:", parseError);
          // Don't reject on parse error - wait for valid message
        }
      });
      
    } catch (error) {
      cleanup();
      signal.removeEventListener('abort', abortHandler);
      reject(error);
    }
  });
};

export const useIdentify = () => {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const totalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (totalTimeoutRef.current) {
      clearTimeout(totalTimeoutRef.current);
      totalTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Step 1: Initial identify mutation
  const identifyMutation = useMutation<IdentifyResponse, Error, IdentifyRequest>({
    mutationFn: async (payload) => {
      const { controller, cleanup } = createAbortController(TIMEOUTS.INITIAL_POST, "Initial identify");
      
      try {
        const response = await fetch(`${API_URL}/identify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`Identify failed: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
      } finally {
        cleanup();
      }
    },
    onSuccess: (data) => {
      console.log("✅ Initial identify success:", {
        status: data.status,
        hasJobId: !!data.jobId,
        hasTier2: !!data.tier2
      });
      
      // If we need to monitor a job, set the jobId
      if (data.status === "pending" && data.jobId) {
        setJobId(data.jobId);

        if (totalTimeoutRef.current) {
          clearTimeout(totalTimeoutRef.current);
        }
        totalTimeoutRef.current = setTimeout(() => {
          console.error("⏱️ Total operation timeout");
          cleanup();
          if (identifyMutation.isPending) {
            identifyMutation.reset();
          }
          setJobId(null);
        }, TIMEOUTS.TOTAL_OPERATION);
      }
    },
    onError: (error) => {
      console.error("❌ Initial identify error:", error);
      cleanup();
    }
  });

  // Step 2: Monitor job (SSE with polling fallback)
  const { data: jobResult, error: jobError } = useQuery<Tier2Result>({
    queryKey: ['identify-job', jobId],
    queryFn: async ({ signal }) => {
      if (!jobId) throw new Error("No job ID");
      
      // Try SSE first
      try {
        console.log("🚀 Attempting SSE monitoring for job:", jobId);
        const sseUrl = `${API_URL}/identify/stream/${jobId}`;
        const result = await monitorSSE(sseUrl, signal);
        return result;
      } catch (sseError) {
        console.warn("⚠️ SSE failed, falling back to polling:", sseError);
        
        // Fall back to polling
        const startTime = Date.now();
        while (Date.now() - startTime < TIMEOUTS.SSE_COMPLETE) {
          if (signal.aborted) throw new Error("Operation aborted");
          
          const { controller, cleanup: pollCleanup } = createAbortController(
            TIMEOUTS.POLL_REQUEST, 
            "Poll request"
          );
          
          try {
            const response = await fetch(`${API_URL}/identify/job/${jobId}`, {
              signal: controller.signal
            });
            
            if (!response.ok && response.status !== 404) {
              throw new Error(`Poll failed: ${response.status}`);
            }
            
            if (response.ok) {
              const result = await response.json();
              
              if (result.status === "completed" && result.data) {
                console.log("✅ Polling completed successfully");
                return result.data as Tier2Result;
              } else if (result.status === "failed") {
                throw new Error(result.error || "Job failed");
              }
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            
          } finally {
            pollCleanup();
          }
        }
        
        throw new TimeoutError("Job polling", TIMEOUTS.SSE_COMPLETE);
      }
    },
    enabled: !!jobId,
    retry: false, // We handle retries internally
    staleTime: Infinity, // Job results don't go stale
  });

  // Main identify function
  const identify = useCallback(async (payload: IdentifyRequest) => {
    // Reset everything
    cleanup();
    setJobId(null);
    queryClient.removeQueries({ queryKey: ['identify-job'] });
    
    // Create new abort controller for total timeout
    abortControllerRef.current = new AbortController();
    
    // Set total operation timeout
    totalTimeoutRef.current = setTimeout(() => {
      console.error("⏱️ Total operation timeout");
      cleanup();
      if (identifyMutation.isPending) {
        identifyMutation.reset();
      }
      setJobId(null);
    }, TIMEOUTS.TOTAL_OPERATION);
    
    // Start the identification
    identifyMutation.mutate(payload);
  }, [identifyMutation, queryClient, cleanup]);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Reset function
  const reset = useCallback(() => {
    // ① stop timers & abort network
    cleanup();
  
    // ② clear React-Query state synchronously
    identifyMutation.reset();              // sets .data, .error, .status back to idle
    queryClient.removeQueries({ queryKey: ['identify-job'] });
  
    // ③ clear local derived state
    setJobId(null);
  }, [identifyMutation, queryClient, cleanup]);

  useEffect(() => {
    // finished if:
    //  1. initial mutation succeeded AND
    //     a) no jobId was returned   OR
    //     b) jobQuery has data (tier-2) or error
    const initialDone   = identifyMutation.isSuccess;
    const noJobNeeded   = initialDone && !jobId;
    const jobSettled    = !!jobResult || !!jobError;

    if ((noJobNeeded || jobSettled) && totalTimeoutRef.current) {
      console.log("✅ Identify finished – clearing TOTAL_OPERATION timer");
      cleanup();                     // <-- clears the timer & abort controller
    }
  }, [identifyMutation.isSuccess, jobId, jobResult, jobError, cleanup]);


  // Compute final state
  const tier1 = identifyMutation.data?.tier1 ?? null;
  const tier2 = identifyMutation.data?.tier2 ?? jobResult ?? null;
  const isLoading = identifyMutation.isPending || (!!jobId && !jobResult && !jobError);
  const error = identifyMutation.error || jobError || null;

  return { 
    identify, 
    tier1, 
    tier2, 
    isLoading, 
    error, 
    reset 
  };
};