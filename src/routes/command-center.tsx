import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TerminalIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { TerminalView } from "@/components/command-center/terminal-view";

export const Route = createFileRoute("/command-center")({
  loader: () => window.api.server.list(),
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const servers = Route.useLoaderData().filter((server) => server.status === "success");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select value={selectedServerId} onValueChange={setSelectedServerId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a server">
              {(value: string | null) =>
                servers.find((server) => server.id === value)?.name ?? "Select a server"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {servers.map((server) => (
              <SelectItem key={server.id} value={server.id}>
                {server.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-[#0a0a0a] p-2">
        {selectedServerId ? (
          <TerminalView key={selectedServerId} serverId={selectedServerId} />
        ) : (
          <Empty className="h-full">
            <EmptyMedia variant="icon">
              <TerminalIcon />
            </EmptyMedia>
            <EmptyTitle>No server selected</EmptyTitle>
            <EmptyDescription>
              {servers.length === 0
                ? "No provisioned servers available yet."
                : "Pick a server above to open a shell."}
            </EmptyDescription>
          </Empty>
        )}
      </div>
    </div>
  );
}
