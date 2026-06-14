import { NextResponse } from "next/server";
import { forwardContactToConvex } from "./contact-ingress";
import { getClientIp } from "./contact-client-ip";
import { isContactFormSubmittedTooFast } from "./contact-form-timing";
import { isHoneypotTripped } from "./contact-honeypot";
import {
  enforceContactRateLimit,
  peekContactRateLimitStatus,
  withContactRateCookie,
} from "./contact-rate-limit";
import {
  CONTACT_RATE_LIMIT_WINDOW_MS,
  saturateContactRateTimestamps,
} from "./contact-rate-limit-shared";
import { validateContactRequest } from "./contact-validation";

type IngressResult = Awaited<ReturnType<typeof forwardContactToConvex>>;

function wrapRateResponse(
  response: NextResponse,
  cookieTimestamps: number[] | null,
) {
  return withContactRateCookie(response, cookieTimestamps);
}

// branches for demo mode, success, and upstream Convex errors
// fallow-ignore-next-line complexity
function ingressResponse(
  ingress: IngressResult,
  cookieTimestamps: number[] | null,
) {
  if ("reason" in ingress && ingress.reason === "missing_config") {
    return wrapRateResponse(
      NextResponse.json({
        ok: true,
        demo: true,
        message: "Demo mode — Convex not configured.",
      }),
      cookieTimestamps,
    );
  }

  if (!("data" in ingress)) {
    return wrapRateResponse(
      NextResponse.json(
        { ok: false, error: "Could not send your message." },
        { status: 500 },
      ),
      cookieTimestamps,
    );
  }

  if (ingress.ok) {
    return wrapRateResponse(
      NextResponse.json({
        ok: true,
        message: "Message sent — we'll be in touch.",
      }),
      cookieTimestamps,
    );
  }

  const data = ingress.data;
  const body: Record<string, unknown> = {
    ok: false,
    error:
      typeof data?.error === "string"
        ? data.error
        : "Could not send your message.",
  };
  if (typeof data?.field === "string") body.field = data.field;
  let nextCookieTimestamps = cookieTimestamps;
  if (data?.rateLimited === true) {
    body.rateLimited = true;
    body.retryAfterSeconds = Math.ceil(CONTACT_RATE_LIMIT_WINDOW_MS / 1000);
    body.lockedUntil = Date.now() + CONTACT_RATE_LIMIT_WINDOW_MS;
    if (cookieTimestamps) {
      nextCookieTimestamps = saturateContactRateTimestamps(cookieTimestamps);
    }
  }

  const status = ingress.status || 500;
  const safeStatus =
    status >= 400 && status < 500 ? status : status >= 200 && status < 300 ? status : 500;

  return wrapRateResponse(
    NextResponse.json(body, { status: safeStatus }),
    nextCookieTimestamps,
  );
}

// rate limit, honeypot, validate, then Convex ingress
// fallow-ignore-next-line complexity
export async function GET(request: Request) {
  return peekContactRateLimitStatus(request);
}

// fallow-ignore-next-line complexity
export async function POST(request: Request) {
  const rate = enforceContactRateLimit(request);
  if (rate.blocked) {
    return wrapRateResponse(rate.blocked, rate.cookieTimestamps);
  }

  try {
    const formData = await request.formData();
    if (
      isContactFormSubmittedTooFast(formData) ||
      isHoneypotTripped(formData)
    ) {
      return wrapRateResponse(NextResponse.json({ ok: true }), rate.cookieTimestamps);
    }

    const validation = validateContactRequest(formData);
    if (validation instanceof NextResponse) {
      return wrapRateResponse(validation, rate.cookieTimestamps);
    }

    const ingress = await forwardContactToConvex({
      ...validation,
      ipHint: getClientIp(request),
    });

    return ingressResponse(ingress, rate.cookieTimestamps);
  } catch (err) {
    console.error("contact POST error:", err);
    return wrapRateResponse(
      NextResponse.json(
        { ok: false, error: "Could not send your message. Try again later." },
        { status: 500 },
      ),
      rate.cookieTimestamps,
    );
  }
}
