import { NextResponse } from "next/server";
import { check, login, type CheckAction } from "@/lib/fis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  action?: unknown;
  token?: unknown;
  username?: unknown;
  password?: unknown;
};

const isAction = (v: unknown): v is CheckAction => v === "in" || v === "out";

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isAction(body.action)) {
    return NextResponse.json(
      { ok: false, message: "action must be 'in' or 'out'" },
      { status: 400 }
    );
  }

  let token =
    typeof body.token === "string" && body.token.trim()
      ? body.token.trim()
      : "";

  // Allow logging in inline when only credentials are provided.
  if (!token) {
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "token or username/password is required" },
        { status: 400 }
      );
    }
    const loginRes = await login(username, password);
    if (!loginRes.ok) {
      return NextResponse.json(
        { ok: false, message: `Login failed: ${loginRes.error}` },
        { status: 401 }
      );
    }
    token = loginRes.token;
  }

  const result = await check(token, body.action);
  return NextResponse.json(
    { ...result, token },
    { status: result.ok ? 200 : 400 }
  );
}
