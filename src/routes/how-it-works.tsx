import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Users, CheckCircle2, Bolt, Star, Shield } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [
    { title: "How it works — Local Work Network" },
    { name: "description", content: "Post a job, get instant offers from nearby verified workers, hire and rate." },
  ]}),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-secondary/40 py-14">
          <div className="container-x text-center">
            <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">How Local Work Network works</h1>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Reverse matching — you stop searching, verified workers come to you.</p>
          </div>
        </section>
        <section className="container-x py-14">
          <div className="grid gap-5 md:grid-cols-3">
            <Step n={1} icon={ClipboardList} title="Post your job" desc="Tell us what, when, where. Add a budget if you'd like." />
            <Step n={2} icon={Users} title="Compare offers" desc="Workers nearby send price + ETA. Compare ratings, reviews, distance." />
            <Step n={3} icon={CheckCircle2} title="Hire & rate" desc="Pick the best worker, get it done, leave a review." />
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <Feature icon={Shield} title="Verified workers" desc="Background-checked profiles with documents and skills." />
            <Feature icon={Star} title="Real reviews" desc="Only customers who hired can rate — no fake reviews." />
            <Feature icon={Bolt} title="Emergency mode" desc="Instant high-priority alerts for urgent jobs." />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
function Step({ n, icon: Icon, title, desc }: { n: number; icon: any; title: string; desc: string }) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6">
      <span className="absolute -top-3 left-6 rounded-full brand-gradient px-2.5 py-0.5 text-xs font-semibold text-white">Step {n}</span>
      <Icon className="h-7 w-7 text-primary" />
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="h-6 w-6 text-accent" />
      <h4 className="mt-3 font-semibold text-ink">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
