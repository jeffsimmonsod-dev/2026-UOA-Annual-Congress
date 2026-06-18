import conferenceConfig from "@/conference.config";

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers();
  const existing = options.headers;
  if (existing) {
    if (existing instanceof Headers) {
      existing.forEach((val, key) => headers.set(key, val));
    } else if (Array.isArray(existing)) {
      for (const [key, val] of existing) {
        headers.set(key, val);
      }
    } else {
      for (const [key, val] of Object.entries(existing as Record<string, string>)) {
        headers.set(key, val);
      }
    }
  }
  headers.set("X-Conference-Id", String(conferenceConfig.conferenceId));
  return fetch(url, { ...options, headers });
}
