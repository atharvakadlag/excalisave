/**
 * Utility function to encode Unicode strings as base64
 * This handles characters outside the Latin1 range that btoa() can't handle
 */
export function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Derive a compact device identifier for headers and last-sync attribution.
 * This value is sent as X-Device-Name on authenticated git requests.
 */
export function getDeviceHeaderValue(): string {
  try {
    const ua =
      (typeof navigator !== "undefined" && (navigator as any).userAgent) ||
      "unknown";
    const lang =
      (typeof navigator !== "undefined" && navigator.language) || "en";
    const base = `${ua.split(" ")[0] || "client"} (${lang})`;
    return base.slice(0, 120);
  } catch {
    return "excalisave-client";
  }
}

/**
 * Create an authenticated fetch for git providers.
 * token is sent as Authorization: token <token>
 * Also sends X-Device-Name so that last-sync attribution can be based on the header value.
 */
export function createAuthedFetch(token: string, deviceName?: string) {
  const dev =
    deviceName && deviceName.trim()
      ? deviceName.trim().slice(0, 120)
      : getDeviceHeaderValue();
  return (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    headers.set("Authorization", `token ${token}`);
    // Add common accept for providers that use it
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    headers.set("X-Device-Name", dev);
    return fetch(url, { ...init, headers });
  };
}

/**
 * Return the URL-encoded repository path for a drawing file.
 * Drawing ids contain ":" (e.g. "drawing:uuid"), which must be percent-encoded
 * in the /repos/{owner}/{repo}/contents/{path} segment.
 */
export function repoFilePath(drawingId: string): string {
  return encodeURIComponent(`${drawingId}.json`);
}
