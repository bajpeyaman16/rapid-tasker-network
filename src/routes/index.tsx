import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search, MapPin, Star, ShieldCheck, Bolt, ArrowRight, Phone, MessageSquare,
  ClipboardList, Users, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORIES } from "@/lib/categories";
import heroImg from "@/assets/hero-worker.jpg";
import workerCleaner from "@/assets/worker-cleaner.jpg";
import workerPlumber from "@/assets/worker-plumber.jpg";
import workerCarpenter from "@/assets/worker-carpenter.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Local Work Network — Find Work. Find Workers. Instantly." },
      { name: "description", content: "Verified local workers near you. Post a job, get instant offers from nearby professionals." },
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
        <FeaturedWorkers />
        <EmergencyBanner />
        <Stats />
        <Testimonials />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-soft via-background to-accent-soft" />
      <div className="container-x grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
        <div>
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verified local workers
          </Badge>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl md:text-6xl">
            Find Work. <br />
            <span className="text-primary">Find Workers.</span>{" "}
            <span className="text-accent">Instantly.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Post a job and get instant offers from nearby verified professionals — electricians,
            plumbers, cleaners, carpenters and more.
          </p>

          <div className="mt-7 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="What service? e.g. Plumber" className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Your city or area" className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
              </div>
              <Button asChild size="lg" className="h-11">
                <Link to="/workers">Search</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard"><ClipboardList className="h-4 w-4" /> Post a Job</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Free to post · Workers reply in minutes
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] brand-gradient opacity-15 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
            <img src={heroImg} alt="Verified local worker" width={1280} height={1280} className="aspect-square w-full object-cover" />
            <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success animate-pulse" /> 248 workers online nearby
            </div>
            <div className="absolute bottom-4 right-4 rounded-2xl bg-white p-3 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span>4.9 average rating</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">across 12,400+ jobs</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryGrid() {
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <SectionHead
          eyebrow="Services"
          title="Browse by category"
          subtitle="From quick fixes to full home projects — find the right pro in seconds."
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                to="/workers"
                search={{ category: c.slug }}
                className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.tint === "green" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">{c.name}</p>
                <span className="mt-1 inline-flex items-center text-xs text-muted-foreground group-hover:text-primary">
                  Explore <ArrowRight className="ml-1 h-3 w-3" />
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
    { icon: ClipboardList, title: "Post your job", desc: "Tell us what you need, when, and where. Takes 30 seconds." },
    { icon: Users, title: "Get instant offers", desc: "Nearby verified workers send price + ETA in real time." },
    { icon: CheckCircle2, title: "Hire & rate", desc: "Pick the best fit, get the job done, leave a review." },
  ];
  return (
    <section className="bg-secondary/40 py-16 md:py-20">
      <div className="container-x">
        <SectionHead eyebrow="How it works" title="From request to result in 3 steps" subtitle="Reverse matching — you stop searching, workers come to you." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="absolute -top-3 left-6 rounded-full brand-gradient px-2.5 py-0.5 text-xs font-semibold text-white">Step {i + 1}</span>
                <Icon className="h-7 w-7 text-primary" />
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const FEATURED = [
  { id: "1", name: "Anita Sharma", role: "House Cleaner", rating: 4.9, reviews: 184, price: "₹350/hr", distance: "1.2 km", verified: true, img: workerCleaner },
  { id: "2", name: "Rohit Verma", role: "Plumber", rating: 4.8, reviews: 142, price: "₹500/hr", distance: "2.4 km", verified: true, img: workerPlumber },
  { id: "3", name: "Daniel Pereira", role: "Carpenter", rating: 4.9, reviews: 96, price: "₹600/hr", distance: "3.1 km", verified: true, img: workerCarpenter },
];

function FeaturedWorkers() {
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <div className="flex items-end justify-between gap-4">
          <SectionHead eyebrow="Top rated" title="Workers near you" subtitle="Verified profiles, real reviews, transparent pricing." align="left" />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/workers">View all <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURED.map((w) => (
            <article key={w.id} className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative aspect-[4/3]">
                <img loading="lazy" src={w.img} alt={w.name} className="h-full w-full object-cover" />
                {w.verified && (
                  <Badge className="absolute left-3 top-3 rounded-full bg-white text-ink hover:bg-white">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-base font-semibold text-ink">{w.name}</h3>
                    <p className="text-sm text-muted-foreground">{w.role}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
                    <Star className="h-3.5 w-3.5 fill-current" /> {w.rating}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {w.distance}</span>
                  <span>{w.reviews} reviews</span>
                  <span className="font-semibold text-ink">{w.price}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline"><Phone className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline"><MessageSquare className="h-3.5 w-3.5" /></Button>
                  <Button asChild size="sm"><Link to="/workers">Hire</Link></Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmergencyBanner() {
  return (
    <section className="py-12">
      <div className="container-x">
        <div className="overflow-hidden rounded-3xl border border-border bg-ink p-6 text-white sm:p-10">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <Badge className="rounded-full bg-warning/20 text-warning hover:bg-warning/20">
                <Bolt className="h-3.5 w-3.5" /> Emergency service
              </Badge>
              <h3 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
                Need a worker right now?
              </h3>
              <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">
                Post an emergency job and nearby workers get instant high-priority alerts.
                Most are accepted within minutes.
              </p>
            </div>
            <Button asChild size="lg" className="bg-warning text-ink hover:bg-warning/90">
              <Link to="/dashboard">Post emergency job</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { v: "25K+", l: "Verified workers" },
    { v: "180K+", l: "Jobs completed" },
    { v: "120+", l: "Cities covered" },
    { v: "4.9★", l: "Avg. rating" },
  ];
  return (
    <section className="border-y border-border bg-secondary/40 py-12">
      <div className="container-x grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <p className="font-display text-3xl font-bold text-ink md:text-4xl">{s.v}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { q: "Posted a plumbing job at 9pm. Had 4 offers in 6 minutes and the work was done by 10am next day.", n: "Priya R.", r: "Bengaluru" },
    { q: "Best platform to find painters. Verified profiles, clear pricing, no haggling stress.", n: "Arjun K.", r: "Pune" },
    { q: "I get steady work nearby and customers respect my time. Best app I've used as an electrician.", n: "Rakesh M.", r: "Delhi" },
  ];
  return (
    <section className="py-16 md:py-20">
      <div className="container-x">
        <SectionHead eyebrow="Stories" title="Loved by customers and workers" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.n} className="rounded-2xl border border-border bg-card p-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <blockquote className="mt-3 text-sm text-ink">"{t.q}"</blockquote>
              <figcaption className="mt-4 text-xs text-muted-foreground">
                <span className="font-semibold text-ink">{t.n}</span> · {t.r}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-16">
      <div className="container-x">
        <div className="overflow-hidden rounded-3xl brand-gradient p-8 text-center text-white sm:p-14">
          <h3 className="font-display text-3xl font-bold sm:text-4xl">Get started in seconds</h3>
          <p className="mx-auto mt-3 max-w-2xl text-white/85">
            Whether you need help or want to earn — Local Work Network connects you to your neighborhood.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "signup", role: "customer" }}>I need a worker</Link>
            </Button>
            <Button asChild size="lg" className="bg-ink text-white hover:bg-ink/90">
              <Link to="/auth" search={{ mode: "signup", role: "worker" }}>I want to work</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, subtitle, align = "center" }: { eyebrow: string; title: string; subtitle?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
