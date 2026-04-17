import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const LocationPrompt = ({ open, onOpenChange, onSaved }: Props) => {
  const { user, refreshProfile } = useAuth();
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState<"geo" | "manual" | null>(null);

  const save = async (location: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ location })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Could not save your location");
      return false;
    }
    await refreshProfile();
    toast.success("Location saved");
    onSaved?.();
    onOpenChange(false);
    return true;
  };

  const useGeo = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported in this browser");
      return;
    }
    setBusy("geo");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = `${pos.coords.latitude.toFixed(2)},${pos.coords.longitude.toFixed(2)}`;
        await save(loc);
        setBusy(null);
      },
      (err) => {
        setBusy(null);
        toast.error(err.message || "Couldn't get your location");
      },
      { timeout: 8000 },
    );
  };

  const useManual = async () => {
    if (!manual.trim()) return;
    setBusy("manual");
    await save(manual.trim());
    setBusy(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Contribute to your community!</DialogTitle>
          <DialogDescription className="font-body">
            Set your location to discover and join debates happening around you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Button
            type="button"
            onClick={useGeo}
            disabled={!!busy}
            className="w-full"
          >
            {busy === "geo" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Use my current location
          </Button>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body">
            <div className="flex-1 h-px bg-border" />
            or enter manually
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="e.g. Brooklyn, NY"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && useManual()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={useManual}
              disabled={!!busy || !manual.trim()}
            >
              {busy === "manual" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <p className="text-[11px] text-muted-foreground font-body">
            You can change this anytime in your profile.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPrompt;
