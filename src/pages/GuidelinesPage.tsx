import LegalLayout from "@/components/legal/LegalLayout";

const GuidelinesPage = () => {
  return (
    <LegalLayout title="Community Guidelines" lastUpdated="May 16, 2026">
      <section>
        <p>
          Dynamo exists so people can disagree well. These guidelines describe how we expect everyone
          on the platform to behave — speakers, audience, facilitators, and club organizers alike.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Debate well</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Attack the argument, not the person.</li>
          <li>Steelman the other side before responding.</li>
          <li>Cite sources when you can; admit uncertainty when you can't.</li>
          <li>Stay on the subtopic. The facilitator will move the room forward.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Not allowed</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harassment, hate speech, slurs, or targeted abuse.</li>
          <li>Threats of violence or doxxing.</li>
          <li>Sexual content involving minors. Ever.</li>
          <li>Spam, scams, or undisclosed advertising.</li>
          <li>Sharing other people's private debates or DMs without consent.</li>
          <li>Deliberate disinformation presented as fact.</li>
          <li>Impersonating real people or organizations.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Audience & spectators</h2>
        <p>
          Reactions and questions are welcome. Don't use Q&A or DMs to harass speakers. Repeated
          violations result in removal from the room and possible account suspension.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Moderation</h2>
        <p>
          Debate creators may remove participants from their rooms. Club admins may remove members
          from their clubs. Dynamo staff may remove content, suspend accounts, or ban users who
          violate these guidelines — with or without prior warning, depending on severity.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Appeals</h2>
        <p>
          If you believe a removal or suspension was wrong, contact privacy@dynamo.today with the
          debate ID or username and a brief explanation. We aim to respond within 7 days.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Reporting</h2>
        <p>
          Report violations to privacy@dynamo.today. Include a link, screenshot, or context. We do
          not share reporter identities with the reported party.
        </p>
      </section>
    </LegalLayout>
  );
};

export default GuidelinesPage;