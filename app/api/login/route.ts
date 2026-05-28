import { NextResponse } from "next/server";
import { login } from "@/lib/fis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { username?: unknown; password?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "username and password are required" },
      { status: 400 }
    );
  }

  const result = await login(username, password);
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
