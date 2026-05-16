import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate(redirectTo || "/", { replace: true });
  }, [user, navigate, redirectTo]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !tosAccepted) {
      toast.error("Please accept the Terms and Privacy Policy to continue");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user) {
          await supabase
            .from("profiles")
            .update({ tos_accepted_at: new Date().toISOString(), tos_version: "2026-05-16" })
            .eq("user_id", data.user.id);
        }
        if (data.session) {
          navigate(redirectTo || "/onboarding");
        } else {
          toast.success("Check your email to verify your account!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirectTo || "/onboarding");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (mode === "signup" && !tosAccepted) {
      toast.error("Please accept the Terms and Privacy Policy to continue");
      return;
    }
    const safeRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : "";
    const target = `${window.location.origin}${safeRedirect}`;
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: target,
    });
    if (error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-primary mb-1">d.</h1>
          <p className="text-sm text-muted-foreground font-body">People to the Power</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-display font-semibold mb-5">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>

          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 text-sm font-medium hover:bg-secondary/50 transition-colors mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {mode === "login" ? "Sign In" : "Sign Up"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {mode === "signup" && (
            <label className="flex items-start gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                I agree to the{" "}
                <Link to="/terms" className="underline hover:text-foreground">Terms</Link>,{" "}
                <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>, and{" "}
                <Link to="/guidelines" className="underline hover:text-foreground">Community Guidelines</Link>.
              </span>
            </label>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          {mode === "login" && (
            <p className="text-[11px] text-muted-foreground text-center mt-6">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
