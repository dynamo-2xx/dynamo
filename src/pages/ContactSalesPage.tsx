import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { track } from "@/lib/analytics";
import type { Tier } from "@/lib/tiers";

export default function ContactSalesPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tierRaw = params.get("tier");
  const tier: Tier = tierRaw === "civic" ? "civic" : "education";

  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [seatCount, setSeatCount] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useDocumentMeta({
    title: `Contact sales — ${tier === "civic" ? "Civic" : "Education"} — Dynamo`,
    description: "Talk to us about Education or Civic plans.",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !contactEmail) {
      toast({ title: "Missing info", description: "Org name and contact email are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("sales_leads").insert({
      org_name: orgName,
      contact_email: contactEmail,
      contact_name: contactName || null,
      tier_requested: tier,
      seat_count: seatCount ? parseInt(seatCount, 10) : null,
      use_case: useCase || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }
    track("sales_lead_submitted", { tier });
    toast({ title: "Thanks!", description: "We'll be in touch within 2 business days." });
    navigate("/");
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl mb-2 antialiased">Contact sales — {tier === "civic" ? "Civic" : "Education"}</h1>
      <p className="text-muted-foreground mb-8">Tell us a little about your organization and we'll set you up.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="org">Organization *</Label>
          <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Contact email *</Label>
          <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="seats">Approx. seat count</Label>
          <Input id="seats" type="number" min={1} value={seatCount} onChange={(e) => setSeatCount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="usecase">How will you use Dynamo?</Label>
          <Textarea id="usecase" rows={4} value={useCase} onChange={(e) => setUseCase(e.target.value)} maxLength={1000} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}