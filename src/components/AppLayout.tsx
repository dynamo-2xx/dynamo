import { ReactNode, useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { Home, Compass, PlusCircle, User, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import logoSmiley from "@/assets/logo-smiley.png";

const navItems = [
{ to: "/", icon: Home, label: "Home" },
{ to: "/explore", icon: Compass, label: "Explore" },
{ to: "/create", icon: PlusCircle, label: "Create" },
{ to: "/profile", icon: User, label: "Profile" }];


const AppLayout = ({ children }: {children: ReactNode;}) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card p-6 gap-2 fixed h-full transition-all duration-300 z-30",
          sidebarOpen ? "w-64" : "w-0 p-0 overflow-hidden border-r-0"
        )}
      >
        <div className="mb-8 flex items-center gap-3">
          <img src={logoSmiley} alt="d. logo" className="w-10 h-10 dark:invert" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">dynamo</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-body">People to the Power</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <RouterNavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  active ?
                  "bg-primary/10 text-primary" :
                  "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}>
                
                <item.icon className="w-5 h-5" />
                {item.label}
              </RouterNavLink>);

          })}
        </nav>
        <div className="flex items-center justify-between mb-2">
          <ThemeToggle />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        <RouterNavLink
          to="/create"
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
          
          <PlusCircle className="w-4 h-4" />
          Get Started
        </RouterNavLink>
      </aside>

      {/* Reopen button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Open sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      {/* Main content */}
      <main className={cn("flex-1 pb-20 md:pb-0 transition-all duration-300", sidebarOpen ? "md:ml-64" : "md:ml-0")}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-40">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          const isCreate = item.to === "/create";
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors p-1",
                isCreate ?
                "text-primary" :
                active ?
                "text-primary" :
                "text-muted-foreground"
              )}>
              
              <item.icon className={cn("w-5 h-5", isCreate && "w-7 h-7")} />
              {!isCreate && <span>{item.label}</span>}
            </RouterNavLink>);

        })}
      </nav>
    </div>);

};

export default AppLayout;