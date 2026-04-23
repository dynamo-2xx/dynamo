import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CitationModal from "@/components/live/CitationModal";
import type { LiveTranscriptEntry, LiveSummary } from "@/hooks/useLiveTranscription";
import type { QAMsg } from "@/hooks/useRecordQA";

const CITATION_REGEX = /\[(Topic|Quote):\s*"([^"]+)"\]/g;

interface Props {
  messages: QAMsg[];
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  onSend: () => void;
  // Citation modal context
  transcriptEntries: LiveTranscriptEntry[];
  subtopics: string[];
  summaries: LiveSummary[];
  speakerNames: Record<string, string>;
}

/**
 * Embedded "Dynamo" AI chat pane for the Notebook tab.
 * Mobile-first sizing. Shares state via useRecordQA so switching tabs
 * preserves the conversation.
 */
const DynamoChatPane = ({
  messages,
  input,
  setInput,
  loading,
  onSend,
  transcriptEntries,
  subtopics,
  speakerNames,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [citation, setCitation] = useState<{ type: "topic" | "quote"; value: string } | null>(
    null,
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const renderContent = (content: string) => {
    const processed = content.replace(
      CITATION_REGEX,
      (_, type: string, value: string) =>
        `[📎 ${value}](cite://${type.toLowerCase()}/${encodeURIComponent(value)})`,
    );
    return (
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("cite://")) {
              const parts = href.replace("cite://", "").split("/");
              const citeType = parts[0] as "topic" | "quote";
              const citeValue = decodeURIComponent(parts.slice(1).join("/"));
              return (
                <button
                  onClick={() => setCitation({ type: citeType, value: citeValue })}
                  className="text-primary underline underline-offset-2 hover:text-primary/80 inline"
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} className="text-primary underline">
                {children}
              </a>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-[13px] md:text-xs text-muted-foreground text-center py-8 font-body">
            Ask Dynamo anything about this session's transcript.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-xl px-3 py-2 text-[13px] md:text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-foreground text-background rounded-br-sm"
                  : "bg-foreground/[0.04] text-foreground rounded-bl-sm prose prose-sm dark:prose-invert max-w-none"
              }`}
            >
              {m.role === "assistant" ? renderContent(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-foreground/[0.04] rounded-xl px-3 py-2 rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 mt-2 border-t border-foreground/10">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask Dynamo…"
            disabled={loading}
            className="flex-1 min-w-0 bg-background border border-foreground/10 rounded-lg px-3 py-2 text-[15px] md:text-sm outline-none focus:ring-1 focus:ring-foreground/20 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="p-2.5 md:p-2 rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CitationModal
        open={!!citation}
        onOpenChange={(v) => !v && setCitation(null)}
        type={citation?.type || "topic"}
        value={citation?.value || ""}
        transcriptEntries={transcriptEntries}
        subtopics={subtopics}
        speakerNames={speakerNames}
      />
    </div>
  );
};

export default DynamoChatPane;