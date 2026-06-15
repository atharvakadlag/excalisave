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
 * Create an authenticated fetch for git providers.
 * token is sent as Authorization: token <token>
 */
export function createAuthedFetch(token: string) {
  return (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    headers.set("Authorization", `token ${token}`);
    // Add common accept for providers that use it
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
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
