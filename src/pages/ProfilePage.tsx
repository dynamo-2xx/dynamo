import { motion } from "framer-motion";
import { User, Shield, Globe, Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const ProfilePage = () => (
  <AppLayout>
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-display font-bold mb-8">Profile</h2>

        <div className="bg-card border border-border rounded-xl p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">Guest User</p>
            <p className="text-sm text-muted-foreground">Sign in to save your debates and build your profile</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <button className="w-full flex items-center gap-3 px-5 py-4 text-sm text-left hover:bg-secondary/50 transition-colors">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span>Role: <span className="text-foreground font-medium">Personal</span></span>
          </button>
          <button className="w-full flex items-center gap-3 px-5 py-4 text-sm text-left hover:bg-secondary/50 transition-colors">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span>Profile Visibility: <span className="text-foreground font-medium">Private</span></span>
          </button>
          <button className="w-full flex items-center gap-3 px-5 py-4 text-sm text-left hover:bg-secondary/50 transition-colors">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Sign in to access full settings</span>
          </button>
        </div>
      </motion.div>
    </div>
  </AppLayout>
);

export default ProfilePage;
