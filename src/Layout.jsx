import FulooziBrand from "@/components/FulooziBrand";
import { db } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Target,
  Users,
  Sparkles,
  Settings,
  LogOut,
  ArrowLeftRight,
  Bell,
} from "lucide-react";
import { getNotificationPermission } from "@/utils/notifications";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Transactions", url: createPageUrl("Transactions"), icon: ArrowLeftRight },
  { title: "Bills", url: createPageUrl("Bills"), icon: Receipt },
  { title: "Budgets", url: createPageUrl("Budgets"), icon: PiggyBank },
  { title: "Goals", url: createPageUrl("Goals"), icon: Target },
  { title: "Family", url: createPageUrl("Family"), icon: Users },
  { title: "Assistant", url: createPageUrl("Assistant"), icon: Sparkles, badge: "AI" },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const session = useAuth();
  const user = session?.user;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.username || "Household Owner";
  const username = user?.user_metadata?.username ? `@${user.user_metadata.username}` : "@ledger";
  const userInitial = (displayName[0] || "F").toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground antialiased">
        <Sidebar className="border-r border-border/80 bg-sidebar">
          <SidebarHeader className="p-5 pb-4">
            <Link to="/" className="flex items-center">
              <FulooziBrand size={34} />
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {navigationItems.map((item) => {
                    const active =
                      location.pathname.toLowerCase() === item.url.toLowerCase() ||
                      (location.pathname === "/" && item.title === "Dashboard");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`group h-11 rounded-xl transition-all duration-150 ${
                            active
                              ? 'bg-[#B5F13E]/12 text-[#B5F13E] font-medium border border-[#B5F13E]/20'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center justify-between px-3 w-full">
                            <div className="flex items-center gap-3">
                              <item.icon
                                className={`w-4 h-4 transition-colors ${
                                  active ? 'text-[#B5F13E]' : 'text-muted-foreground group-hover:text-foreground'
                                }`}
                              />
                              <span className="text-[14px] tracking-tight">{item.title}</span>
                            </div>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#B5F13E]/20 text-[#B5F13E] uppercase tracking-wider">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="flex items-center gap-3 rounded-xl bg-secondary/50 border border-border/60 p-2.5">
              <div className="relative w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                <span className="text-foreground font-semibold text-xs">{userInitial}</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#B5F13E] ring-2 ring-background" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-xs truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">{username}</p>
              </div>
              <button
                onClick={() => db.auth.logout()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="min-w-0 flex-1 flex flex-col bg-background">
          <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/70 px-4 py-3 md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="hover:bg-secondary p-2 rounded-lg transition-colors" />
                <FulooziBrand size={30} />
              </div>
              <Link
                to="/settings"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors relative"
                aria-label="Alerts and Settings"
                title="Alerts and Settings"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B5F13E]" />
              </Link>
            </div>
          </header>

          <div className="min-w-0 flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
