import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["customer", "worker"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Sign in or create an account — Local Work Network" },
    { name: "description", content: "Sign in or create your Local Work Network account to find local work or hire nearby professionals." },
    { property: "og:title", content: "Sign in or create an account — Local Work Network" },
    { property: "og:description", content: "Sign in or create your Local Work Network account to find local work or hire nearby professionals." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email for a confirmation link. After confirming, sign in to finish setting up your account.");
          return;
        }
        toast.success("Account created. Let's set it up.");
        navigate({ to: "/onboarding", search: { role: search.role ?? "customer" } });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const message = err instanceof TypeError && /fetch/i.test(err.message)
        ? "We couldn't reach sign-in right now. Check your connection and try again."
        : err instanceof Error ? err.message : "Sign-in didn't work. Please try again.";
      setNotice(message);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    setNotice(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof TypeError && /fetch/i.test(err.message)
        ? "We couldn't reach sign-in right now. Check your connection and try again."
        : err instanceof Error ? err.message : "Google sign-in didn't work. Please try again.";
      setNotice(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center">
            <span className="brand-gradient mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white">
              <MapPin className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "Join Local Work Network in seconds" : "Sign in to continue"}
            </p>
          </div>

          <div className="mt-7 rounded-lg border border-border bg-card p-6 shadow-sm">
            <Button onClick={google} variant="outline" className="w-full" disabled={loading}>
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 11v3.2h5.4c-.2 1.4-1.7 4-5.4 4-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.7 3.6 14.6 2.7 12 2.7 6.8 2.7 2.7 6.9 2.7 12s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.6H12z"/></svg>
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <Field id="name" label="Full name" icon={User}>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                </Field>
              )}
              <Field id="email" label="Email" icon={Mail}>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </Field>
              <Field id="password" label="Password" icon={Lock}>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
            {notice && <p role="alert" className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">{notice}</p>}
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setNotice(null); }} className="font-semibold text-primary hover:underline">
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-ink">← Back home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </Label>
      {children}
    </div>
  );
}
