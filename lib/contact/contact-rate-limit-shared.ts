export const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** Block on the 4th submit attempt (3 sends allowed per window). */
export const CONTACT_RATE_LIMIT_MAX = 3;

export const CONTACT_RATE_LIMIT_MESSAGE =
  "Too many messages — please wait before trying again.";

export function pruneContactRateTimestamps(timestamps: number[], now: number) {
  return timestamps.filter(
    (timestamp) => now - timestamp < CONTACT_RATE_LIMIT_WINDOW_MS,
  );
}

export function contactRateRetryAfterMs(
  timestamps: number[],
  now = Date.now(),
): number {
  const active = pruneContactRateTimestamps(timestamps, now);
  if (!active.length) return CONTACT_RATE_LIMIT_WINDOW_MS;
  return Math.max(
    0,
    Math.min(...active) + CONTACT_RATE_LIMIT_WINDOW_MS - now,
  );
}

/** Fill the sliding window so Next.js blocks match Convex-side limits. */
export function saturateContactRateTimestamps(
  timestamps: number[],
  now = Date.now(),
) {
  const active = pruneContactRateTimestamps(timestamps, now);
  if (active.length >= CONTACT_RATE_LIMIT_MAX) return active;

  const padded = [...active];
  while (padded.length < CONTACT_RATE_LIMIT_MAX) {
    padded.push(now);
  }
  return padded;
}
