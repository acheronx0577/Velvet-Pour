import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { stubFetch } from "../../test/stub-fetch.ts";
import { forwardContactToConvex, signIpHint } from "./contact-ingress.ts";

const ORIGINAL_SITE = process.env.CONVEX_SITE_URL;
const ORIGINAL_PUBLIC_SITE = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const ORIGINAL_SECRET = process.env.CONTACT_INGRESS_SECRET;

describe("forwardContactToConvex", () => {
  afterEach(() => {
    if (ORIGINAL_SITE === undefined) {
      delete process.env.CONVEX_SITE_URL;
    } else {
      process.env.CONVEX_SITE_URL = ORIGINAL_SITE;
    }
    if (ORIGINAL_PUBLIC_SITE === undefined) {
      delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL = ORIGINAL_PUBLIC_SITE;
    }
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CONTACT_INGRESS_SECRET;
    } else {
      process.env.CONTACT_INGRESS_SECRET = ORIGINAL_SECRET;
    }
  });

  it("returns missing_config for non-HTTPS Convex URLs", async () => {
    process.env.CONVEX_SITE_URL = "http://evil.example.com";
    process.env.CONTACT_INGRESS_SECRET = "test-secret";

    const result = await forwardContactToConvex({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
      ipHint: "203.0.113.44",
    });

    assert.equal("reason" in result && result.reason, "missing_config");
  });

  it("returns missing_config when Convex env is unset", async () => {
    delete process.env.CONVEX_SITE_URL;
    delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    delete process.env.CONTACT_INGRESS_SECRET;

    const result = await forwardContactToConvex({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
      ipHint: "203.0.113.44",
    });

    assert.equal("reason" in result && result.reason, "missing_config");
  });

  it("forwards payload with bearer auth", async () => {
    process.env.CONVEX_SITE_URL = "https://example.convex.site";
    process.env.CONTACT_INGRESS_SECRET = "test-secret";

    const { captured, restore } = stubFetch(
      new Response(JSON.stringify({ ok: true, id: "sub_1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await forwardContactToConvex({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
      ipHint: "203.0.113.44",
    });
    restore();

    assertBearerForward(captured, result, "test-secret");
  });

  it("allows local Convex HTTP action URLs during development", async () => {
    process.env.CONVEX_SITE_URL = "http://127.0.0.1:3211";
    process.env.CONTACT_INGRESS_SECRET = "test-secret";

    const { captured, restore } = stubFetch(
      new Response(JSON.stringify({ ok: true, id: "sub_1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await forwardContactToConvex({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
      ipHint: "203.0.113.44",
    });
    restore();

    assert.equal(captured.url, "http://127.0.0.1:3211/contact");
    assert.equal("ok" in (result as object) && (result as { ok: boolean }).ok, true);
  });

  it("remaps local Convex API port 3210 to HTTP site port 3211", async () => {
    process.env.CONVEX_SITE_URL = "http://127.0.0.1:3210";
    process.env.CONTACT_INGRESS_SECRET = "test-secret";

    const { captured, restore } = stubFetch(
      new Response(JSON.stringify({ ok: true, id: "sub_1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await forwardContactToConvex({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
      ipHint: "203.0.113.44",
    });
    restore();

    assert.equal(captured.url, "http://127.0.0.1:3211/contact");
  });
});

// fallow-ignore-next-line complexity
function assertBearerForward(
  captured: { url: string; init?: RequestInit },
  result: unknown,
  secret: string,
) {
  assert.equal(captured.url, "https://example.convex.site/contact");
  assert.equal(captured.init?.method, "POST");
  assert.equal(
    (captured.init?.headers as Record<string, string>).Authorization,
    `Bearer ${secret}`,
  );
  const body = JSON.parse(String(captured.init?.body));
  assert.equal(body.ipHint, "203.0.113.44");
  assert.equal(body.ipHintSignature, signIpHint("203.0.113.44", secret));
  assert.equal("ok" in (result as object) && (result as { ok: boolean }).ok, true);
}
