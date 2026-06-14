import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getClientIp } from "./contact-client-ip.ts";

const ORIGINAL_TRUST = process.env.TRUST_PROXY_HEADERS;
const ORIGINAL_VERCEL = process.env.VERCEL;

describe("getClientIp", () => {
  afterEach(() => {
    if (ORIGINAL_TRUST === undefined) {
      delete process.env.TRUST_PROXY_HEADERS;
    } else {
      process.env.TRUST_PROXY_HEADERS = ORIGINAL_TRUST;
    }
    if (ORIGINAL_VERCEL === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = ORIGINAL_VERCEL;
    }
  });

  it("reads x-forwarded-for only when proxy headers are trusted", () => {
    process.env.TRUST_PROXY_HEADERS = "true";
    const request = new Request("http://localhost/api/contact", {
      headers: { "x-forwarded-for": "203.0.113.44, 10.0.0.1" },
    });
    assert.equal(getClientIp(request), "203.0.113.44");
  });

  it("trusts Vercel forwarding headers when VERCEL=1", () => {
    delete process.env.TRUST_PROXY_HEADERS;
    process.env.VERCEL = "1";
    const request = new Request("http://localhost/api/contact", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.55",
        "x-forwarded-for": "203.0.113.44",
      },
    });
    assert.equal(getClientIp(request), "203.0.113.55");
  });

  it("ignores spoofed forwarding headers when proxy trust is disabled", () => {
    delete process.env.TRUST_PROXY_HEADERS;
    delete process.env.VERCEL;
    const request = new Request("http://localhost/api/contact", {
      headers: {
        "x-forwarded-for": "203.0.113.44",
        "user-agent": "test-agent",
        "accept-language": "en-US",
      },
    });
    assert.match(getClientIp(request), /^fp:[0-9a-f]{16}$/);
  });
});
