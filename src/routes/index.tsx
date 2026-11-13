import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MapPin, ShieldCheck, ArrowRight, ClipboardList, Users, CheckCircle2, BriefcaseBusiness, UserRound, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { CATEGORIES } from "@/lib/categories";
import { SiteFooter } from "@/components/site-footer";
import heroImg from "@/assets/hero-worker.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Local Work Network | Find trusted local workers" },
      { name: "description", content: "Find local workers for home services, or post a job and receive offers from professionals nearby." },
      { property: "og:title", content: "Local Work Network | Find trusted local workers" },
      { property: "og:description", content: "Find local workers for home services, or post a job and receive offers from professionals nearby." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <CategoryGrid />
        <HowItWorks />
        <CommunitySection />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  return (
    <section className="home-hero relative isolate flex min-h-[590px] items-end overflow-hidden bg-ink md:min-h-[660px]">
      <img src={heroImg} alt="Local tradesperson ready for a home service job" width={1280} height={1280} fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_42%]" />
      <div className="container-x relative z-10 w-full pb-12 pt-16 md:pb-16">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-hero-foreground/90">
            <MapPin className="h-4 w-4" /> Local Work Network
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight text-hero-foreground sm:text-5xl md:text-6xl">
            Find trusted help nearby.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-hero-foreground/90 sm:text-lg">
            From a leaking tap to a fresh coat of paint, connect with local professionals — or find your next job close to home.
          </p>
          <form className="mt-7 flex max-w-2xl flex-col gap-2 rounded-md border border-border bg-background p-2 shadow-lg sm:flex-row" onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/workers", search: query.trim() ? { q: query.trim() } : {} });
          }}>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <Input aria-label="Service or skill" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What do you need help with?" className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
            </div>
            <Button type="submit" size="lg" className="h-11 shrink-0">
              Find workers <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-hero-foreground/90">
            <Link to="/auth" search={{ mode: "signup", role: "customer" }} className="inline-flex items-center gap-2 font-semibold underline decoration-hero-foreground/50 underline-offset-4 hover:decoration-hero-foreground">
              <ClipboardList className="h-4 w-4" /> Post a job
            </Link>
            <Link to="/auth" search={{ mode: "signup", role: "worker" }} className="inline-flex items-center gap-2 font-semibold underline decoration-hero-foreground/50 underline-offset-4 hover:decoration-hero-foreground">
              <BriefcaseBusiness className="h-4 w-4" /> Find local work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryGrid() {
  return (
    <section className="py-14 md:py-18">
      <div className="container-x">
        <SectionHead
          eyebrow="Start with a service"
          title="What needs doing?"
          subtitle="Choose a category to browse local profiles and find the right person for the job."
        />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                to="/workers"
                search={{ category: c.slug }}
                className="group flex min-h-28 flex-col items-start justify-between border-t-2 border-border py-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={`grid h-10 w-10 place-items-center rounded-md ${c.tint === "green" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-3 flex w-full items-center justify-between gap-2 text-sm font-semibold text-ink group-hover:text-primary">
                  {c.name}<ArrowRight className="h-4 w-4 shrink-0" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: ClipboardList, title: "Describe the job", desc: "Share the work, timing and location so nearby professionals know what you need." },
    { icon: Users, title: "Compare your options", desc: "Review worker profiles and offers, or contact a professional directly." },
    { icon: CheckCircle2, title: "Choose your match", desc: "Select the person who suits your job and keep track as the work progresses." },
  ];
  return (
    <section className="bg-secondary/50 py-14 md:py-20">
      <div className="container-x">
        <SectionHead eyebrow="Simple from the start" title="A clearer way to get work done" subtitle="Post a request and compare offers, or browse profiles when you already know what you need." />
        <div className="mt-10 grid gap-7 md:grid-cols-3 md:gap-10">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="border-t border-border pt-5">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-semibold text-primary">0{i + 1}</span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section className="py-14 md:py-20">
      <div className="container-x">
        <div className="grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_1fr] md:gap-12 md:py-12">
          <div>
            <p className="text-sm font-semibold text-primary">Built for both sides of local work</p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-bold text-ink sm:text-4xl">Good work starts with a good connection.</h2>
          </div>
          <div className="grid gap-7 sm:grid-cols-2">
            <div>
              <UserRound className="h-5 w-5 text-accent" />
              <h3 className="mt-3 font-display font-semibold text-ink">For customers</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Browse worker profiles, compare incoming offers and follow an active job.</p>
              <Button asChild variant="link" className="mt-2 h-auto px-0 text-primary">
                <Link to="/auth" search={{ mode: "signup", role: "customer" }}>Get help nearby <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div>
              <Clock3 className="h-5 w-5 text-accent" />
              <h3 className="mt-3 font-display font-semibold text-ink">For workers</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Create a professional profile and find jobs that fit your skills and schedule.</p>
              <Button asChild variant="link" className="mt-2 h-auto px-0 text-primary">
                <Link to="/auth" search={{ mode: "signup", role: "worker" }}>Find local work <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
