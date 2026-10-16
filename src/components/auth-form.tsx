"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ kind, next }: { kind: "login" | "register"; next: string }) {
  const [state, action, pending] = useActionState(kind === "login" ? login : register, undefined);
  const isLogin = kind === "login";
  return (
    <Card className="mx-auto mt-6 max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{isLogin ? "Sign in" : "Create account"}</CardTitle>
        <CardDescription>{isLogin ? "Welcome back." : "Track a watchlist, your collection and price alerts."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={8} required />
          </div>
          {state?.error && <p className="text-sm text-bad">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "…" : isLogin ? "Sign in" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "No account? " : "Already registered? "}
            <Link href={`/${isLogin ? "register" : "login"}?next=${encodeURIComponent(next)}`} className="underline">
              {isLogin ? "Create one" : "Sign in"}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
