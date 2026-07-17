import { KeyRound, LayoutDashboard, Package, Server, Ship, Terminal } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Server",
    url: "/server",
    icon: Server,
  },
  {
    title: "Command Center",
    url: "/command-center",
    icon: Terminal,
  },
  {
    title: "Deployments",
    url: "/deployments",
    icon: Ship,
  },
  {
    title: "Packages",
    url: "/package",
    icon: Package,
  },
  {
    title: "Secrets",
    url: "/secrets",
    icon: KeyRound,
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-3 py-2 text-sm font-semibold">Forge</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={pathname === item.url}
                    render={<Link to={item.url} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
