import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star, ShieldCheck, Phone, MessageSquare, Briefcase, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/workers/$id")({
  component: WorkerProfile,
});

function WorkerProfile() {
  const { id } = useParams({ from: "/workers/$id" });
  const { data: w } = useQuery({
    queryKey: ["worker", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_profiles")
        .select("*, profiles!worker_profiles_id_fkey(full_name, avatar_url, city, phone)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("worker_id", id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container-x py-8">
          <Link to="/workers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"><ArrowLeft className="h-4 w-4" /> All workers</Link>

          {!w ? (
            <p className="mt-10 text-center text-muted-foreground">Loading…</p>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <article className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-start gap-5">
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary font-display text-3xl font-bold">
                    {(w.profiles?.full_name ?? "?").slice(0,1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{w.profiles?.full_name ?? "Worker"}</h1>
                      {w.is_verified && <Badge className="bg-primary-soft text-primary hover:bg-primary-soft"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
                    </div>
                    <p className="mt-1 text-muted-foreground">{w.headline ?? "Local professional"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" /> <b>{Number(w.rating ?? 0).toFixed(1)}</b> <span className="text-muted-foreground">({w.reviews_count ?? 0} reviews)</span></span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {w.city ?? w.profiles?.city ?? "—"}</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><Briefcase className="h-4 w-4" /> {w.experience_years} yrs experience</span>
                    </div>
                  </div>
                </div>

                {w.bio && (
                  <section className="mt-6 border-t border-border pt-5">
                    <h2 className="font-display text-base font-semibold text-ink">About</h2>
                    <p className="mt-2 text-sm text-ink/90">{w.bio}</p>
                  </section>
                )}

                {w.categories?.length > 0 && (
                  <section className="mt-6 border-t border-border pt-5">
                    <h2 className="font-display text-base font-semibold text-ink">Services</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {w.categories.map((c: string) => <Badge key={c} variant="outline">{c}</Badge>)}
                    </div>
                  </section>
                )}

                {w.skills?.length > 0 && (
                  <section className="mt-6 border-t border-border pt-5">
                    <h2 className="font-display text-base font-semibold text-ink">Skills</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {w.skills.map((s: string) => <Badge key={s} className="bg-secondary text-ink hover:bg-secondary">{s}</Badge>)}
                    </div>
                  </section>
                )}

                <section className="mt-6 border-t border-border pt-5">
                  <h2 className="font-display text-base font-semibold text-ink">Reviews</h2>
                  {reviews && reviews.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {reviews?.map((r) => (
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
              </article>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Rate</p>
                  <p className="mt-1 font-display text-3xl font-bold text-ink">{w.hourly_rate ? `₹${w.hourly_rate}/hr` : "Quote on request"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Availability: <b className="text-ink">{w.availability}</b>
                  </p>
                  <div className="mt-4 space-y-2">
                    <Button asChild className="w-full"><Link to="/post-job">Hire / Request quote</Link></Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" disabled={!w.profiles?.phone}><Phone className="h-4 w-4" /> Call</Button>
                      <Button variant="outline"><MessageSquare className="h-4 w-4" /> Chat</Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 text-sm">
                  <p className="font-display font-semibold text-ink">Completed jobs</p>
                  <p className="mt-1 text-2xl font-bold text-ink">{w.completed_jobs ?? 0}</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
