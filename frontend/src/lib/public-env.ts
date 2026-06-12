/**
 * Public env (NEXT_PUBLIC_*) for API origin.
 *
 * - **Vercel Services:** `NEXT_PUBLIC_BACKEND_URL` (auto-injected, e.g. `/_/backend`)
 * - **Static export / local:** `NEXT_PUBLIC_API_URL` or baked `NEXT_PUBLIC_BROWSER_API_BASE`
 */
export function getPublicApiUrl(): string {
  const backend = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BACKEND_URL : undefined;
  if (backend?.trim()) {
    return backend.trim().replace(/\/$/, "");
  }

  const baked =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BROWSER_API_BASE : undefined;
  if (baked !== undefined) {
    return String(baked).replace(/\/$/, "");
  }

  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;
  const u = (raw ?? "").trim();
  if (u) return u.replace(/\/$/, "");

  return "http://localhost:8000";
}
