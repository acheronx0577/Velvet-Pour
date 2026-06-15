import { NextResponse } from "next/server";

import { buildSystemStatsPayload } from "@/lib/system-stats/system-stats";

export async function GET() {
  try {
    const payload = await buildSystemStatsPayload();
    return NextResponse.json(
      { ok: true, ...payload },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
