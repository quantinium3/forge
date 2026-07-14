import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const RootLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header className="flex h-12 shrink-0 items-center border-b px-2">
        <SidebarTrigger />
      </header>
      <div className="flex-1 p-2">
        <Outlet />
      </div>
    </SidebarInset>
    <Toaster />
    <TanStackRouterDevtools />
  </SidebarProvider>
);

export const Route = createRootRoute({ component: RootLayout });
