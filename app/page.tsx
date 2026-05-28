"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type AuthMode = "token" | "credentials" | "azure";
type Action = "in" | "out";

type CheckResponse = {
  ok: boolean;
  message: string;
  token?: string;
};

type LoginAzureResponse = {
  ok: boolean;
  token?: string;
  error?: string;
};

const TOKEN_KEY = "fis.token";
const AZURE_KEY = "fis.azureRefresh";

const MODES: { id: AuthMode; label: string }[] = [
  { id: "token", label: "Token" },
  { id: "credentials", label: "Tài khoản" },
];

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<AuthMode>("token");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [azureRefresh, setAzureRefresh] = useState("");
  const [loading, setLoading] = useState<Action | null>(null);
  const [azureLoading, setAzureLoading] = useState(false);
  const [status, setStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const busy = loading !== null || azureLoading;

  useEffect(() => {
    const saved = globalThis.localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
    const savedAzure = globalThis.localStorage.getItem(AZURE_KEY);
    if (savedAzure) setAzureRefresh(savedAzure);
  }, []);

  const persistToken = useCallback((next: string) => {
    setToken(next);
    if (next) globalThis.localStorage.setItem(TOKEN_KEY, next);
    else globalThis.localStorage.removeItem(TOKEN_KEY);
  }, []);

  const persistAzureRefresh = useCallback((next: string) => {
    setAzureRefresh(next);
    if (next) globalThis.localStorage.setItem(AZURE_KEY, next);
    else globalThis.localStorage.removeItem(AZURE_KEY);
  }, []);

  const handleAzureLogin = useCallback(async () => {
    setStatus(null);
    if (!azureRefresh.trim()) {
      setStatus({ kind: "error", text: "Dán Azure refresh token." });
      return;
    }

    setAzureLoading(true);
    try {
      const res = await fetch("/api/login-azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: azureRefresh.trim() }),
      });
      const data = (await res.json()) as LoginAzureResponse;

      if (data.ok && data.token) {
        persistToken(data.token);
        persistAzureRefresh(azureRefresh.trim());
        setStatus({ kind: "success", text: "Đã lấy access token." });
      } else {
        setStatus({
          kind: "error",
          text: data.error || "Không lấy được token.",
        });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "Lỗi mạng",
      });
    } finally {
      setAzureLoading(false);
    }
  }, [azureRefresh, persistToken, persistAzureRefresh]);

  const handleCheck = useCallback(
    async (action: Action) => {
      setStatus(null);
      const payload: Record<string, string> = { action };

      if (mode === "credentials") {
        if (!username.trim() || !password) {
          setStatus({ kind: "error", text: "Nhập username và password." });
          return;
        }
        payload.username = username.trim();
        payload.password = password;
      } else {
        if (!token.trim()) {
          setStatus({
            kind: "error",
            text:
              mode === "azure"
                ? "Lấy access token trước."
                : "Nhập bearer token.",
          });
          return;
        }
        payload.token = token.trim();
      }

      setLoading(action);
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as CheckResponse;

        if (data.token && data.token !== token) persistToken(data.token);

        setStatus({
          kind: data.ok ? "success" : "error",
          text: data.message || (data.ok ? "OK" : "Lỗi"),
        });
      } catch (err) {
        setStatus({
          kind: "error",
          text: err instanceof Error ? err.message : "Lỗi mạng",
        });
      } finally {
        setLoading(null);
      }
    },
    [mode, token, username, password, persistToken],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6 sm:py-8">
        <h1 className="text-lg font-medium tracking-tight">Check-in</h1>

        <nav
          className="mt-6 flex border-b border-neutral-100"
          role="tablist"
          aria-label="Cách đăng nhập"
        >
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              className={`tab ${mode === id ? "tab-active" : ""}`}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-6 flex-1 space-y-5">
          {mode === "token" && (
            <Field id="token" label="Bearer token">
              <textarea
                id="token"
                className="field-mono min-h-[7rem] resize-y"
                placeholder="eyJhbGciOi…"
                value={token}
                onChange={(e) => persistToken(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
          )}

          {mode === "credentials" && (
            <>
              <Field id="username" label="Username">
                <input
                  id="username"
                  className="field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  enterKeyHint="next"
                />
              </Field>
              <Field id="password" label="Password">
                <input
                  id="password"
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  enterKeyHint="done"
                />
              </Field>
            </>
          )}

          {mode === "azure" && (
            <>
              <Field id="azure-refresh" label="Refresh token">
                <textarea
                  id="azure-refresh"
                  className="field-mono min-h-[7rem] resize-y"
                  placeholder="1.AXIACp…"
                  value={azureRefresh}
                  onChange={(e) => persistAzureRefresh(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </Field>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleAzureLogin}
                disabled={busy}
              >
                {azureLoading ? "Đang lấy…" : "Lấy access token"}
              </button>
            </>
          )}
        </div>

        {status && (
          <output
            className={`mt-4 block text-sm leading-relaxed ${
              status.kind === "success" ? "text-neutral-500" : "text-red-600"
            }`}
          >
            {status.text}
          </output>
        )}

        {token && (
          <footer className="mt-4 flex items-center justify-between gap-3 text-xs text-neutral-400">
            <span className="min-w-0 truncate font-mono">
              {token.slice(0, 20)}…
            </span>
            <button
              type="button"
              className="min-h-11 shrink-0 px-2 text-neutral-600 active:text-neutral-950"
              onClick={() => {
                persistToken("");
                setStatus(null);
              }}
            >
              Xoá token
            </button>
          </footer>
        )}
      </main>

      <div className="sticky bottom-0 border-t border-neutral-100 bg-white/90 px-4 pt-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:px-6 sm:pb-8 sm:pt-0 sm:backdrop-blur-none">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleCheck("in")}
            disabled={busy}
          >
            {loading === "in" ? "Đang vào…" : "Check-in"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleCheck("out")}
            disabled={busy}
          >
            {loading === "out" ? "Đang ra…" : "Check-out"}
          </button>
        </div>
      </div>
    </div>
  );
}
