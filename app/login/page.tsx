"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { setStoredToken } from "@/lib/auth";

type LoginResponse = {
  ok: boolean;
  token?: string;
  message?: string;
  error?: string;
  user?: { fullName?: string; username?: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const finishLogin = useCallback(
    (token: string) => {
      setStoredToken(token);
      router.replace("/");
    },
    [router],
  );

  const handleCredentialsLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus(null);

      if (!username.trim() || !password) {
        setStatus({ kind: "error", text: "Enter username and password." });
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        });
        const data = (await res.json()) as LoginResponse;

        if (data.ok && data.token) {
          finishLogin(data.token);
        } else {
          setStatus({
            kind: "error",
            text: data.error || data.message || "Sign in failed",
          });
        }
      } catch (err) {
        setStatus({
          kind: "error",
          text: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setLoading(false);
      }
    },
    [username, password, finishLogin],
  );

  const handleTokenSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setStatus(null);

      if (!tokenInput.trim()) {
        setStatus({ kind: "error", text: "Paste a bearer token." });
        return;
      }

      finishLogin(tokenInput.trim());
    },
    [tokenInput, finishLogin],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8 sm:px-6 sm:py-8">
        <Button variant="ghost" size="sm" className="-ml-3 w-fit" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with FIS or paste an existing token.
          </p>
        </div>

        <Tabs defaultValue="credentials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credentials">Account</TabsTrigger>
            <TabsTrigger value="token">Paste token</TabsTrigger>
          </TabsList>

          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">FIS account</CardTitle>
                <CardDescription>
                  Username and password from the FIS app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCredentialsLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : null}
                    {loading ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="token">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bearer token</CardTitle>
                <CardDescription>
                  Paste a token you already have.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleTokenSave}>
                  <div className="space-y-2">
                    <Label htmlFor="token">Token</Label>
                    <Textarea
                      id="token"
                      placeholder="eyJhbGciOi…"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    Save token
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {status && (
          <Alert variant="destructive">
            <AlertDescription>{status.text}</AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
