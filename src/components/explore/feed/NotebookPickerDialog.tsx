import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BookOpen, Globe2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Row {
  id: string;
  display_title: string | null;
  published: boolean;
  updated_at: string;
}

const NotebookPickerDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("session_notebooks" as any)
        .select("id,display_title,published,updated_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(20);
      setRows(((data as any) || []) as Row[]);
      setLoading(false);
    })();
  }, [open, user]);

  const go = (id: string) => {
    onClose();
    navigate(`/my-study/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Publish a notebook</DialogTitle>
          <DialogDescription className="font-body">
            Pick a notebook to open and publish, or head to a record to start a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {loading && (
            <p className="text-sm text-muted-foreground font-body py-6 text-center">
              Loading…
            </p>
          )}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground font-body py-6 text-center">
              You don't have any notebooks yet. Open a debate, live session, or imported record and start one.
            </p>
          )}
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => go(r.id)}
              className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-foreground/40 hover:bg-muted/40 transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-body truncate">
                {r.display_title?.trim() || "Untitled notebook"}
              </span>
              {r.published && (
                <span className="inline-flex items-center gap-1 text-[10px] font-body text-muted-foreground">
                  <Globe2 className="w-3 h-3" /> Published
                </span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotebookPickerDialog;