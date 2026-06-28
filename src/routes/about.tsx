import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About — Local Work Network" },
    { name: "description", content: "Local Work Network connects communities with trusted local workers." },
  ]}),
  component: About,
});

function About() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-x py-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Our mission</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-ink sm:text-5xl">Empowering local work in every neighborhood</h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Local Work Network is a marketplace built for the people who keep our homes running.
              We give verified electricians, plumbers, cleaners, carpenters and other professionals
              a fair shot at consistent work — and make hiring them effortless for everyone in the community.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <Block title="Built for workers" desc="Discoverable profiles, transparent ratings, and tools that respect their time." />
              <Block title="Safe for customers" desc="Verified identities, real reviews, and clear pricing — no negotiation games." />
              <Block title="Real-time matching" desc="Reverse matching means jobs find workers, not the other way around." />
              <Block title="Local impact" desc="Every job booked is income that stays in your neighborhood." />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
function Block({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
