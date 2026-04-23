import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Check, X, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditableArgumentProps {
  id: string;
  content: string;
  originalContent: string | null;
  isEdited: boolean;
  argumentType: string;
  sideLabel: string;
  sideOrder: number;
  isLeft: boolean;
  canEdit: boolean;
  onUpdate: (id: string, newContent: string) => void;
}

const EditableArgument = ({
  id,
  content,
  originalContent,
  isEdited,
  argumentType,
  sideLabel,
  sideOrder,
  isLeft,
  canEdit,
  onUpdate,
}: EditableArgumentProps) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(content);
  const [saving, setSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleSave = async () => {
    if (!editText.trim() || editText === content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("arguments")
      .update({
        content: editText.trim(),
        is_edited: true,
        original_content: originalContent || content,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save edit");
    } else {
      onUpdate(id, editText.trim());
      toast.success("Argument updated");
    }
    setSaving(false);
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex ${isLeft ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 group relative ${
          isLeft
            ? "bg-blue-500/10 border border-blue-500/20"
            : "bg-orange-500/10 border border-orange-500/20"
        }`}
        data-argument-id={id}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              isLeft ? "text-blue-400" : "text-orange-400"
            }`}
          >
            {sideLabel}
          </span>
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary/50 rounded">
            {argumentType}
          </span>
          {isEdited && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              <History className="w-3 h-3" />
              {showOriginal ? "edited" : "original"}
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !editText.trim()}
                className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditText(content);
                }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground">
              {showOriginal && originalContent ? originalContent : content}
            </p>
            {showOriginal && originalContent && (
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                Showing original version
              </p>
            )}
            {canEdit && !showOriginal && (
              <button
                onClick={() => setEditing(true)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default EditableArgument;
