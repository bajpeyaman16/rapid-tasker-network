import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Plus, MapPin, Briefcase, Clock, Star, HardHat, ClipboardList,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Role = "customer" | "worker" | "admin";

function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!roles || roles.length === 0) {
        navigate({ to: "/onboarding" });
        return;
      }
      setRole(roles[0].role as Role);
    })();
  }, [navigate]);

  if (!role || !userId) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="container-x flex-1 py-20 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-x flex-1 py-8">
        {role === "customer" ? <CustomerView userId={userId} /> : <WorkerView userId={userId} />}
      </main>
    </div>
  );
}

function CustomerView({ userId }: { userId: string }) {
  const { data: jobs } = useQuery({
    queryKey: ["my-jobs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs").select("*").eq("customer_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = {
    active: jobs?.filter((j) => ["pending", "accepted", "started", "in_progress", "on_the_way"].includes(j.status)).length ?? 0,
    completed: jobs?.filter((j) => j.status === "completed").length ?? 0,
    total: jobs?.length ?? 0,
  };

  return (
    <>
      <PageHead title="Customer dashboard" subtitle="Post jobs and hire verified workers." action={
        <Button asChild><Link to="/post-job"><Plus className="h-4 w-4" /> Post a Job</Link></Button>
      } />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard icon={ClipboardList} label="Active jobs" value={stats.active} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} />
        <StatCard icon={Briefcase} label="Total posted" value={stats.total} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <SectionTitle title="Your jobs" />
          {jobs && jobs.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No jobs yet" desc="Post your first job to get instant offers from nearby workers." action={<Button asChild><Link to="/post-job">Post a Job</Link></Button>} />
          ) : (
            <div className="mt-4 space-y-3">
              {jobs?.map((j) => (
                <Link key={j.id} to="/jobs/$id" params={{ id: j.id }} className="block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-semibold text-ink">{j.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{j.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {j.scheduled_date ?? "Flexible"}</span>
                        {j.budget && <span className="font-semibold text-ink">₹{j.budget}</span>}
                      </div>
                    </div>
                    <JobStatusBadge status={j.status} type={j.job_type} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-ink">Browse workers</h3>
            <p className="mt-1 text-sm text-muted-foreground">Search nearby pros directly by category.</p>
            <Button asChild variant="outline" className="mt-3 w-full"><Link to="/workers"><Search className="h-4 w-4" /> Find workers</Link></Button>
          </div>
          <div className="rounded-2xl brand-gradient p-5 text-white">
            <h3 className="font-display font-semibold">Need it now?</h3>
            <p className="mt-1 text-sm text-white/85">Mark your job as emergency and get instant alerts to nearby workers.</p>
            <Button asChild variant="secondary" className="mt-3 w-full"><Link to="/post-job">Post emergency job</Link></Button>
          </div>
        </aside>
      </div>
    </>
  );
}

function WorkerView({ userId }: { userId: string }) {
  const [availability, setAvailability] = useState<"available" | "busy" | "offline">("available");

  useEffect(() => {
    supabase.from("worker_profiles").select("availability").eq("id", userId).maybeSingle().then(({ data }) => {
      if (data?.availability) setAvailability(data.availability as any);
    });
  }, [userId]);

  async function updateAvailability(v: "available" | "busy" | "offline") {
    setAvailability(v);
    await supabase.from("worker_profiles").upsert({ id: userId, availability: v });
  }

  const { data: openJobs } = useQuery({
    queryKey: ["open-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs").select("*").eq("status", "pending")
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myOffers } = useQuery({
    queryKey: ["my-offers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_offers").select("*, jobs(*)").eq("worker_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageHead title="Worker dashboard" subtitle="Find nearby jobs and grow your reputation." action={
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <Select value={availability} onValueChange={(v) => updateAvailability(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">🟢 Available</SelectItem>
              <SelectItem value="busy">🟡 Busy</SelectItem>
              <SelectItem value="offline">⚫ Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      } />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard icon={HardHat} label="Offers sent" value={myOffers?.length ?? 0} />
        <StatCard icon={CheckCircle2} label="Accepted" value={myOffers?.filter((o) => o.status === "accepted").length ?? 0} />
        <StatCard icon={Star} label="Open jobs nearby" value={openJobs?.length ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <SectionTitle title="Open jobs nearby" />
          {openJobs && openJobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No open jobs right now" desc="Check back soon — new requests appear in real time." />
          ) : (
            <div className="mt-4 space-y-3">
              {openJobs?.map((j) => (
                <Link key={j.id} to="/jobs/$id" params={{ id: j.id }} className="block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{j.category}</Badge>
                        {j.job_type === "emergency" && <Badge className="bg-warning text-ink hover:bg-warning"><AlertCircle className="h-3 w-3" /> Emergency</Badge>}
                      </div>
                      <h3 className="mt-1.5 truncate font-display text-base font-semibold text-ink">{j.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{j.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
                        {j.budget && <span className="font-semibold text-ink">₹{j.budget}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-ink">Your offers</h3>
            {myOffers && myOffers.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Send your first offer to start earning.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {myOffers?.slice(0, 5).map((o) => (
                  <li key={o.id} className="text-sm">
                    <p className="font-medium text-ink line-clamp-1">{(o.jobs as any)?.title}</p>
                    <p className="text-xs text-muted-foreground">₹{o.price} · {o.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function PageHead({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>;
}

function EmptyState({ icon: Icon, title, desc, action }: { icon: any; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function JobStatusBadge({ status, type }: { status: string; type: string }) {
  const map: Record<string, string> = {
    pending: "bg-secondary text-ink",
    accepted: "bg-accent-soft text-accent",
    in_progress: "bg-primary-soft text-primary",
    started: "bg-primary-soft text-primary",
    on_the_way: "bg-accent-soft text-accent",
    completed: "bg-primary text-primary-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? "bg-secondary text-ink"}`}>{status.replace("_", " ")}</span>
      {type === "emergency" && <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-ink">Emergency</span>}
    </div>
  );
}
