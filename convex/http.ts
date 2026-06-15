import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { isAuthorized } from "./lib/bearerAuth";
import { hashIp } from "./lib/ipHash";
import { verifySignedIpHint } from "./lib/ipHintAuth";
import { RATE_LIMIT_MESSAGE } from "./lib/rateLimit";
import { validateContactPayload } from "./lib/validation";

const http = httpRouter();

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readContactBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function submitContact(ctx: ActionCtx, body: Record<string, unknown>) {
  const parsed = validateContactPayload({
    name: body.name,
    email: body.email,
    message: body.message,
  });
  if (parsed.ok === false) {
    return jsonResponse(parsed, 400);
  }

  const ipHint = await verifySignedIpHint(body.ipHint, body.ipHintSignature);
  if (!ipHint) {
    return jsonResponse({ ok: false, error: "Invalid client identity." }, 400);
  }

  let ipHash: string;
  try {
    ipHash = await hashIp(ipHint);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid client identity.";
    const missingSalt = message.includes("RATE_LIMIT_SALT");
    return jsonResponse(
      {
        ok: false,
        error: missingSalt
          ? "Contact rate limiting is not configured on Convex."
          : "Invalid client identity.",
      },
      missingSalt ? 503 : 400,
    );
  }

  const rate = await ctx.runMutation(internal.contact.prepareIngress, { ipHash });
  if (rate.limited) {
    return jsonResponse(
      { ok: false, rateLimited: true, error: RATE_LIMIT_MESSAGE },
      429,
    );
  }

  const id = await ctx.runMutation(internal.contact.insertSubmission, {
    ...parsed.data,
    ipHash,
  });

  await ctx.scheduler.runAfter(0, internal.contact.sendContactEmail, {
    submissionId: id,
    ...parsed.data,
  });

  return jsonResponse({ ok: true, id }, 200);
}

http.route({
  path: "/contact",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!isAuthorized(request)) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await readContactBody(request);
    if (!body) {
      return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
    }

    return submitContact(ctx, body);
  }),
});

http.route({
  path: "/api/site-views/get",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const count = await ctx.runQuery(api.siteViews.get, {});
      return jsonResponse({ ok: true, count }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonResponse({ ok: false, error: message }, 400);
    }
  }),
});

http.route({
  path: "/api/site-views/increment",
  method: "POST",
  handler: httpAction(async (ctx) => {
    try {
      const count = await ctx.runMutation(api.siteViews.increment, {
        incrementBy: 1,
      });
      return jsonResponse({ ok: true, count }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonResponse({ ok: false, error: message }, 400);
    }
  }),
});

export default http;
