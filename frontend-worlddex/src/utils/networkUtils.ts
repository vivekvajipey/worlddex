import { API_URL } from '../config';

/**
 * Check if the server is reachable by hitting the health endpoint
 * @param timeout - Timeout in milliseconds (default: 3000)
 * @returns Promise<boolean> - true if server is reachable, false otherwise
 */
export const checkServerConnection = async (timeout: number = 3000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // Network error, timeout, or other fetch error
    return false;
  }
};

/**
 * Check if the device has basic internet connectivity
 * Note: This only checks if the device is connected to a network,
 * not if the internet is actually accessible
 */
export const isDeviceOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Comprehensive network check that verifies both device connectivity
 * and actual server reachability
 */
export const hasNetworkConnection = async (): Promise<boolean> => {
  // First check if device reports being online
  if (!isDeviceOnline()) {
    return false;
  }
  
  // Then check if we can actually reach the server
  return await checkServerConnection();
};