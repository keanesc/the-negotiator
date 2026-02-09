const API_KEY_STORAGE_KEY = "gemini_api_key";

/**
 * Get the stored API key from localStorage
 */
export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Store the API key in localStorage
 */
export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

/**
 * Remove the API key from localStorage
 */
export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Check if an API key exists (either in localStorage or server-side)
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

/**
 * Validate an API key by making a test request to the validation endpoint
 */
export async function validateApiKey(
  key: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch("/api/validate-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey: key }),
    });

    const data = await response.json();

    if (response.ok) {
      return { valid: true };
    } else {
      return { valid: false, error: data.error || "Invalid API key" };
    }
  } catch {
    return {
      valid: false,
      error: "Failed to validate API key. Please check your connection.",
    };
  }
}

/**
 * Check if a server-side API key is configured
 */
export async function hasServerApiKey(): Promise<boolean> {
  try {
    const response = await fetch("/api/validate-key", {
      method: "GET",
    });
    const data = await response.json();
    return data.hasServerKey === true;
  } catch {
    return false;
  }
}
