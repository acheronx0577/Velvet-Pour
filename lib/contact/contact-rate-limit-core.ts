import { getClientIp } from "./contact-client-ip.ts";
import { readContactRateCookieTimestamps } from "./contact-rate-limit-cookie.ts";
import {
  CONTACT_RATE_LIMIT_MAX,
  contactRateRetryAfterMs,
  pruneContactRateTimestamps,
  saturateContactRateTimestamps,
} from "./contact-rate-limit-shared.ts";

const buckets = new Map<string, number[]>();

export type ContactRateLimitEvaluation =
  | { allowed: true; cookieTimestamps: number[] }
  | { allowed: false; retryAfterMs: number; cookieTimestamps: number[] };

function readContactRateLimitState(request: Request, now: number) {
  const ip = getClientIp(request);
  const cookieTimestamps = readContactRateCookieTimestamps(request, now);
  const ipTimestamps = pruneContactRateTimestamps(buckets.get(ip) ?? [], now);
  return { ip, cookieTimestamps, ipTimestamps };
}

function contactRateLimitRetryAfter(
  ipTimestamps: number[],
  cookieTimestamps: number[],
  now: number,
) {
  if (ipTimestamps.length >= CONTACT_RATE_LIMIT_MAX) {
    return contactRateRetryAfterMs(ipTimestamps, now);
  }

  if (cookieTimestamps.length >= CONTACT_RATE_LIMIT_MAX) {
    return contactRateRetryAfterMs(cookieTimestamps, now);
  }

  return null;
}

export function peekContactRateLimit(
  request: Request,
  now = Date.now(),
): { blocked: true; retryAfterMs: number } | { blocked: false } {
  const { ipTimestamps, cookieTimestamps } = readContactRateLimitState(
    request,
    now,
  );
  const retryAfterMs = contactRateLimitRetryAfter(
    ipTimestamps,
    cookieTimestamps,
    now,
  );

  if (retryAfterMs === null) return { blocked: false };
  return { blocked: true, retryAfterMs };
}

export function evaluateContactRateLimit(request: Request): ContactRateLimitEvaluation {
  const now = Date.now();
  const { ip, cookieTimestamps, ipTimestamps } = readContactRateLimitState(
    request,
    now,
  );
  const retryAfterMs = contactRateLimitRetryAfter(
    ipTimestamps,
    cookieTimestamps,
    now,
  );

  if (retryAfterMs !== null) {
    buckets.set(ip, ipTimestamps);
    return {
      allowed: false,
      retryAfterMs,
      cookieTimestamps: saturateContactRateTimestamps(
        [...cookieTimestamps, ...ipTimestamps],
        now,
      ),
    };
  }

  const nextTimestamps = [...cookieTimestamps, now];
  buckets.set(ip, [...ipTimestamps, now]);
  return { allowed: true, cookieTimestamps: nextTimestamps };
}

export function checkContactRateLimit(clientKey: string) {
  const now = Date.now();
  const recent = pruneContactRateTimestamps(buckets.get(clientKey) ?? [], now);

  if (recent.length >= CONTACT_RATE_LIMIT_MAX) {
    buckets.set(clientKey, recent);
    return { allowed: false as const };
  }

  recent.push(now);
  buckets.set(clientKey, recent);
  return { allowed: true as const };
}

/** Test-only reset — not used in production handler. */
export function resetContactRateLimitForTests() {
  buckets.clear();
}
