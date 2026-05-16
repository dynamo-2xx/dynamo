import LegalLayout from "@/components/legal/LegalLayout";

const TermsPage = () => {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="May 16, 2026">
      <section>
        <h2 className="font-display text-lg mb-2">1. Acceptance</h2>
        <p>
          By creating an account or using Dynamo ("the Service"), you agree to these Terms. If you
          do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">2. Eligibility</h2>
        <p>
          You must be at least 13 years old. Accounts representing organizations must be administered
          by an authorized individual.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">3. Your content</h2>
        <p>
          You retain ownership of debates, transcripts, notebooks, and other content you create. By
          posting content marked public, you grant Dynamo a worldwide, non-exclusive, royalty-free
          license to store, display, distribute, and create derivative works (such as AI summaries
          and grades) within the Service.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">4. Acceptable use</h2>
        <p>
          You agree to follow our{" "}
          <a href="/guidelines" className="underline hover:text-foreground">Community Guidelines</a>.
          Do not use Dynamo to harass, threaten, defame, or incite violence; post unlawful or
          infringing content; or attempt to disrupt the Service. We may remove content or suspend
          accounts that violate these terms at our discretion.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">5. AI features</h2>
        <p>
          Dynamo uses AI to facilitate, summarize, transcribe, and grade debates. AI output may be
          inaccurate, incomplete, or biased; you are responsible for reviewing it before relying on
          or sharing it. Dynamo does not guarantee the accuracy of AI-generated content.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">6. Subscriptions & billing</h2>
        <p>
          Paid tiers (Pro, Education, Civic) renew automatically until cancelled. You may cancel any
          time; cancellation takes effect at the end of the current billing period. Refunds are
          handled case-by-case.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">7. Termination</h2>
        <p>
          You may delete your account at any time from Profile → Edit. Deletion triggers a 30-day
          grace period during which you may cancel; after that, your profile is anonymized. We may
          suspend or terminate accounts that violate these terms or applicable law.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">8. Disclaimer of warranties</h2>
        <p>
          The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express
          or implied, including merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">9. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Dynamo is not liable for any indirect, incidental,
          consequential, special, or punitive damages. Our aggregate liability for any claim arising
          out of the Service will not exceed the greater of (a) amounts you paid us in the 12 months
          before the claim, or (b) USD $100.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">10. Indemnification</h2>
        <p>
          You agree to defend and indemnify Dynamo against claims arising from your content, your
          use of the Service, or your violation of these Terms.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">11. Governing law & disputes</h2>
        <p>
          These Terms are governed by the laws of the State of Delaware, USA, without regard to
          conflict-of-laws principles. Disputes will be resolved in the state or federal courts
          located in Delaware, and you consent to that jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">12. Changes</h2>
        <p>
          We may update these Terms. Material changes will be announced in-app. Continued use after
          changes constitutes acceptance.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">13. Contact</h2>
        <p>Questions about these Terms: privacy@dynamo.today</p>
      </section>
    </LegalLayout>
  );
};

export default TermsPage;