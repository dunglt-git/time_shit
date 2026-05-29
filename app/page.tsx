"use client";

import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getStoredToken, setStoredToken } from "@/lib/auth";

type Action = "in" | "out";

type CheckResponse = {
  ok: boolean;
  message: string;
  token?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState<Action | null>(null);
  const [status, setStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const busy = loading !== null;

  useEffect(() => {
    setToken(getStoredToken());
    setReady(true);
  }, []);

  const persistToken = useCallback((next: string) => {
    setToken(next);
    setStoredToken(next);
  }, []);

  const handleCheck = useCallback(
    async (action: Action) => {
      setStatus(null);

      if (!token.trim()) {
        setStatus({ kind: "error", text: "No token. Please sign in first." });
        return;
      }

      setLoading(action);
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, token: token.trim() }),
        });
        const data = (await res.json()) as CheckResponse;

        if (data.token && data.token !== token) persistToken(data.token);

        setStatus({
          kind: data.ok ? "success" : "error",
          text: data.message || (data.ok ? "Success" : "Failed"),
        });
      } catch (err) {
        setStatus({
          kind: "error",
          text: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setLoading(null);
      }
    },
    [token, persistToken],
  );

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6 sm:py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Time shit</h1>
          <p className="text-sm text-muted-foreground">
            FIS check-in on your phone.
          </p>
        </div>

        {!token ? (
          <Card>
            <CardHeader className="items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <KeyRound className="size-5 text-muted-foreground" />
              </div>
              <CardTitle className="pt-2">Not signed in</CardTitle>
              <CardDescription>
                Sign in to get a token before check-in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <Badge variant="success" className="w-fit">
                Token saved
              </Badge>
              <CardDescription className="pt-2 font-mono text-xs leading-relaxed break-all">
                {token}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {status && (
          <Alert variant={status.kind === "success" ? "success" : "destructive"}>
            <AlertDescription>{status.text}</AlertDescription>
          </Alert>
        )}
      </main>

      <div className="sticky bottom-0 border-t bg-background/95 px-4 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:px-6 sm:pb-8 sm:pt-0 sm:shadow-none sm:backdrop-blur-none">
        <div className="mx-auto max-w-md space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="success"
              size="lg"
              onClick={() => handleCheck("in")}
              disabled={busy || !token}
            >
              {loading === "in" ? (
                <Loader2 className="animate-spin" />
              ) : null}
              {loading === "in" ? "Checking in…" : "Check-in"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleCheck("out")}
              disabled={busy || !token}
            >
              {loading === "out" ? (
                <Loader2 className="animate-spin" />
              ) : null}
              {loading === "out" ? "Checking out…" : "Check-out"}
            </Button>
          </div>

          {token && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" disabled={busy}>
                      Change token
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Change token?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will go to sign in and get a new token. Your
                        current token will be replaced after a successful sign
                        in.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => router.push("/login")}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive" disabled={busy}>
                      Remove token
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove token?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the token from your browser. You will need
                        to sign in again to check in.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          persistToken("");
                          setStatus(null);
                        }}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
