import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { TIER_LABEL } from "@/lib/tiers";
import { track } from "@/lib/analytics";

const TIERS = [
  {
    key: "free" as const,
    price: "$0",
    cadence: "forever",
    tagline: "For the curious.",
    features: [
      "10 sessions / month",
      "20 notebooks / month",
      "100 AI calls / month",
      "Clubs, OG cards, public profile",
      "All session formats: Debate, CMM, Live",
    ],
    cta: { label: "Current plan", href: "/", disabled: true },
  },
  {
    key: "pro" as const,
    price: "$12",
    cadence: "per month",
    tagline: "For people who show up.",
    highlight: true,
    features: [
      "Unlimited sessions and notebooks",
      "2,000 AI calls / month",
      "Performance Intelligence dashboards",
      "DYNAMO coaching handoff",
      "Priority session quality",
    ],
    cta: { label: "Upgrade to Pro", href: "#upgrade", disabled: false },
  },
  {
    key: "education" as const,
    price: "Custom",
    cadence: "sales-led",
    tagline: "For classrooms.",
    features: [
      "Everything in Pro",
      "Per-seat invoicing",
      "Teacher dashboards",
      "Student grade exports",
      "Institution branding",
    ],
    cta: { label: "Contact sales", href: "/contact-sales?tier=education", disabled: false },
  },
  {
    key: "civic" as const,
    price: "Custom",
    cadence: "sales-led",
    tagline: "For cities and councils.",
    features: [
      "Everything in Pro",
      "Verified gold civic seal",
      "Public meeting moderation tools",
      "Audit-grade transcripts",
      "Dedicated onboarding",
    ],
    cta: { label: "Contact sales", href: "/contact-sales?tier=civic", disabled: false },
  },
];

export default function PricingPage() {
  const { tier } = useSubscription();
  useDocumentMeta({
    title: "Pricing — Dynamo",
    description: "Free for everyone. Pro for $12/month. Education and Civic plans available.",
    canonical: typeof window !== "undefined" ? `${window.location.origin}/pricing` : undefined,
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="font-serif text-5xl md:text-6xl mb-4 antialiased">Bring people to the power.</h1>
        <p className="text-muted-foreground text-lg">Four plans. One mission.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((t) => {
          const isCurrent = tier === t.key;
          return (
            <div
              key={t.key}
              className={`rounded-2xl p-6 border ${t.highlight ? "bg-foreground text-background border-foreground" : "border-foreground/10 bg-background"}`}
            >
              <div className="mb-4">
                <div className="text-sm uppercase tracking-widest opacity-70">{TIER_LABEL[t.key]}</div>
                <div className="font-serif text-4xl mt-2">{t.price}</div>
                <div className="text-sm opacity-70">{t.cadence}</div>
              </div>
              <p className="text-sm mb-4">{t.tagline}</p>
              <ul className="space-y-2 mb-6">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button className="w-full" variant="outline" disabled>Current plan</Button>
              ) : t.cta.href.startsWith("#") ? (
                <Button
                  className="w-full"
                  variant={t.highlight ? "secondary" : "default"}
                  onClick={() => {
                    track("checkout_started", { tier: t.key, source: "pricing_page" });
                    // Stripe wiring lands when payments are enabled (§17).
                    alert("Pro checkout is coming in the next build pass. For now, contact us.");
                  }}
                >
                  {t.cta.label}
                </Button>
              ) : (
                <Button asChild className="w-full" variant={t.highlight ? "secondary" : "default"}>
                  <Link to={t.cta.href}>{t.cta.label}</Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-10">
        Education and Civic plans are sales-led. We'll get back to you within 2 business days.
      </p>
    </div>
  );
}