// Per-browser stable user identifier. Persisted in localStorage so preferences
// accumulate across sessions on the same device. Real auth replaces this with
// the authenticated principal — the rest of the memory plumbing doesn't care
// where the id comes from.

const STORAGE_KEY = "cma_user_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getUserId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const fresh = uuid();
  window.localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

export function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
