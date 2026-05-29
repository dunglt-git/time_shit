import { NextResponse } from "next/server";
import { login } from "@/lib/fis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { username?: unknown; password?: unknown };

type LoginData = {
  fullName?: string;
  username?: string;
  email?: string;
};

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

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "username and password are required" },
      { status: 400 },
    );
  }

  const result = await login(username, password);
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }

  const raw = result.raw as { message?: string; data?: LoginData } | undefined;
  const user = raw?.data;

  return NextResponse.json({
    ok: true,
    token: result.token,
    message: raw?.message || "Success",
    user: user
      ? {
          fullName: user.fullName,
          username: user.username,
          email: user.email,
        }
      : undefined,
  });
}
