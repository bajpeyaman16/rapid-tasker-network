import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="container-x grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="brand-gradient grid h-8 w-8 place-items-center rounded-lg text-white">
              <MapPin className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-base font-bold text-ink">Local Work Network</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Find work. Find workers. Instantly. Verified local professionals near you.
          </p>
        </div>
        <FooterCol title="Platform" links={[
          { to: "/workers", label: "Find Workers" },
          { to: "/how-it-works", label: "How it works" },
          { to: "/dashboard", label: "Post a Job" },
        ]} />
        <FooterCol title="Company" links={[
          { to: "/about", label: "About" },
          { to: "/contact", label: "Contact" },
          { to: "/faq", label: "FAQ" },
        ]} />
        <FooterCol title="Account" links={[
          { to: "/auth", label: "Sign in" },
          { to: "/auth", label: "Create account" },
        ]} />
      </div>
      <div className="border-t border-border">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Local Work Network. All rights reserved.</p>
          <p>Made with care for local communities.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-sm text-muted-foreground hover:text-ink">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
