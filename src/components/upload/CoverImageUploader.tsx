import { useRef, useState } from "react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { gradientFromSeed } from "@/lib/gradient";
import { cn } from "@/lib/utils";

interface CoverImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Used for the gradient fallback preview only. */
  seed?: string;
  className?: string;
  label?: string;
}

const CoverImageUploader = ({
  value,
  onChange,
  seed = "cover",
  className,
  label = "Cover image (optional)",
}: CoverImageUploaderProps) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("Sign in to upload a cover image");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("record-covers")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("record-covers").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Cover updated");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const bg = value
    ? { backgroundImage: `url(${value})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : { backgroundImage: gradientFromSeed(seed) };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
          {label}
        </label>
      )}
      <div
        className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-border"
        style={bg}
      >
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <div className="text-center">
              <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-80" />
              <p className="text-[11px] font-body">No cover yet</p>
            </div>
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
            aria-label="Remove cover"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-body hover:border-foreground/30 transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : value ? "Replace" : "Upload image"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 rounded-full border border-border text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default CoverImageUploader;