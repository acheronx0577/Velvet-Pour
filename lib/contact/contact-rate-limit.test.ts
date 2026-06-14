import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  buildContactRateCookieHeader,
  CONTACT_RATE_COOKIE_NAME,
} from "./contact-rate-limit-cookie.ts";
import {
  checkContactRateLimit,
  evaluateContactRateLimit,
  peekContactRateLimit,
  resetContactRateLimitForTests,
} from "./contact-rate-limit-core.ts";
import { useContactRateLimitTestSecret } from "./contact-rate-limit-test-env.ts";

function requestWithCookie(value: string) {
  return new Request("http://localhost/api/contact", {
    headers: {
      cookie: `${CONTACT_RATE_COOKIE_NAME}=${encodeURIComponent(value)}`,
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

describe("checkContactRateLimit", () => {
  it("allows three submissions per client key within the window", () => {
    resetContactRateLimitForTests();
    const key = "test-ip";

    for (let i = 0; i < 3; i += 1) {
      assert.equal(checkContactRateLimit(key).allowed, true);
    }
    assert.equal(checkContactRateLimit(key).allowed, false);
  });

  it("tracks client keys independently", () => {
    resetContactRateLimitForTests();

    assert.equal(checkContactRateLimit("ip-a").allowed, true);
    assert.equal(checkContactRateLimit("ip-b").allowed, true);
    assert.equal(checkContactRateLimit("ip-a").allowed, true);
    assert.equal(checkContactRateLimit("ip-b").allowed, true);
  });
});

describe("evaluateContactRateLimit", () => {
  let restoreSecret: (() => void) | undefined;

  beforeEach(() => {
    process.env.TRUST_PROXY_HEADERS = "true";
    restoreSecret = useContactRateLimitTestSecret();
  });

  afterEach(() => {
    restoreSecret?.();
    resetContactRateLimitForTests();
  });

  it("blocks a fourth submit when the signed cookie already has three hits", () => {
    const now = Date.now();
    const header = buildContactRateCookieHeader([
      now - 3000,
      now - 2000,
      now - 1000,
    ]);
    const value = decodeURIComponent(header.split("=")[1]?.split(";")[0] ?? "");
    const result = evaluateContactRateLimit(requestWithCookie(value));

    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.ok(result.retryAfterMs > 0);
      assert.equal(result.cookieTimestamps.length, 3);
    }
  });
});

describe("peekContactRateLimit", () => {
  let restoreSecret: (() => void) | undefined;

  beforeEach(() => {
    process.env.TRUST_PROXY_HEADERS = "true";
    restoreSecret = useContactRateLimitTestSecret();
  });

  afterEach(() => {
    restoreSecret?.();
    resetContactRateLimitForTests();
  });

  it("reports blocked without mutating cookie counters", () => {
    const now = Date.now();
    const header = buildContactRateCookieHeader([
      now - 3000,
      now - 2000,
      now - 1000,
    ]);
    const value = decodeURIComponent(header.split("=")[1]?.split(";")[0] ?? "");
    const request = requestWithCookie(value);

    const peek = peekContactRateLimit(request);
    assert.equal(peek.blocked, true);
    if (peek.blocked) {
      assert.ok(peek.retryAfterMs > 0);
    }

    const evaluation = evaluateContactRateLimit(request);
    assert.equal(evaluation.allowed, false);
  });

  it("allows requests with fewer than three cookie hits", () => {
    const now = Date.now();
    const header = buildContactRateCookieHeader([now - 1000]);
    const value = decodeURIComponent(header.split("=")[1]?.split(";")[0] ?? "");

    assert.deepEqual(peekContactRateLimit(requestWithCookie(value)), {
      blocked: false,
    });
  });
});
