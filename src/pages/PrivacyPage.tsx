import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPage = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 font-body"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="font-display text-3xl mb-2">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground font-body mb-8">Last updated: April 18, 2026</p>

      <div className="space-y-6 font-body text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-lg mb-2">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account info: email, display name, optional avatar, affiliation, location.</li>
            <li>Debate content: topics, sides, transcripts, summaries, AI grades.</li>
            <li>Live session audio is processed in real time for transcription; raw audio is not stored.</li>
            <li>Basic technical logs (IP, user agent) for security and debugging.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">How we use it</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To run and improve the Service (debates, facilitation, grading, search).</li>
            <li>To send transactional notifications (invitations, account events).</li>
            <li>To enforce our Terms and protect users.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Sharing</h2>
          <p>
            Public debates are visible to anyone. Private debates are visible only to participants
            and the creator. We use sub-processors for hosting (Supabase), AI (Lovable AI Gateway),
            and speech-to-text (Deepgram). We do not sell personal data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Your choices</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Edit or hide your profile from Profile → Edit.</li>
            <li>Make debates private at any time from My Agenda.</li>
            <li>Delete your account and associated content from Profile → Edit → Delete account.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Retention</h2>
          <p>
            We keep account and debate data until you delete it. Backups are purged within 30 days
            of deletion.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Children</h2>
          <p>The Service is not directed to children under 13.</p>
        </section>

        <section>
          <h2 className="font-display text-lg mb-2">Contact</h2>
          <p>Privacy questions: privacy@dynamo.app</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;
