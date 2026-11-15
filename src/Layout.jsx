import FulooziBrand from "@/components/FulooziBrand";
import { db } from "@/api/client";

import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { LayoutDashboard, List, MessageCircle, TrendingDown, Target, Settings, Receipt, Users, LogOut } from "lucide-react";
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
  { title: "Transactions", url: createPageUrl("Transactions"), icon: List },
  { title: "Bills", url: createPageUrl("Bills"), icon: Receipt },
  { title: "Budgets", url: createPageUrl("Budgets"), icon: TrendingDown },
  { title: "Goals", url: createPageUrl("Goals"), icon: Target },
  { title: "Family", url: createPageUrl("Family"), icon: Users },
  { title: "Assistant", url: createPageUrl("Assistant"), icon: MessageCircle },
  { title: "Notifications", url: createPageUrl("Settings"), icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border/80 bg-card">
          <SidebarHeader className="p-5 pb-3">
            <FulooziBrand />
          </SidebarHeader>

          <SidebarContent className="px-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const active = location.pathname.toLowerCase() === item.url || (location.pathname === "/" && item.title === "Dashboard");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`group h-10 rounded-xl mb-0.5 transition-colors duration-200 ${
                            active
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3">
                            <item.icon className={`w-[18px] h-[18px] transition-colors ${active ? 'text-primary' : ''}`} />
                            <span className="text-[13.5px] tracking-tight">{item.title}</span>
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
            <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 px-3 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-medium text-xs">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-[13px] truncate tracking-tight">User</p>
                <p className="text-[11px] text-muted-foreground truncate">Your finances</p>
              </div>
              <button
                onClick={() => db.auth.logout()}
                className="p-2 rounded-full hover:bg-card transition-colors duration-200"
                aria-label="Sign out" title="Sign out"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className={`min-w-0 flex-1 flex flex-col ${currentPageName === "Dashboard" ? "fuloozi-ledger-canvas" : ""}`}>
          <header className="sticky top-0 z-20 bg-card border-b border-border/70 px-4 py-3 md:hidden">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover:bg-secondary p-2 rounded-xl transition-colors duration-200" />
              <FulooziBrand />
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