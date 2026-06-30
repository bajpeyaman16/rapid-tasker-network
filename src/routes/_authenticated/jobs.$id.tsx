import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Clock, CalendarDays, Star, ArrowLeft, AlertCircle, ShieldCheck, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { JobStatusBadge } from "./dashboard";
import { recommendWorkersForJob, rankOffers } from "@/lib/recommendations";

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
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: offersRaw } = useQuery({
    queryKey: ["offers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_offers").select("*").eq("job_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rankedOffers } = useQuery({
    queryKey: ["offers-ranked", id, offersRaw?.length, job?.budget],
    enabled: !!job && !!offersRaw,
    queryFn: () => rankOffers(offersRaw ?? [], job!),
  });

  const isCustomer = userId && job && job.customer_id === userId;

  const { data: recommended } = useQuery({
    queryKey: ["recommendations", id],
    enabled: !!job && !!isCustomer && job?.status === "pending",
    queryFn: () => recommendWorkersForJob({ ...job!, id: job!.id }, 5),
  });

  const myOffer = offersRaw?.find((o) => o.worker_id === userId);

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
    setAccepting(offerId);
    try {
      // Guard 1: re-check job is still open and unassigned (prevents duplicate assignment)
      const { data: fresh, error: jErr } = await supabase
        .from("jobs").select("status, assigned_worker_id").eq("id", id).maybeSingle();
      if (jErr) throw jErr;
      if (!fresh || fresh.status !== "pending" || fresh.assigned_worker_id) {
        toast.error("This job has already been assigned");
        qc.invalidateQueries({ queryKey: ["job", id] });
        return;
      }
      // Guard 2: worker not already locked into another active job
      const { data: workerBusy } = await supabase
        .from("jobs").select("id").eq("assigned_worker_id", workerId)
        .in("status", ["accepted", "on_the_way", "started", "in_progress"]).limit(1);
      if (workerBusy && workerBusy.length > 0) {
        toast.error("This worker is already on another active job");
        return;
      }

      // Atomic-ish update: only succeed if still pending & unassigned
      const { data: updated, error: e2 } = await supabase
        .from("jobs")
        .update({ status: "accepted", assigned_worker_id: workerId })
        .eq("id", id).eq("status", "pending").is("assigned_worker_id", null)
        .select().maybeSingle();
      if (e2) throw e2;
      if (!updated) {
        toast.error("Job was just assigned to someone else");
        qc.invalidateQueries({ queryKey: ["job", id] });
        return;
      }

      // Accept the chosen offer, reject the rest
      await supabase.from("job_offers").update({ status: "accepted" }).eq("id", offerId);
      await supabase.from("job_offers").update({ status: "rejected" })
        .eq("job_id", id).neq("id", offerId).eq("status", "pending");

      toast.success("Offer accepted");
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["offers", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setAccepting(null);
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
          <div className="space-y-6">
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

            {isCustomer && job.status === "pending" && (
              <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-soft/60 to-card p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-semibold text-ink">Top 5 recommended workers</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Ranked by skill match, location, ratings, experience and availability. Already-assigned workers are excluded.</p>

                {!recommended ? (
                  <p className="mt-4 text-sm text-muted-foreground">Finding the best matches…</p>
                ) : recommended.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No matching workers found yet. Workers in your area will be notified.</p>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {recommended.map((r, idx) => (
                      <li key={r.worker.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-display text-sm font-bold">{idx + 1}</div>
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-display font-bold">
                          {(r.profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-display font-semibold text-ink">{r.profile?.full_name ?? "Worker"}</p>
                            {r.worker.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            ★ {Number(r.worker.rating ?? 0).toFixed(1)} · {r.worker.completed_jobs ?? 0} jobs · {r.worker.city ?? "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            <Trophy className="h-3 w-3" /> {r.score.total}
                          </div>
                          <div className="mt-1">
                            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                              <Link to="/workers/$id" params={{ id: r.worker.id }}>View</Link>
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Offers ({offersRaw?.length ?? 0})</h2>
                {isCustomer && (rankedOffers?.length ?? 0) > 0 && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Smart-ranked</span>
                )}
              </div>
              {rankedOffers && rankedOffers.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No offers yet. Workers nearby are getting notified.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {rankedOffers?.map((row, idx) => {
                    const o = row.offer;
                    const isTop = isCustomer && idx === 0 && o.status === "pending";
                    return (
                      <li key={o.id} className={`rounded-xl border p-3 ${isTop ? "border-primary/40 bg-primary-soft/40" : "border-border"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-display font-semibold text-ink">{row.profile?.full_name ?? "Worker"}</p>
                              {row.worker?.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                              {isTop && <Badge className="bg-primary text-primary-foreground hover:bg-primary"><Trophy className="h-3 w-3" /> Best match</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ★ {Number(row.worker?.rating ?? 0).toFixed(1)} · {row.worker?.completed_jobs ?? 0} jobs
                              {o.eta_minutes ? ` · ETA ~${o.eta_minutes} min` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-lg font-bold text-ink">₹{o.price}</p>
                            {row.score && (
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Score {row.score.total}</p>
                            )}
                          </div>
                        </div>
                        {o.message && <p className="mt-2 text-sm text-ink/90">{o.message}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] uppercase">{o.status}</Badge>
                        </div>
                        {isCustomer && job.status === "pending" && o.status === "pending" && (
                          <Button
                            size="sm"
                            className="mt-3 w-full"
                            disabled={accepting === o.id}
                            onClick={() => acceptOffer(o.id, o.worker_id)}
                          >
                            {accepting === o.id ? "Accepting…" : "Accept offer"}
                          </Button>
                        )}
                      </li>
                    );
                  })}
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
