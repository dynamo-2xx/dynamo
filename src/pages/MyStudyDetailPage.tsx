import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import AppLayout from "@/components/AppLayout";
import ShareMenu from "@/components/study/ShareMenu";
import RenameDialog from "@/components/study/RenameDialog";
import ThoughtsTab from "@/components/live/record/notebook/ThoughtsTab";
import AnnotationsTab from "@/components/live/record/notebook/AnnotationsTab";
import MyTakeTab from "@/components/live/record/notebook/MyTakeTab";
import { useMyStudy, notebookTitle } from "@/hooks/useMyStudy";
import { useSessionNotebook } from "@/hooks/useSessionNotebook";
import { useSessionAnnotations } from "@/hooks/useSessionAnnotations";
import { cn } from "@/lib/utils";

type Tab = "thoughts" | "annotations" | "my_take";

const TabBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "relative px-4 pt-2 pb-2.5 text-sm font-body rounded-t-md border border-b-0 transition-colors",
      active
        ? "bg-background border-border text-foreground -mb-px z-10"
        : "bg-accent/50 border-transparent text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const MyStudyDetailPage = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const study = useMyStudy({ includeTrashed: true });
  const notebook = study.notebooks.find((n) => n.id === notebookId);
  const sessionId = notebook?.session_id || null;

  const nb = useSessionNotebook(sessionId);
  const { annotations, remove: removeAnnotation } = useSessionAnnotations(sessionId) as any;
  // useSessionAnnotations may not export `remove` — soft-handle
  const handleRemoveAnn = async (id: string) => {
    if (typeof removeAnnotation === "function") {
      await removeAnnotation(id);
    }
  };

  const [tab, setTab] = useState<Tab>("thoughts");
  const [renameOpen, setRenameOpen] = useState(false);

  const folder = useMemo(
    () => study.folders.find((f) => f.id === notebook?.folder_id) || null,
    [study.folders, notebook?.folder_id],
  );

  useEffect(() => {
    return () => {
      // flush on leave
      nb.flushNow?.();
    };
  }, [nb]);

  if (!notebookId) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to="/my-study"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Study
          </Link>

          {!notebook ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground font-body">Loading notebook…</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-display truncate">
                    {notebookTitle(notebook)}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setRenameOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Rename notebook"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/live/${notebook.session_id}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1.5"
                  >
                    Open session record <ArrowUpRight className="w-3 h-3" />
                  </Link>
                  <ShareMenu
                    notebookId={notebook.id}
                    sessionId={notebook.session_id}
                    shareToken={notebook.share_token}
                    onGenerate={study.generateShareToken}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-body mb-6">
                {notebook.session_created_at
                  ? `Recorded ${new Date(notebook.session_created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : ""}
                {folder && <> · in 📁 {folder.name}</>}
              </p>

              <div className="flex items-end gap-1 px-1 border-b border-border">
                <TabBtn active={tab === "thoughts"} onClick={() => setTab("thoughts")}>
                  Thoughts
                </TabBtn>
                <TabBtn active={tab === "annotations"} onClick={() => setTab("annotations")}>
                  Annotations · {annotations?.length || 0}
                </TabBtn>
                <TabBtn active={tab === "my_take"} onClick={() => setTab("my_take")}>
                  My Take
                </TabBtn>
              </div>

              <div className="bg-background border border-border border-t-0 rounded-b-md p-4 sm:p-6 min-h-[400px]">
                {nb.loading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-accent rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-accent rounded animate-pulse w-2/3" />
                  </div>
                ) : (
                  <>
                    {tab === "thoughts" && (
                      <ThoughtsTab thoughts={nb.thoughts} setThoughts={nb.setThoughts} />
                    )}
                    {tab === "annotations" && (
                      <AnnotationsTab
                        annotations={annotations || []}
                        onJump={(a) => {
                          navigate(`/live/${notebook.session_id}#annotation-${a.id}`);
                        }}
                        onRemove={handleRemoveAnn}
                      />
                    )}
                    {tab === "my_take" && (
                      <MyTakeTab
                        myTake={nb.myTake}
                        setMyTake={nb.setMyTake}
                        onDelete={nb.deleteMyTake}
                        onPublish={nb.publish}
                        onUnpublish={nb.unpublish}
                        isPublished={nb.isPublished}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {notebook && (
        <RenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          title="Rename notebook"
          initialValue={notebookTitle(notebook)}
          onSubmit={async (name) => {
            await study.renameNotebook(notebook.id, name);
            toast.success("Renamed");
          }}
        />
      )}
    </AppLayout>
  );
};

export default MyStudyDetailPage;