import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "preview-engine",
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    builtAt: process.env.VERCEL_BUILD_TIMESTAMP ?? new Date().toISOString(),
  });
}
