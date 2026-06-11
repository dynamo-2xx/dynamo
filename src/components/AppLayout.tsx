import { ReactNode, useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { Home, Compass, PlusCircle, User, MessageCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import logoSmiley from "@/assets/logo-smiley.png";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadDMCount } from "@/hooks/useDirectMessages";
import { FloatingDMProvider } from "@/contexts/FloatingDMContext";
import FloatingDMWindow from "@/components/messages/FloatingDMWindow";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import MySanctionBanner from "@/components/sanctions/MySanctionBanner";
import QueuedSessionStrip from "@/components/QueuedSessionStrip";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/messages", icon: MessageCircle, label: "Messages" },
];

const comingSoonItem = { icon: Users, label: "Clubs" };

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const unread = useUnreadDMCount();

  return (
    <FloatingDMProvider>
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop translucent nav bubble */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-3 left-3 bottom-3 z-30 transition-all duration-300",
          "bg-background/70 backdrop-blur-xl border border-border/60 shadow-lg rounded-2xl",
          "p-5 gap-2 overflow-hidden",
          sidebarOpen ? "w-60 opacity-100" : "w-0 p-0 border-0 opacity-0 pointer-events-none",
        )}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="mb-6 flex items-center gap-3 group text-left"
          title="Minimize navigation"
        >
          <img src={logoSmiley} alt="D. logo" className="w-9 h-9 dark:invert transition-transform group-hover:scale-105" />
          <span className="font-body text-foreground text-sm font-medium tracking-[0.16em] uppercase">
            D.
          </span>
        </button>
        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to || (item.to === "/messages" && location.pathname.startsWith("/messages"));
            const showBadge = item.to === "/messages" && unread > 0;
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-colors whitespace-nowrap font-body",
                  active
                    ? "text-foreground font-medium bg-foreground/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-medium flex items-center justify-center">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </RouterNavLink>
            );
          })}
          {/* Clubs — Coming Soon */}
          <div className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] whitespace-nowrap font-body text-muted-foreground cursor-not-allowed select-none">
            <comingSoonItem.icon className="w-5 h-5 opacity-50" />
            <span className="flex-1 opacity-50">{comingSoonItem.label}</span>
            <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Coming soon
            </span>
          </div>
        </nav>
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between">
            <ThemeToggle />
          </div>
          <RouterNavLink
            to={user ? "/?highlight=actions" : "/auth"}
            className="flex items-center justify-center gap-2 border border-border/60 text-foreground rounded-xl py-2.5 font-body text-xs font-medium hover:bg-foreground/5 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            Get Started
          </RouterNavLink>
        </div>
      </aside>

      {/* Floating logo button when sidebar is collapsed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed top-3 left-3 sm:top-4 sm:left-4 z-40 w-11 h-11 items-center justify-center rounded-full bg-background/70 backdrop-blur-xl border border-border/60 shadow-sm hover:bg-background/90 transition-colors"
          title="Open navigation"
        >
          <img src={logoSmiley} alt="D. logo" className="w-6 h-6 dark:invert" />
        </button>
      )}

      {/* Main content */}
      <main className={cn("flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0 transition-all duration-300", sidebarOpen ? "md:ml-[16rem]" : "md:ml-0")}>
        <VerifyEmailBanner />
        <MySanctionBanner />
        {children}
      </main>

      {/* Mobile bottom nav — fixed h-16, ≥44px tap targets */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex justify-around z-40 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = location.pathname === item.to || (item.to === "/messages" && location.pathname.startsWith("/messages"));
          const showBadge = item.to === "/messages" && unread > 0;
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-body transition-colors flex-1 min-h-[44px]",
                active ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {showBadge && (
                <span className="absolute top-1 right-[28%] min-w-[16px] h-[16px] px-1 rounded-full bg-foreground text-background text-[9px] font-medium flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </RouterNavLink>
          );
        })}
        {/* Clubs — Coming Soon */}
        <div className="group relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-body text-muted-foreground flex-1 min-h-[44px] cursor-not-allowed select-none">
          <comingSoonItem.icon className="w-5 h-5 opacity-50" />
          <span className="opacity-50">{comingSoonItem.label}</span>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium opacity-0 group-active:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Coming soon
          </span>
        </div>
      </nav>
      <FloatingDMWindow />
      <QueuedSessionStrip />
    </div>
    </FloatingDMProvider>
  );
};

export default AppLayout;
