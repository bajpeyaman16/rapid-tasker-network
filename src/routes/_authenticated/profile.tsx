import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, ShieldCheck, Save, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"customer" | "worker" | "admin" | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).limit(1);
      const r = roles?.[0]?.role;
      if (r === "customer" || r === "worker" || r === "admin") setRole(r);
    })();
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["me-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: worker } = useQuery({
    queryKey: ["me-worker", userId],
    enabled: !!userId && role === "worker",
    queryFn: async () => {
      const { data } = await supabase.from("worker_profiles").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["me-reviews", userId],
    enabled: !!userId && role === "worker",
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").eq("worker_id", userId!).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const [pForm, setPForm] = useState({ full_name: "", phone: "", city: "" });
  const [wForm, setWForm] = useState({ headline: "", bio: "", hourly_rate: "", experience_years: "", skills: "", categories: [] as string[] });

  useEffect(() => {
    if (profile) setPForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", city: profile.city ?? "" });
  }, [profile]);
  useEffect(() => {
    if (worker) setWForm({
      headline: worker.headline ?? "",
      bio: worker.bio ?? "",
      hourly_rate: worker.hourly_rate?.toString() ?? "",
      experience_years: worker.experience_years?.toString() ?? "",
      skills: (worker.skills ?? []).join(", "),
      categories: worker.categories ?? [],
    });
  }, [worker]);

  async function saveProfile() {
    if (!userId) return;
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...pForm });
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["me-profile", userId] });
  }

  async function saveWorker() {
    if (!userId) return;
    const payload = {
      id: userId,
      headline: wForm.headline || null,
      bio: wForm.bio || null,
      hourly_rate: wForm.hourly_rate ? Number(wForm.hourly_rate) : null,
      experience_years: wForm.experience_years ? Number(wForm.experience_years) : 0,
      skills: wForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
      categories: wForm.categories,
    };
    const { error } = await supabase.from("worker_profiles").upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("Worker profile saved");
    qc.invalidateQueries({ queryKey: ["me-worker", userId] });
  }

  function toggleCat(name: string) {
    setWForm((f) => ({
      ...f,
      categories: f.categories.includes(name) ? f.categories.filter((c) => c !== name) : [...f.categories, name],
    }));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your public information{role === "worker" ? " and worker details" : ""}.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary font-display text-lg font-bold">
            {(pForm.full_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink">{pForm.full_name || "Your name"}</h2>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> {role ?? "—"}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={pForm.full_name} onChange={(e) => setPForm({ ...pForm, full_name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={pForm.phone} onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} />
          </Field>
          <Field label="City">
            <Input value={pForm.city} onChange={(e) => setPForm({ ...pForm, city: e.target.value })} />
          </Field>
        </div>
        <Button onClick={saveProfile} className="mt-5"><Save className="h-4 w-4" /> Save profile</Button>
      </section>

      {role === "worker" && (
        <>
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-semibold text-ink">Worker details</h2>
              {worker?.is_verified && <Badge className="bg-primary-soft text-primary hover:bg-primary-soft"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Headline"><Input value={wForm.headline} onChange={(e) => setWForm({ ...wForm, headline: e.target.value })} placeholder="Experienced electrician" /></Field>
              <Field label="Hourly rate (₹)"><Input type="number" value={wForm.hourly_rate} onChange={(e) => setWForm({ ...wForm, hourly_rate: e.target.value })} /></Field>
              <Field label="Experience (years)"><Input type="number" value={wForm.experience_years} onChange={(e) => setWForm({ ...wForm, experience_years: e.target.value })} /></Field>
              <Field label="Skills (comma-separated)"><Input value={wForm.skills} onChange={(e) => setWForm({ ...wForm, skills: e.target.value })} placeholder="wiring, fan install, MCB" /></Field>
              <div className="sm:col-span-2">
                <Field label="Bio"><Textarea rows={4} value={wForm.bio} onChange={(e) => setWForm({ ...wForm, bio: e.target.value })} /></Field>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-2 block text-xs text-muted-foreground">Service categories</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const active = wForm.categories.includes(c.name);
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => toggleCat(c.name)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Button onClick={saveWorker} className="mt-5"><Save className="h-4 w-4" /> Save worker profile</Button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 font-display font-semibold text-ink">Recent reviews</h2>
            {!reviews || reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-1 text-warning">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-ink">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
