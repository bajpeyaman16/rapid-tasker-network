import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/post-job")({
  component: PostJob,
});

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  category: z.string().min(1),
  description: z.string().trim().min(10).max(2000),
  location: z.string().trim().min(2).max(200),
  budget: z.string().optional(),
  scheduled_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  special_instructions: z.string().optional(),
  job_type: z.enum(["scheduled", "urgent", "emergency"]),
});

function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    title: "", category: "", description: "", location: "",
    budget: "", scheduled_date: "", start_time: "", end_time: "",
    special_instructions: "", job_type: "scheduled" as const,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = schema.parse(f);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in required");
      const { data, error } = await supabase.from("jobs").insert({
        customer_id: u.user.id,
        title: parsed.title,
        category: parsed.category,
        description: parsed.description,
        location: parsed.location,
        budget: parsed.budget ? Number(parsed.budget) : null,
        scheduled_date: parsed.scheduled_date || null,
        start_time: parsed.start_time || null,
        end_time: parsed.end_time || null,
        special_instructions: parsed.special_instructions || null,
        job_type: parsed.job_type,
      }).select().single();
      if (error) throw error;
      toast.success(parsed.job_type === "emergency" ? "Emergency job posted — alerting nearby workers" : "Job posted");
      navigate({ to: "/jobs/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post job");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-x flex-1 py-8">
        <div className="mx-auto max-w-3xl">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-ink">← Back to dashboard</Link>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">Post a job</h1>
          <p className="mt-1 text-muted-foreground">Tell us what you need. Nearby workers will see it instantly.</p>

          <form onSubmit={submit} className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6">
            <Row>
              <Field label="Job title" htmlFor="title">
                <Input id="title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Leaky kitchen tap repair" />
              </Field>
              <Field label="Category" htmlFor="category">
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                  <SelectTrigger id="category"><SelectValue placeholder="Choose service" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </Row>

            <Field label="Description" htmlFor="description">
              <Textarea id="description" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Describe the work, materials needed, and any preferences." rows={4} />
            </Field>

            <Row>
              <Field label="Location" htmlFor="location">
                <Input id="location" required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Area, City" />
              </Field>
              <Field label="Budget (₹)" htmlFor="budget">
                <Input id="budget" type="number" min="0" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} placeholder="Optional" />
              </Field>
            </Row>

            <Row cols={3}>
              <Field label="Date" htmlFor="date">
                <Input id="date" type="date" value={f.scheduled_date} onChange={(e) => setF({ ...f, scheduled_date: e.target.value })} />
              </Field>
              <Field label="Start" htmlFor="start">
                <Input id="start" type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} />
              </Field>
              <Field label="End" htmlFor="end">
                <Input id="end" type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} />
              </Field>
            </Row>

            <Field label="Special instructions" htmlFor="notes">
              <Textarea id="notes" value={f.special_instructions} onChange={(e) => setF({ ...f, special_instructions: e.target.value })} placeholder="Parking, tools, pets…" rows={2} />
            </Field>

            <Field label="Job type" htmlFor="type">
              <Select value={f.job_type} onValueChange={(v) => setF({ ...f, job_type: v as any })}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled — pick a date & time</SelectItem>
                  <SelectItem value="urgent">Urgent — today if possible</SelectItem>
                  <SelectItem value="emergency">🚨 Emergency — need someone now</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
              <Button type="submit" disabled={loading} size="lg">{loading ? "Posting…" : "Post job"}</Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid gap-4 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>{children}</div>;
}
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
