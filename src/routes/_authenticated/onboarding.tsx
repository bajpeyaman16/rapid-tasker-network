import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Briefcase, HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: z.object({ role: z.enum(["customer", "worker"]).optional() }),
  component: Onboarding,
});

function Onboarding() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [role, setRole] = useState<"customer" | "worker" | null>(search.role ?? null);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Skip if already has role
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (roles && roles.length > 0) navigate({ to: "/dashboard" });
    })();
  }, [navigate]);

  async function submit() {
    if (!role) return toast.error("Choose a role to continue");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      await supabase.from("profiles").upsert({ id: u.user.id, phone, city, full_name: u.user.user_metadata?.full_name });
      const { error: rerr } = await supabase.from("user_roles").insert({ user_id: u.user.id, role });
      if (rerr && !rerr.message.includes("duplicate")) throw rerr;

      if (role === "worker") {
        await supabase.from("worker_profiles").upsert({ id: u.user.id, city, availability: "available" });
      }
      toast.success("You're all set");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-x flex-1 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-ink">Welcome to Local Work Network</h1>
          <p className="mt-2 text-muted-foreground">Tell us how you'll use the platform.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <RoleCard active={role === "customer"} onClick={() => setRole("customer")} icon={Briefcase} title="I need a worker" desc="Post jobs and hire verified pros nearby." />
            <RoleCard active={role === "worker"} onClick={() => setRole("worker")} icon={HardHat} title="I want to work" desc="Get matched to jobs near you and earn." />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="city" className="mb-1.5 block text-xs font-medium text-muted-foreground">City / Area</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
            </div>
            <div>
              <Label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
            </div>
          </div>

          <Button onClick={submit} disabled={loading} size="lg" className="mt-8 w-full sm:w-auto">
            {loading ? "Saving…" : "Continue"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function RoleCard({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: any; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-5 text-left transition-all ${active ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40"}`}>
      <Icon className={`h-7 w-7 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <h3 className="mt-3 font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}
