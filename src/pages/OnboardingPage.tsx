import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, GraduationCap, Users, MapPin, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roles: { value: AppRole; label: string; desc: string; icon: typeof User }[] = [
  { value: "personal", label: "Personal", desc: "Sharpen your thinking with structured debates", icon: User },
  { value: "education", label: "Education", desc: "Classroom debates and academic discourse", icon: GraduationCap },
  { value: "community", label: "Community", desc: "Town halls and civic discussions", icon: Users },
];

const OnboardingPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<AppRole>("personal");
  const [displayName, setDisplayName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLocationRequest = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          // Store rough location text — could reverse geocode later
          await supabase
            .from("profiles")
            .update({ location: `${pos.coords.latitude.toFixed(2)},${pos.coords.longitude.toFixed(2)}` })
            .eq("user_id", user!.id);
          setStep(3);
        },
        () => setStep(3) // denied — skip
      );
    } else {
      setStep(3);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        role: selectedRole,
        display_name: displayName || undefined,
        affiliation: affiliation || undefined,
        is_public: isPublic,
      })
      .eq("user_id", user!.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      await refreshProfile();
      navigate("/");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-display font-bold">Welcome to Dynamo</h1>
          <p className="text-sm text-muted-foreground mt-1">Let's set up your profile</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-lg font-display font-semibold mb-4">How will you use Dynamo?</h2>
              <div className="space-y-3 mb-6">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRole(r.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left ${
                      selectedRole === r.value
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedRole === r.value ? "bg-primary/20" : "bg-secondary"}`}>
                      <r.icon className={`w-5 h-5 ${selectedRole === r.value ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                    {selectedRole === r.value && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold text-sm"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-display font-semibold mb-1">Enable location</h2>
                <p className="text-sm text-muted-foreground">
                  Help us connect you with local community and legislative debates near you.
                </p>
              </div>
              <button
                onClick={handleLocationRequest}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold text-sm mb-3"
              >
                Allow Location
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-lg font-display font-semibold mb-4">Your profile</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How others will see you"
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                {selectedRole !== "personal" && (
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
                      {selectedRole === "education" ? "School / University" : "Organization"}
                    </label>
                    <input
                      value={affiliation}
                      onChange={(e) => setAffiliation(e.target.value)}
                      placeholder={selectedRole === "education" ? "e.g. Lincoln High School" : "e.g. Portland Community Council"}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${isPublic ? "bg-primary" : "bg-border"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${isPublic ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Public profile</p>
                    <p className="text-xs text-muted-foreground">Others can see your debate history</p>
                  </div>
                </label>
              </div>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Get Started"} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
