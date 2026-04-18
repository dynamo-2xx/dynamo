import { ReactNode, useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { Home, Compass, PlusCircle, User, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import logoSmiley from "@/assets/logo-smiley.png";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/profile", icon: User, label: "Profile" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-background p-6 gap-2 fixed h-full transition-all duration-300 z-30",
          sidebarOpen ? "w-64" : "w-0 p-0 overflow-hidden border-r-0"
        )}
      >
        <div className="mb-8 flex items-center gap-3">
          <img src={logoSmiley} alt="d. logo" className="w-10 h-10 dark:invert" />
          <span className="font-body text-foreground text-sm font-medium tracking-[0.16em] uppercase">
            DYNAMO
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] transition-colors whitespace-nowrap font-body",
                  active
                    ? "text-foreground font-medium bg-accent border-l-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </RouterNavLink>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <p className="text-[11px] text-muted-foreground font-body">People to the Power</p>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <RouterNavLink
            to="/?highlight=actions"
            className="flex items-center justify-center gap-2 border border-border text-foreground rounded-lg py-3 font-body text-xs font-medium hover:bg-accent transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            Get Started
          </RouterNavLink>
        </div>
      </aside>

      {/* Reopen button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed top-4 left-4 z-40 min-w-[44px] min-h-[44px] items-center justify-center rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Open sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      {/* Main content */}
      <main className={cn("flex-1 pb-20 md:pb-0 transition-all duration-300", sidebarOpen ? "md:ml-64" : "md:ml-0")}>
        {children}
      </main>

      {/* Mobile bottom nav — fixed h-16, ≥44px tap targets */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex justify-around z-40 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-body transition-colors flex-1 min-h-[44px]",
                active ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </RouterNavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
