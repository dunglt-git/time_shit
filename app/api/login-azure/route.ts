import { NextResponse } from "next/server";
import { loginAzure } from "@/lib/fis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { refreshToken?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!refreshToken) {
    return NextResponse.json(
      { ok: false, error: "refreshToken is required" },
      { status: 400 },
    );
  }

  const result = await loginAzure(refreshToken);
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
