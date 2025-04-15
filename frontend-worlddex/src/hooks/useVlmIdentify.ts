import { useState } from "react";
import { VlmIdentificationRequest, VlmIdentificationResponse } from "../../../shared/types/vlm";
import { API_URL } from "../config";

interface UseVlmIdentifyReturn {
  identifyPhoto: (payload: VlmIdentificationRequest) => Promise<VlmIdentificationResponse>;
  isLoading: boolean;
  error: Error | null;
  result: VlmIdentificationResponse | null;
  reset: () => void;
}

interface ErrorResponse {
  error: string;
}

/**
 * Hook for using the VLM identification service
 */
export const useVlmIdentify = (): UseVlmIdentifyReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<VlmIdentificationResponse | null>(null);

  const reset = () => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  };

  const identifyPhoto = async (payload: VlmIdentificationRequest): Promise<VlmIdentificationResponse> => {
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const endpoint = `${API_URL}/vlm/identify`;
      
      // Log request details for debugging
      console.log("VLM Request URL:", endpoint);
      console.log("VLM Request Payload Size:", payload.base64Data?.length || 0, "characters");
      console.log("Content Type:", payload.contentType);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Failed to identify image";
        try {
          const errorData = await response.json() as ErrorResponse;
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Try to get the raw text if JSON parsing fails
          const rawText = await response.text().catch(() => "Could not read error response");
          errorMessage = `${response.status}: ${response.statusText}. Details: ${rawText}`;
          console.error("Failed to parse error response body:", parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json() as VlmIdentificationResponse;
      setResult(data);
      return data;

    } catch (err) {
      const error = err instanceof Error ? err : new Error("An unknown identification error occurred");
      setError(error);
      
      console.error("useVlmIdentify Error:", error);
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("API URL being used:", API_URL);
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    identifyPhoto,
    isLoading,
    error,
    result,
    reset,
  };
};