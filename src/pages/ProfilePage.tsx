import { motion } from "framer-motion";
import { User, Shield, Globe, Lock, LogOut, MessageSquare, Bell, ChevronRight, Pencil, Users, Hash } from "lucide-react";
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
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
            <h2 className="text-xl sm:text-2xl font-display">Profile</h2>
            <Link
              to="/profile/edit"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-body font-medium border border-border rounded-md hover:bg-accent transition-colors min-h-[36px]"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
          </div>

          <div className="bg-background border border-border rounded-lg p-4 sm:p-6 mb-6 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-body text-base sm:text-lg font-medium truncate">{profile?.display_name || user?.email}</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-body truncate">{user?.email}</p>
              {profile?.affiliation && (
                <p className="text-[11px] text-muted-foreground mt-0.5 font-body truncate">{profile.affiliation}</p>
              )}
            </div>
          </div>

          {/* Activity */}
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
              to="/profile/connections"
              className="flex items-center gap-3 px-5 py-4 text-sm font-body font-medium hover:bg-accent transition-colors"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">Connections</span>
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

          {/* Account */}
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

          {/* Admin */}
          {profile?.role === "admin" && (
            <div className="bg-background border border-border rounded-lg mb-6">
              <Link
                to="/admin/tags"
                className="flex items-center gap-3 px-5 py-4 text-sm font-body font-medium hover:bg-accent transition-colors"
              >
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1">Tag Console</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          )}

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
