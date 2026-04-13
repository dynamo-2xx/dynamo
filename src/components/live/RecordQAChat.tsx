import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LiveTranscriptEntry, LiveSummary } from "@/hooks/useLiveTranscription";
import CitationModal from "./CitationModal";
import smileyLogo from "@/assets/logo-smiley.png";

type Msg = { role: "user" | "assistant"; content: string };

interface RecordQAChatProps {
  sessionId: string;
  transcriptEntries: LiveTranscriptEntry[];
  subtopics: string[];
  summaries: LiveSummary[];
  speakerNames: Record<string, string>;
  shareToken?: string | null;
}

const CITATION_REGEX = /\[(Topic|Quote):\s*"([^"]+)"\]/g;

const RecordQAChat = ({
  sessionId,
  transcriptEntries,
  subtopics,
  summaries,
  speakerNames,
  shareToken,
}: RecordQAChatProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [citation, setCitation] = useState<{ type: "topic" | "quote"; value: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    try {
      const body: any = { sessionId, messages: allMessages };
      if (shareToken) body.shareToken = shareToken;

      const { data, error } = await supabase.functions.invoke("record-qa", { body });

      if (error) {
        const status = (error as any)?.status;
        if (status === 429) toast.error("Rate limited — try again shortly.");
        else if (status === 402) toast.error("AI credits exhausted.");
        else toast.error("Failed to get a response.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, sessionId, shareToken]);

  const handleCitationClick = (type: "topic" | "quote", value: string) => {
    setCitation({ type, value });
  };

  // Render markdown with citation links
  const renderContent = (content: string) => {
    // Replace citation patterns with markdown links before rendering
    const processed = content.replace(
      CITATION_REGEX,
      (_, type: string, value: string) => `[📎 ${value}](cite://${type.toLowerCase()}/${encodeURIComponent(value)})`
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
                  onClick={() => handleCitationClick(citeType, citeValue)}
                  className="text-primary underline underline-offset-2 hover:text-primary/80 inline"
                >
                  {children}
                </button>
              );
            }
            return <a href={href} className="text-primary underline">{children}</a>;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        title="Ask about this session"
      >
        <img src={smileyLogo} alt="Ask AI" className="w-8 h-8" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[440px] max-h-[calc(100vh-4rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
          <img src={smileyLogo} alt="" className="w-6 h-6" />
          <span className="text-sm font-semibold flex-1">Ask about this session</span>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Ask any question about this session's transcript.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm prose prose-sm dark:prose-invert max-w-none"
                }`}
              >
                {m.role === "assistant" ? renderContent(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-xl px-3 py-2 rounded-bl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type a question…"
              disabled={loading}
              className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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
    </>
  );
};

export default RecordQAChat;
