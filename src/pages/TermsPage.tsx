import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsPage = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 font-body"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="font-display text-3xl mb-2">Terms of Service</h1>
      <p className="text-xs text-muted-foreground font-body mb-8">Last updated: April 18, 2026</p>

      <div className="space-y-6 font-body text-sm leading-relaxed text-foreground">
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
            You must be at least 13 years old (or the minimum age of digital consent in your
            jurisdiction). Accounts representing organizations must be administered by an authorized
            individual.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">3. Your content</h2>
          <p>
            You retain ownership of debates, transcripts, and other content you create. By posting
            content marked public, you grant Dynamo a worldwide, non-exclusive license to store,
            display, and distribute it within the Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">4. Acceptable use</h2>
          <p>
            Do not use Dynamo to harass, threaten, defame, or incite violence; post unlawful or
            infringing content; or attempt to disrupt the Service. We may remove content or suspend
            accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">5. AI features</h2>
          <p>
            Dynamo uses AI to facilitate, summarize, and grade debates. AI output may be inaccurate;
            you are responsible for reviewing it before relying on or sharing it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">6. Termination</h2>
          <p>
            You may delete your account at any time from Profile → Edit. We may suspend or
            terminate accounts that violate these terms or applicable law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">7. Disclaimer & liability</h2>
          <p>
            The Service is provided "as is" without warranties. To the maximum extent permitted by
            law, Dynamo is not liable for indirect, incidental, or consequential damages.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">8. Changes</h2>
          <p>
            We may update these Terms. Material changes will be announced in-app. Continued use
            after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">9. Contact</h2>
          <p>Questions: hello@dynamo.app</p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
