import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, UserPlus, Hash, MessageSquare } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowMutations } from "@/hooks/useConnections";
import { toast } from "sonner";

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  affiliation: string | null;
  is_public: boolean;
}

interface DebateRow {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [debates, setDebates] = useState<DebateRow[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { follow, unfollow } = useFollowMutations();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: pdata } = await (supabase as any).rpc("get_public_profile", { _user_id: userId });
      const p = (pdata && pdata[0]) || null;
      if (cancelled) return;
      setProfile(p);

      const { data: ddata } = await supabase
        .from("debates")
        .select("id, topic, status, created_at")
        .eq("created_by", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setDebates((ddata || []) as DebateRow[]);

      if (user) {
        const { data: edge } = await (supabase as any)
          .from("connections")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("followed_id", userId)
          .maybeSingle();
        if (!cancelled) setFollowing(!!edge);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, user]);

  const isMe = user?.id === userId;

  const handleFollow = async () => {
    if (!userId || !user) {
      navigate("/auth");
      return;
    }
    if (following) {
      const ok = await unfollow(userId);
      if (ok) {
        setFollowing(false);
        toast("Unfollowed");
      }
    } else {
      const ok = await follow(userId);
      if (ok) {
        setFollowing(true);
        toast.success("Following");
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {loading ? (
          <div className="animate-pulse h-32 bg-accent rounded-xl" />
        ) : !profile ? (
          <div className="text-center py-20 text-muted-foreground font-body">This profile is private or doesn't exist.</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {profile.banner_url && (
              <div
                className="h-32 rounded-xl bg-cover bg-center mb-4"
                style={{ backgroundImage: `url(${profile.banner_url})` }}
              />
            )}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-accent overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-body">
                    {(profile.display_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-display truncate">{profile.display_name || "Unknown"}</h1>
                {profile.affiliation && (
                  <p className="text-sm text-muted-foreground font-body">{profile.affiliation}</p>
                )}
              </div>
              {!isMe && (
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-md text-sm font-body inline-flex items-center gap-1.5 transition-colors ${
                    following
                      ? "border border-border text-foreground hover:border-foreground/30"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {following ? "Following" : "Follow"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-display text-lg">Public debates</h3>
            </div>
            {debates.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl px-5 py-8 text-center text-sm text-muted-foreground font-body">
                No public debates yet.
              </div>
            ) : (
              <div className="space-y-2">
                {debates.map((d) => (
                  <Link
                    key={d.id}
                    to={`/debate/${d.id}`}
                    className="block border border-border rounded-xl px-5 py-4 hover:border-foreground/20 transition-colors bg-background"
                  >
                    <p className="font-display text-sm">{d.topic}</p>
                    <p className="text-[11px] text-muted-foreground font-body mt-1">
                      {d.status} · {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default PublicProfilePage;
