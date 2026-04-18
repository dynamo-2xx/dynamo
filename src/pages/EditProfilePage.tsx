import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Loader2, MapPin, User as UserIcon } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { gradientFromSeed } from "@/lib/gradient";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface FormState {
  display_name: string;
  affiliation: string;
  location: string;
  role: AppRole;
  is_public: boolean;
  avatar_url: string | null;
  banner_url: string | null;
}

const emptyForm = (): FormState => ({
  display_name: "",
  affiliation: "",
  location: "",
  role: "personal",
  is_public: false,
  avatar_url: null,
  banner_url: null,
});

const EditProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [initial, setInitial] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [locating, setLocating] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Seed form from profile
  useEffect(() => {
    if (!profile) return;
    const next: FormState = {
      display_name: profile.display_name ?? "",
      affiliation: profile.affiliation ?? "",
      location: profile.location ?? "",
      role: (profile.role ?? "personal") as AppRole,
      is_public: !!profile.is_public,
      avatar_url: profile.avatar_url ?? null,
      banner_url: profile.banner_url ?? null,
    };
    setForm(next);
    setInitial(next);
  }, [profile]);

  const isDirty = useMemo(() => {
    return (Object.keys(form) as Array<keyof FormState>).some(
      (k) => form[k] !== initial[k]
    );
  }, [form, initial]);

  const bannerStyle = useMemo(() => {
    if (form.banner_url) {
      return { backgroundImage: `url(${form.banner_url})` };
    }
    return { backgroundImage: gradientFromSeed(form.display_name || user?.email || "d.") };
  }, [form.banner_url, form.display_name, user?.email]);

  const handleUpload = async (kind: "avatar" | "banner", file: File) => {
    if (!user) return;
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const bucket = kind === "avatar" ? "avatars" : "banners";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === "avatar" ? "avatar_url" : "banner_url"]: data.publicUrl }));
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location not supported on this device" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse geocode via OpenStreetMap (no key required)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const json = await res.json();
          const addr = json?.address ?? {};
          const label = [addr.city || addr.town || addr.village, addr.country]
            .filter(Boolean)
            .join(", ");
          if (label) setForm((f) => ({ ...f, location: label }));
        } catch {
          // ignore — leave field as-is
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast({ title: "Couldn't get location", variant: "destructive" });
      }
    );
  };

  const handleSave = async () => {
    if (!user || !isDirty || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name || null,
        affiliation: form.affiliation || null,
        location: form.location || null,
        role: form.role,
        is_public: form.is_public,
        avatar_url: form.avatar_url,
        banner_url: form.banner_url,
      })
      .eq("user_id", user.id);

    if (error) {
      setSaving(false);
      toast({
        title: "Couldn't save profile",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    await refreshProfile();
    setSaving(false);
    toast({ title: "Profile updated" });
    navigate("/profile");
  };

  const handleCancel = () => {
    if (isDirty) {
      setConfirmCancel(true);
    } else {
      navigate("/profile");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 md:py-12 pb-40 md:pb-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <button
              onClick={handleCancel}
              className="-ml-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-display">Edit profile</h2>
          </div>

          {/* Banner + Avatar */}
          <section className="bg-background border border-border rounded-lg overflow-hidden mb-6">
            <div className="relative">
              <div
                className="w-full aspect-[5/2] sm:aspect-[3/1] bg-cover bg-center"
                style={bannerStyle}
              />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur px-3 py-1.5 text-xs font-body font-medium border border-border hover:bg-background transition-colors min-h-[36px]"
                disabled={uploading === "banner"}
              >
                {uploading === "banner" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                Banner
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload("banner", f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="px-4 sm:px-5 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-12">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-full bg-accent border-4 border-background overflow-hidden flex items-center justify-center">
                    {form.avatar_url ? (
                      <img
                        src={form.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                    aria-label="Change avatar"
                    disabled={uploading === "avatar"}
                  >
                    {uploading === "avatar" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload("avatar", f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground font-body sm:pb-2">
                  Square image works best for the avatar; a wide image works best for the banner.
                </p>
              </div>
            </div>
          </section>

          {/* Basic info */}
          <section className="bg-background border border-border rounded-lg p-5 mb-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name" className="font-body">Display name</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Your name"
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliation" className="font-body">Affiliation</Label>
              <Input
                id="affiliation"
                value={form.affiliation}
                onChange={(e) => setForm((f) => ({ ...f, affiliation: e.target.value }))}
                placeholder="School, organization, or community"
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="font-body">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="City, Country"
                  className="font-body flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseLocation}
                  disabled={locating}
                  className="shrink-0 font-body"
                >
                  {locating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline ml-1.5">Use current</span>
                </Button>
              </div>
            </div>
          </section>

          {/* Account settings */}
          <section className="bg-background border border-border rounded-lg p-5 mb-6 space-y-5">
            <div className="space-y-3">
              <Label className="font-body">Role</Label>
              <RadioGroup
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                {(["personal", "education", "community"] as AppRole[]).map((r) => (
                  <Label
                    key={r}
                    htmlFor={`role-${r}`}
                    className="flex items-center gap-2.5 px-3 py-3 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors font-body capitalize text-sm has-[:checked]:border-foreground has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem id={`role-${r}`} value={r} />
                    {r}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex items-start justify-between gap-4 pt-2 border-t border-border">
              <div className="flex-1 min-w-0">
                <Label htmlFor="is_public" className="font-body">Public profile</Label>
                <p className="text-xs text-muted-foreground font-body mt-1">
                  When on, others can see your name, affiliation, and debate history.
                </p>
              </div>
              <Switch
                id="is_public"
                checked={form.is_public}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
              />
            </div>
          </section>

          {/* Save / Cancel — sticky on mobile (above bottom nav), inline on md+ */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:static md:bottom-auto bg-background/95 backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-border -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              className="font-body min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="font-body min-w-[110px] min-h-[44px]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </motion.div>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/profile")}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default EditProfilePage;
