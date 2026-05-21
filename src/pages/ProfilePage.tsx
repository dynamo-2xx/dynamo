import { motion } from "framer-motion";
import { User, Shield, Globe, Lock, LogOut, MessageSquare, Bell, ChevronRight, Pencil, Users, Hash, BookOpen, NotebookPen } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProfileIdCard from "@/components/profile/ProfileIdCard";

const roleLabels = { personal: "Personal", education: "Education", community: "Community" } as const;

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [publishedTakes, setPublishedTakes] = useState<
    { id: string; session_id: string; my_take: string | null; published_at: string | null; session_title?: string | null }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("session_notebooks" as any)
        .select("id, session_id, my_take, published_at")
        .eq("user_id", user.id)
        .eq("published", true)
        .order("published_at", { ascending: false });
      const list = (data || []) as any[];
      // Hydrate session titles in one pass.
      const sessionIds = Array.from(new Set(list.map((r) => r.session_id)));
      let titles: Record<string, string> = {};
      if (sessionIds.length > 0) {
        const { data: sessions } = await supabase
          .from("live_sessions" as any)
          .select("id, title")
          .in("id", sessionIds);
        for (const s of (sessions || []) as any[]) titles[s.id] = s.title;
      }
      setPublishedTakes(
        list.map((r) => ({ ...r, session_title: titles[r.session_id] || "Untitled session" })),
      );
    })();
  }, [user]);

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

          <div className="mb-6">
            <ProfileIdCard variant="display" />
          </div>

          {/* Activity */}
          <div className="bg-background border border-border rounded-lg divide-y divide-border mb-6">
            <Link
              to="/my-study"
              className="flex items-center gap-3 px-5 py-4 text-sm font-body font-medium hover:bg-accent transition-colors"
            >
              <NotebookPen className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">My Study</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
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

          {/* Published Takes */}
          {publishedTakes.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-display">Published Takes</h3>
              </div>
              <div className="space-y-3">
                {publishedTakes.map((t) => (
                  <article
                    key={t.id}
                    className="border border-border rounded-lg p-4 bg-background"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <h4 className="font-display text-sm truncate">{t.session_title}</h4>
                      {t.published_at && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(t.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/85 font-body whitespace-pre-wrap line-clamp-6">
                      {t.my_take || ""}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
