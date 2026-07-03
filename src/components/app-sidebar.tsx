import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Plus, Search, User, Briefcase, LogOut, MapPin, HardHat, Settings,
  Star, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type Role = "customer" | "worker" | "admin" | null;

const customerNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/post-job", label: "Post a Job", icon: Plus },
  { to: "/workers", label: "Find Workers", icon: Search },
  { to: "/profile", label: "My Profile", icon: User },
];

const workerNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard", label: "Jobs Feed", icon: Briefcase, search: { tab: "feed" as const } },
  { to: "/dashboard", label: "My Offers", icon: Wallet, search: { tab: "offers" as const } },
  { to: "/dashboard", label: "Reviews", icon: Star, search: { tab: "reviews" as const } },
  { to: "/profile", label: "My Profile", icon: User },
];

export function AppSidebar() {
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).limit(1);
      const r = roles?.[0]?.role;
      if (r === "customer" || r === "worker" || r === "admin") setRole(r);
    })();
  }, []);

  const items = role === "worker" ? workerNav : customerNav;

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <span className="brand-gradient grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white">
            <MapPin className="h-4 w-4" strokeWidth={2.5} />
          </span>
          {!collapsed && (
            <span className="font-display text-sm font-bold leading-tight text-ink">
              Local Work<br /><span className="text-primary">Network</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role === "worker" ? "Worker" : "Customer"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.to;
                return (
                  <SidebarMenuItem key={`${item.to}-${item.label}`}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "worker" && (
          <SidebarGroup>
            <SidebarGroupLabel>Grow</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Onboarding">
                    <Link to="/onboarding" className="flex items-center gap-2">
                      <HardHat className="h-4 w-4" />
                      {!collapsed && <span>Onboarding</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className={collapsed ? "flex flex-col gap-1" : "flex flex-col gap-2 p-2"}>
          {!collapsed && (
            <Button asChild size="sm" variant="ghost" className="justify-start">
              <Link to="/"><Settings className="h-4 w-4" /> Public site</Link>
            </Button>
          )}
          <Button onClick={signOut} size="sm" variant="outline" className={collapsed ? "" : "justify-start"}>
            <LogOut className="h-4 w-4" /> {!collapsed && "Sign out"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
