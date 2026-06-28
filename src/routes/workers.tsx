import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search, MapPin, Star, ShieldCheck, Phone, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORIES } from "@/lib/categories";
import { useState } from "react";

export const Route = createFileRoute("/workers")({
  validateSearch: z.object({ category: z.string().optional(), q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Find Workers — Local Work Network" }] }),
  component: Workers,
});

function Workers() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [category, setCategory] = useState(search.category ?? "all");

  const { data: workers, isLoading } = useQuery({
    queryKey: ["workers", category, q],
    queryFn: async () => {
      const { data: ws, error } = await supabase
        .from("worker_profiles")
        .select("*, profiles!worker_profiles_id_fkey(full_name, avatar_url, city, phone)")
        .order("rating", { ascending: false })
        .limit(60);
      if (error) throw error;
      let list = ws ?? [];
      if (category && category !== "all") {
        const name = CATEGORIES.find((c) => c.slug === category)?.name ?? category;
        list = list.filter((w: any) => (w.categories ?? []).some((c: string) => c.toLowerCase() === name.toLowerCase()));
      }
      if (q.trim()) {
        const needle = q.toLowerCase();
        list = list.filter((w: any) =>
          (w.profiles?.full_name ?? "").toLowerCase().includes(needle) ||
          (w.headline ?? "").toLowerCase().includes(needle) ||
          (w.skills ?? []).join(" ").toLowerCase().includes(needle)
        );
      }
      return list;
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-secondary/40">
          <div className="container-x py-10">
            <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Find workers near you</h1>
            <p className="mt-1 text-muted-foreground">Verified profiles, transparent prices, real reviews.</p>

            <div className="mt-6 grid gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[1fr_220px_auto]">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, skill…" className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="lg" className="h-11"><Search className="h-4 w-4" /> Search</Button>
            </div>
          </div>
        </section>

        <section className="container-x py-10">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading workers…</p>
          ) : workers && workers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
              <p className="font-display text-lg font-semibold text-ink">No workers found yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Be among the first — invite workers to join your area.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workers?.map((w: any) => (
                <article key={w.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-display text-lg font-bold">
                      {(w.profiles?.full_name ?? "?").slice(0,1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-display font-semibold text-ink">{w.profiles?.full_name ?? "Worker"}</h3>
                      <p className="truncate text-xs text-muted-foreground">{w.headline ?? (w.categories?.[0] ?? "Local pro")}</p>
                    </div>
                    {w.is_verified && <ShieldCheck className="ml-auto h-4 w-4 text-primary" />}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {Number(w.rating ?? 0).toFixed(1)} ({w.reviews_count ?? 0})</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {w.city ?? w.profiles?.city ?? "—"}</span>
                    {w.hourly_rate && <span className="font-semibold text-ink">₹{w.hourly_rate}/hr</span>}
                  </div>

                  {w.categories?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {w.categories.slice(0,3).map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" disabled={!w.profiles?.phone}><Phone className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5" /></Button>
                    <Button asChild size="sm"><Link to="/workers/$id" params={{ id: w.id }}>View</Link></Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
