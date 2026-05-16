import LegalLayout from "@/components/legal/LegalLayout";

const PrivacyPage = () => {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 16, 2026">
      <section>
        <h2 className="font-display text-lg mb-2">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account info: email, display name, optional avatar, banner, bio, affiliation, location.</li>
          <li>Debate content: topics, sides, arguments, transcripts, summaries, AI grades, notebooks.</li>
          <li>Live session audio is streamed to our speech-to-text provider in real time for transcription; raw audio is not stored on our servers.</li>
          <li>Basic technical logs (IP address, user agent, timestamps) for security and debugging.</li>
          <li>Push notification subscriptions if you enable them.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">How we use it</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To run and improve the Service (debates, facilitation, grading, discovery, search).</li>
          <li>To send transactional notifications (invitations, account events, debate start alerts).</li>
          <li>To enforce our Terms and protect users.</li>
          <li>To comply with legal obligations.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Sharing</h2>
        <p>
          Public debates and public profiles are visible to anyone, including unauthenticated
          visitors. Private debates are visible only to participants and the creator. We share data
          with sub-processors (see our{" "}
          <a href="/legal/subprocessors" className="underline hover:text-foreground">Subprocessors</a>{" "}
          list) strictly to operate the Service. <span className="font-semibold">We do not sell personal data.</span>
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Your choices (CCPA / GDPR rights)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-semibold">Access / export:</span> Download a JSON copy of your data from Profile → Edit → "Download my data" (rate-limited to once per 7 days).</li>
          <li><span className="font-semibold">Correct:</span> Edit your profile any time from Profile → Edit.</li>
          <li><span className="font-semibold">Delete:</span> Profile → Edit → "Delete account". You have a 30-day grace period to cancel before your profile is anonymized.</li>
          <li><span className="font-semibold">Hide:</span> Make your profile or any debate private at any time.</li>
          <li><span className="font-semibold">Opt out of sale:</span> We do not sell personal data, so no opt-out is needed.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Retention</h2>
        <p>
          We keep account and debate data until you delete it. After account deletion, personal
          identifiers are removed within 30 days. Backups are retained up to 7 days, then purged.
          Aggregated, anonymized analytics may be kept indefinitely.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Security</h2>
        <p>
          We use TLS in transit, encrypted storage at rest, row-level security on all user data, and
          principle-of-least-privilege for staff access. No system is 100% secure; you use the
          Service at your own risk.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Children</h2>
        <p>
          The Service is not directed to children under 13. We do not knowingly collect data from
          children under 13. If you believe we have, contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">International users</h2>
        <p>
          Dynamo is operated from the United States. By using the Service, you consent to your data
          being transferred to and processed in the US.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Changes</h2>
        <p>We may update this Policy. Material changes will be announced in-app.</p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Contact</h2>
        <p>Privacy questions or rights requests: privacy@dynamo.today</p>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPage;