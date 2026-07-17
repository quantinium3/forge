import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SysinfoPanel } from "@/components/server/sysinfo-panel";
import { cn } from "@/lib/utils";
import type { SelectServer } from "@electron/db/schema/server";

const setupStatusTextColor: Record<SelectServer["status"], string> = {
  initializing: "text-yellow-500",
  failed: "text-red-500",
  success: "text-green-500",
};

export const Route = createFileRoute("/server/$id")({
  loader: async ({ params }) => {
    const server = await window.api.server.get(params.id);
    if (!server) throw notFound();
    return server;
  },
  component: ServerDetailPage,
});

function ServerDetailPage() {
  const server = Route.useLoaderData();

  return (
    <div className="space-y-4 p-2">
      <Button variant="outline" size="sm" render={<Link to="/server" />}>
        <ArrowLeftIcon />
        Back to servers
      </Button>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{server.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address</span>
            <span>{server.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username</span>
            <span>{server.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Port</span>
            <span>{server.sshPort}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={cn("capitalize", setupStatusTextColor[server.status])}>
              {server.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(server.createdAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {server.status === "success" && <SysinfoPanel serverId={server.id} />}
    </div>
  );
}
