import LegalLayout from "@/components/legal/LegalLayout";

const subprocessors = [
  {
    name: "Lovable Cloud",
    purpose: "Database, authentication, file storage, edge functions, realtime",
    location: "United States",
  },
  {
    name: "Lovable AI Gateway",
    purpose: "AI facilitation, grading, summarization, Q&A (Gemini & GPT models)",
    location: "United States",
  },
  {
    name: "Deepgram",
    purpose: "Real-time speech-to-text for live sessions and debates",
    location: "United States",
  },
  {
    name: "Web Push (browser vendors)",
    purpose: "Delivery of push notifications via the user's browser provider (Mozilla, Google, Apple)",
    location: "Varies",
  },
];

const SubprocessorsPage = () => {
  return (
    <LegalLayout title="Subprocessors" lastUpdated="May 16, 2026">
      <section>
        <p>
          Dynamo uses the following third-party services ("subprocessors") to operate the platform.
          Each receives only the data necessary to perform its function.
        </p>
      </section>

      <section>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Provider</th>
                <th className="text-left px-3 py-2 font-medium">Purpose</th>
                <th className="text-left px-3 py-2 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {subprocessors.map((s) => (
                <tr key={s.name} className="border-t border-border">
                  <td className="px-3 py-3 align-top font-semibold">{s.name}</td>
                  <td className="px-3 py-3 align-top">{s.purpose}</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{s.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Changes</h2>
        <p>
          We may add or replace subprocessors as the Service evolves. Material changes will be
          reflected on this page.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg mb-2">Questions</h2>
        <p>For data processing inquiries: privacy@dynamo.today</p>
      </section>
    </LegalLayout>
  );
};

export default SubprocessorsPage;