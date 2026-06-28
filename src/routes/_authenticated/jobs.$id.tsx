import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Clock, CalendarDays, Star, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { JobStatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  component: JobDetail,
});

function JobDetail() {
  const { id } = useParams({ from: "/_authenticated/jobs/$id" });
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [eta, setEta] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: offers } = useQuery({
    queryKey: ["offers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_offers").select("*").eq("job_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isCustomer = userId && job && job.customer_id === userId;
  const myOffer = offers?.find((o) => o.worker_id === userId);

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("job_offers").insert({
        job_id: id, worker_id: userId,
        price: Number(price), eta_minutes: eta ? Number(eta) : null, message,
      });
      if (error) throw error;
      toast.success("Offer sent");
      setPrice(""); setEta(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["offers", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send offer");
    } finally { setSubmitting(false); }
  }

  async function acceptOffer(offerId: string, workerId: string) {
    try {
      const { error: e1 } = await supabase.from("job_offers").update({ status: "accepted" }).eq("id", offerId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("jobs").update({ status: "accepted", assigned_worker_id: workerId }).eq("id", id);
      if (e2) throw e2;
      toast.success("Offer accepted");
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["offers", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function markCompleted() {
    const { error } = await supabase.from("jobs").update({ status: "completed" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Marked completed"); qc.invalidateQueries({ queryKey: ["job", id] }); }
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="container-x flex-1 py-20 text-center text-muted-foreground">Loading job…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-x flex-1 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back</Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
          <article className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{job.category}</Badge>
                  {job.job_type === "emergency" && <Badge className="bg-warning text-ink hover:bg-warning"><AlertCircle className="h-3 w-3" /> Emergency</Badge>}
                </div>
                <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{job.title}</h1>
              </div>
              <JobStatusBadge status={job.status} type={job.job_type} />
            </div>

            <p className="mt-4 whitespace-pre-line text-sm text-ink/90">{job.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Meta icon={MapPin} label="Location" value={job.location} />
              <Meta icon={CalendarDays} label="Date" value={job.scheduled_date ?? "Flexible"} />
              <Meta icon={Clock} label="Time" value={[job.start_time, job.end_time].filter(Boolean).join(" – ") || "—"} />
            </div>

            {job.budget && (
              <div className="mt-5 rounded-xl bg-secondary p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Budget</p>
                <p className="mt-1 font-display text-2xl font-bold text-ink">₹{job.budget}</p>
              </div>
            )}

            {job.special_instructions && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Special instructions</p>
                <p className="mt-1 text-sm text-ink">{job.special_instructions}</p>
              </div>
            )}

            {isCustomer && job.status === "accepted" && (
              <div className="mt-6 border-t border-border pt-5">
                <Button onClick={markCompleted}><Star className="h-4 w-4" /> Mark as completed</Button>
              </div>
            )}
          </article>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-base font-semibold text-ink">Offers ({offers?.length ?? 0})</h2>
              {offers && offers.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No offers yet. Workers nearby are getting notified.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {offers?.map((o) => (
                    <li key={o.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display font-semibold text-ink">₹{o.price}</p>
                          {o.eta_minutes && <p className="text-xs text-muted-foreground">ETA ~{o.eta_minutes} min</p>}
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase">{o.status}</Badge>
                      </div>
                      {o.message && <p className="mt-2 text-sm text-ink/90">{o.message}</p>}
                      {isCustomer && job.status === "pending" && o.status === "pending" && (
                        <Button size="sm" className="mt-3 w-full" onClick={() => acceptOffer(o.id, o.worker_id)}>Accept offer</Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {!isCustomer && job.status === "pending" && !myOffer && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-display text-base font-semibold text-ink">Send an offer</h2>
                <form onSubmit={submitOffer} className="mt-3 space-y-3">
                  <div>
                    <Label htmlFor="price" className="mb-1 block text-xs text-muted-foreground">Your price (₹)</Label>
                    <Input id="price" type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="eta" className="mb-1 block text-xs text-muted-foreground">ETA (minutes)</Label>
                    <Input id="eta" type="number" min="0" value={eta} onChange={(e) => setEta(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="msg" className="mb-1 block text-xs text-muted-foreground">Message (optional)</Label>
                    <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Sending…" : "Send offer"}</Button>
                </form>
              </section>
            )}
            {myOffer && !isCustomer && (
              <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary">
                You sent an offer: ₹{myOffer.price} · {myOffer.status}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" /> {label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
