import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { useMyReaderNotes } from "@/hooks/useMyReaderNotes";
import RichTextEditor from "@/components/study/RichTextEditor";
import VisitorDynamoChat from "@/components/study/VisitorDynamoChat";
import { cn } from "@/lib/utils";

type Tab = "thoughts" | "annotations" | "my_take" | "dynamo";

const TAB_LABEL: Record<Tab, string> = {
  thoughts: "Thoughts",
  annotations: "Annotations",
  my_take: "My Take",
  dynamo: "Dynamo",
};

const TabBtn = ({
  active,
  onClick,
  children,
  hasIcon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hasIcon?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "relative shrink-0 px-3 sm:px-4 pt-2 pb-2.5 text-[13px] sm:text-sm font-body rounded-t-md border border-b-0 transition-colors min-h-[44px] sm:min-h-0 whitespace-nowrap",
      active
        ? "bg-background border-border text-foreground -mb-px z-10"
        : "bg-accent/50 border-transparent text-muted-foreground hover:text-foreground",
    )}
  >
    {hasIcon && <Sparkles className="w-3 h-3 inline -mt-0.5 mr-1" />}
    {children}
  </button>
);

const SharedNotebookPage = () => {
  const { token } = useParams<{ token: string }>();
  const { notebook: nb, loading } = useMyReaderNotes(token);
  const [tab, setTab] = useState<Tab>("thoughts");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    if (nb) document.title = `${nb.display_title || nb.session_title || "Notebook"} · Dynamo`;
  }, [nb]);

  const title = nb?.display_title || nb?.session_title || "Untitled notebook";
  const thoughtsHtml = (nb?.thoughts as any)?.blocks?.[0]?.value || "";
  const myTakeHtml = nb?.my_take || "";

  const tabs: Tab[] = ["thoughts", "annotations", "my_take", "dynamo"];

  const renderTab = (t: Tab) => {
    if (t === "thoughts") {
      if (!thoughtsHtml.trim())
        return (
          <p className="text-sm italic text-muted-foreground">No thoughts shared.</p>
        );
      return <RichTextEditor value={thoughtsHtml} editable={false} minHeight="auto" />;
    }
    if (t === "annotations") {
      return (
        <p className="text-sm italic text-muted-foreground">
          The author hasn't shared annotations for this notebook.
        </p>
      );
    }
    if (t === "my_take") {
      if (!myTakeHtml.trim())
        return <p className="text-sm italic text-muted-foreground">No take shared.</p>;
      return <RichTextEditor value={myTakeHtml} editable={false} minHeight="auto" />;
    }
    // dynamo
    if (!nb || !token) return null;
    return (
      <VisitorDynamoChat
        notebookId={nb.id}
        shareToken={token}
        recordType={nb.record_type || "live_session"}
        recordId={nb.session_id}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 lg:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 sm:mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dynamo
        </Link>

        {loading ? (
          <div className="space-y-3">
            <div className="h-6 bg-accent rounded animate-pulse w-2/3" />
            <div className="h-4 bg-accent rounded animate-pulse w-1/3" />
          </div>
        ) : !nb ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center">
            <h1 className="font-display text-xl mb-1">Notebook not found</h1>
            <p className="text-sm text-muted-foreground font-body">
              The link may have been revoked or never existed.
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              <BookOpen className="w-3 h-3" /> Shared notebook
            </div>

            <div className="flex items-start justify-between gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display truncate flex-1 min-w-0">
                {title}
              </h1>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy link
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-body mb-4 sm:mb-6">
              {nb.session_created_at
                ? `Recorded ${new Date(nb.session_created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : ""}
            </p>

            {/* Tab bar — no toolbar above; visitors can't edit */}
            <div className="flex items-end px-1 border-b border-border overflow-x-auto">
              <div className="flex items-end gap-1 flex-1 min-w-0">
                {tabs.map((t) => (
                  <TabBtn
                    key={t}
                    active={tab === t}
                    onClick={() => setTab(t)}
                    hasIcon={t === "dynamo"}
                  >
                    {TAB_LABEL[t]}
                  </TabBtn>
                ))}
              </div>
            </div>

            {/* Doc rectangle */}
            <div className="bg-background border border-border border-t-0 rounded-b-md p-3 sm:p-4 md:p-6 min-h-[60vh] sm:min-h-[400px]">
              {renderTab(tab)}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SharedNotebookPage;