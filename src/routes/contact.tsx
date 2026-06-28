import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact — Local Work Network" },
    { name: "description", content: "Get in touch with the Local Work Network team." },
  ]}),
  component: Contact,
});

function Contact() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-x py-14">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h1 className="font-display text-4xl font-bold text-ink">Get in touch</h1>
              <p className="mt-2 text-muted-foreground">We'd love to hear from you — for support, partnerships or feedback.</p>
              <ul className="mt-8 space-y-4 text-sm">
                <Li icon={Mail} v="hello@localworknetwork.app" />
                <Li icon={Phone} v="+91 80000 00000" />
                <Li icon={MapPin} v="Bengaluru, India" />
              </ul>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); toast.success("Thanks — we'll get back to you soon."); (e.target as HTMLFormElement).reset(); }} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="n" className="mb-1 block text-xs text-muted-foreground">Name</Label><Input id="n" required /></div>
                <div><Label htmlFor="e" className="mb-1 block text-xs text-muted-foreground">Email</Label><Input id="e" type="email" required /></div>
              </div>
              <div className="mt-4"><Label htmlFor="m" className="mb-1 block text-xs text-muted-foreground">Message</Label><Textarea id="m" rows={5} required /></div>
              <Button type="submit" className="mt-5 w-full sm:w-auto">Send message</Button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
function Li({ icon: Icon, v }: { icon: any; v: string }) {
  return <li className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>{v}</li>;
}
