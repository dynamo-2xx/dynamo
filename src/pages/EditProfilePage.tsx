import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Loader2, MapPin, User as UserIcon, Trash2, Download, AlertCircle } from "lucide-react";
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
  const { user, session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [initial, setInitial] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [locating, setLocating] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);

  const pendingDeletion = (profile as any)?.deletion_status === "pending_review";
  const deletedAt = (profile as any)?.deleted_at as string | null | undefined;
  const daysLeft = deletedAt
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86_400_000))
    : null;

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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast({
        title: "Account scheduled for deletion",
        description: "You have 30 days to sign back in to cancel.",
      });
      navigate("/auth");
    } catch (err: any) {
      setDeleting(false);
      toast({
        title: "Couldn't delete account",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelDeletion = async () => {
    setCancellingDeletion(true);
    const { error } = await supabase.rpc("cancel_account_deletion");
    setCancellingDeletion(false);
    if (error) {
      toast({ title: "Couldn't cancel deletion", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Deletion cancelled", description: "Your account is active again." });
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-account-data`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (res.status === 429) {
        const body = await res.json();
        toast({ title: "Rate limited", description: body.message ?? "Try again later.", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Export failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dynamo-export-${user?.id ?? "me"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: "Export ready", description: "Your data download has started." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setExporting(false);
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
                  When on, your activity shows up in search and recommendations. Your profile card
                  (name, avatar, banner, affiliation) is always visible.
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

          {/* Legal links */}
          <div className="mt-8 flex items-center justify-center gap-4 text-[11px] font-body text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>

          {pendingDeletion && (
            <section className="mt-8 border border-destructive/40 rounded-lg p-5 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-display text-base mb-1 text-destructive">
                    Account scheduled for deletion
                  </h3>
                  <p className="text-xs text-muted-foreground font-body mb-3">
                    {daysLeft != null && daysLeft > 0
                      ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to recover. After that, your profile will be anonymized and your DMs deleted.`
                      : "Anonymization is imminent. Cancel now to keep your account."}
                  </p>
                  <Button
                    type="button"
                    onClick={handleCancelDeletion}
                    disabled={cancellingDeletion}
                    className="font-body min-h-[40px]"
                  >
                    {cancellingDeletion ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel deletion"}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Data export */}
          <section className="mt-8 border border-border rounded-lg p-5">
            <h3 className="font-display text-base mb-1">Download my data</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Get a JSON file with your profile, debates you created, live sessions you hosted,
              your DMs, participations, and grades. Limited to one export per 7 days.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportData}
              disabled={exporting}
              className="font-body min-h-[40px]"
            >
              {exporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              Download my data
            </Button>
          </section>

          {/* Danger zone */}
          <section className="mt-8 border border-destructive/30 rounded-lg p-5">
            <h3 className="font-display text-base mb-1 text-destructive">Delete account</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Schedules your account for deletion. You have 30 days to sign back in and cancel.
              After 30 days your profile is anonymized to "Former user" and your DMs are deleted;
              your debates and live sessions are kept for the public record.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setConfirmDelete(true); setDeleteConfirmText(""); }}
              disabled={pendingDeletion}
              className="font-body border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {pendingDeletion ? "Deletion pending" : "Delete my account"}
            </Button>
          </section>
        </motion.div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(o) => { setConfirmDelete(o); if (!o) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule account deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be signed out immediately. You have <span className="font-semibold text-foreground">30 days</span> to sign back in and cancel.
              After that, your profile is anonymized and DMs are deleted; debates and live sessions you created remain public.
              Type <span className="font-semibold text-foreground">DELETE</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="font-body"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
