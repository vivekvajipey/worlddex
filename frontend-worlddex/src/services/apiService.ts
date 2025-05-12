import { API_URL } from "../config";

export const checkServerStatus = async (): Promise<boolean> => {
  try {
    // Construct the health endpoint URL. 
    // If API_URL is "https://server.com/api", this will fetch "https://server.com/api/health"
    const healthEndpoint = `${API_URL}/health`;
    
    console.log(`Checking server health at: ${healthEndpoint}`);

    const response = await fetch(healthEndpoint, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache", // Ensure fresh check
        "Pragma": "no-cache", // HTTP/1.0 backwards compatibility
        "Expires": "0", // Proxies
      },
      // It's good to have a timeout for health checks.
      // AbortSignal.timeout requires Node 17.3.0+ or modern browsers.
      // Consider a manual timeout if compatibility is an issue.
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    if (response.ok) {
      // Optionally check the response body too, e.g. if it matches { status: "ok" }
      // const data = await response.json();
      // if (data.status === "ok") {
      //   console.log("Server health check successful and response verified.");
      //   return true;
      // }
      console.log("Server health check successful.");
      return true;
    } else {
      console.warn(`Server health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    // Log different error types if possible (e.g., network error vs. timeout)
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("Server health check timed out. This is an expected behavior if the server is unreachable or the connection is too slow.", error.message);
    } else {
      console.error("Error during server health check (e.g., network issue, server down):", error);
    }
    return false;
  }
}; 