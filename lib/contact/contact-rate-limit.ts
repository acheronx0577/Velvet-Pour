import { NextResponse } from "next/server";
import { buildContactRateCookieHeader } from "./contact-rate-limit-cookie.ts";
import {
  evaluateContactRateLimit,
  peekContactRateLimit,
} from "./contact-rate-limit-core.ts";
import { CONTACT_RATE_LIMIT_MESSAGE } from "./contact-rate-limit-shared.ts";

export type ContactRateLimitResult = {
  blocked: NextResponse | null;
  cookieTimestamps: number[] | null;
};

function buildRateLimitedBody(retryAfterMs: number) {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  return {
    ok: false as const,
    rateLimited: true as const,
    error: CONTACT_RATE_LIMIT_MESSAGE,
    retryAfterSeconds,
    lockedUntil: Date.now() + retryAfterMs,
  };
}

export function peekContactRateLimitStatus(request: Request) {
  const peek = peekContactRateLimit(request);
  if (peek.blocked === false) {
    return NextResponse.json({ ok: true, rateLimited: false });
  }

  return NextResponse.json(buildRateLimitedBody(peek.retryAfterMs));
}

export function enforceContactRateLimit(request: Request): ContactRateLimitResult {
  const evaluation = evaluateContactRateLimit(request);
  if (evaluation.allowed === false) {
    return {
      blocked: NextResponse.json(
        buildRateLimitedBody(evaluation.retryAfterMs),
        { status: 429 },
      ),
      cookieTimestamps: evaluation.cookieTimestamps,
    };
  }

  return { blocked: null, cookieTimestamps: evaluation.cookieTimestamps };
}

export function withContactRateCookie(
  response: NextResponse,
  cookieTimestamps: number[] | null,
) {
  if (!cookieTimestamps) return response;
  response.headers.append(
    "Set-Cookie",
    buildContactRateCookieHeader(cookieTimestamps),
  );
  return response;
}
