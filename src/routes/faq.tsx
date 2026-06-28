import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [
    { title: "FAQ — Local Work Network" },
    { name: "description", content: "Answers to common questions about posting jobs and hiring local workers." },
  ]}),
  component: Faq,
});

const FAQS = [
  { q: "Is it free to post a job?", a: "Yes — posting jobs is completely free for customers." },
  { q: "How are workers verified?", a: "Workers submit ID and skill documents which our team reviews. Verified workers get a badge on their profile." },
  { q: "What is an emergency job?", a: "Emergency jobs send instant high-priority alerts to nearby workers so you can get help in minutes." },
  { q: "How do payments work?", a: "Pay in cash, UPI, card or online once the job is complete. Invoices are available in your dashboard." },
  { q: "Can I leave a review?", a: "Only customers who hired a worker via Local Work Network can leave a review — ensuring authenticity." },
];

function Faq() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container-x py-14">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display text-4xl font-bold text-ink">Frequently asked questions</h1>
            <Accordion type="single" collapsible className="mt-8">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`i${i}`}>
                  <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
