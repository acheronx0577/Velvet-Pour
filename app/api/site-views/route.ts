import { NextResponse } from "next/server";

import {
  bumpSiteViewCount,
  readSiteViewCount,
} from "@/lib/site-views/site-views-ingress";

function siteViewsErrorResponse(result: {
  ok: false;
  reason: "missing_config" | "upstream";
  error?: string;
}) {
  const status = result.reason === "missing_config" ? 503 : 502;
  return NextResponse.json(
    { ok: false, error: result.error ?? result.reason },
    { status },
  );
}

export async function GET() {
  const result = await readSiteViewCount();
  if (result.ok === false) {
    return siteViewsErrorResponse(result);
  }

  return NextResponse.json({ ok: true, count: result.count });
}

export async function POST() {
  const result = await bumpSiteViewCount();
  if (result.ok === false) {
    return siteViewsErrorResponse(result);
  }

  return NextResponse.json({ ok: true, count: result.count });
}
