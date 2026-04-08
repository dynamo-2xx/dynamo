import { motion } from "framer-motion";
import { User, Shield, Globe, Lock, LogOut, MessageSquare, Bell, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const roleLabels = { personal: "Personal", education: "Education", community: "Community" } as const;

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-display mb-8">Profile</h2>

          <div className="bg-background border border-border rounded-lg p-6 mb-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <User className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-body text-lg font-medium">{profile?.display_name || user?.email}</p>
              <p className="text-sm text-muted-foreground font-body">{user?.email}</p>
              {profile?.affiliation && (
                <p className="text-[11px] text-muted-foreground mt-0.5 font-body">{profile.affiliation}</p>
              )}
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg divide-y divide-border mb-6">
            <div className="flex items-center gap-3 px-5 py-4 text-sm font-body">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span>Role: <span className="text-foreground font-medium">{roleLabels[profile?.role ?? "personal"]}</span></span>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 text-sm font-body">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span>Profile Visibility: <span className="text-foreground font-medium">{profile?.is_public ? "Public" : "Private"}</span></span>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 text-sm font-body">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span>Location: <span className="text-foreground font-medium">{profile?.location || "Not set"}</span></span>
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg divide-y divide-border mb-6">
            <Link
              to="/my-debates"
              className="flex items-center gap-3 px-5 py-4 text-sm font-body font-medium hover:bg-accent transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">My Agenda</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/notifications"
              className="flex items-center gap-3 px-5 py-4 text-sm font-body font-medium hover:bg-accent transition-colors"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">Inbox</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 border border-destructive/30 text-destructive rounded-lg py-3 text-sm font-body font-medium hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
