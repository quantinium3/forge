import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon, RefreshCwIcon, ShipIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { DataTable } from "@/components/data-table";
import { getDeploymentColumns } from "@/components/deployment/columns";
import { DeleteDeploymentDialog } from "@/components/deployment/delete-deployment-dialog";
import { pollOperation } from "@/lib/operations";
import type { Deployment } from "@electron/lib/kuznets";

export const Route = createFileRoute("/deployments/")({
  loader: () => window.api.server.list(),
  component: DeploymentsPage,
});

function DeploymentsPage() {
  const servers = Route.useLoaderData().filter((server) => server.status === "success");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deployment | null>(null);

  const selectedServer = servers.find((server) => server.id === selectedServerId);

  const refresh = async (serverId: string) => {
    setLoading(true);
    setError(null);
    try {
      setDeployments(await window.api.deployment.list(serverId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedServerId) return;
    void refresh(selectedServerId);
  }, [selectedServerId]);

  const columns = useMemo(
    () =>
      selectedServer
        ? getDeploymentColumns(selectedServer.address, (deployment) =>
            setDeleteTarget(deployment),
          )
        : [],
    [selectedServer],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
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

          <Button
            variant="outline"
            size="icon"
            disabled={!selectedServerId || loading}
            onClick={() => selectedServerId && void refresh(selectedServerId)}
            aria-label="Refresh deployments"
          >
            <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
          </Button>
        </div>

        {selectedServerId ? (
          <Button render={<Link to="/deployments/new" search={{ serverId: selectedServerId }} />}>
            <PlusIcon />
            New deployment
          </Button>
        ) : (
          <Button disabled>
            <PlusIcon />
            New deployment
          </Button>
        )}
      </div>

      {!selectedServerId ? (
        <Empty className="h-full">
          <EmptyMedia variant="icon">
            <ShipIcon />
          </EmptyMedia>
          <EmptyTitle>No server selected</EmptyTitle>
          <EmptyDescription>
            {servers.length === 0
              ? "No provisioned servers available yet."
              : "Pick a server above to manage its deployments."}
          </EmptyDescription>
        </Empty>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading deployments...</p>
      ) : (
        <DataTable columns={columns} data={deployments} getRowId={(row) => row.name} />
      )}

      <DeleteDeploymentDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!selectedServerId || !deleteTarget) return;
          const name = deleteTarget.name;

          const settle = async () => {
            const operation = await window.api.deployment.delete(selectedServerId, name);
            const finished = await pollOperation(selectedServerId, operation.id);
            await refresh(selectedServerId);

            // A terminal `failed` resolves rather than throws, so the reason has
            // to be rethrown to reach the toast.
            if (finished.status !== "succeeded") {
              throw new Error(finished.error ?? `removal ${finished.status}`);
            }
          };

          setDeleteTarget(null);
          try {
            await toast
              .promise(settle(), {
                loading: `Removing ${name}...`,
                success: `${name} removed`,
                error: (err) => (err instanceof Error ? err.message : String(err)),
              })
              .unwrap();
          } catch {
            // surfaced via the toast above
          }
        }}
      />
    </div>
  );
}
