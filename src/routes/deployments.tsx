import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import {
  AddDeploymentDialog,
  type DeploySubmission,
} from "@/components/deployment/add-deployment-dialog";
import { DeleteDeploymentDialog } from "@/components/deployment/delete-deployment-dialog";
import { pollOperation } from "@/lib/operations";
import type { Deployment, Operation } from "@electron/lib/kuznets";

export const Route = createFileRoute("/deployments")({
  loader: () => window.api.server.list(),
  component: DeploymentsPage,
});

function DeploymentsPage() {
  const servers = Route.useLoaderData().filter((server) => server.status === "success");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
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

  /**
   * kuznets only queues the work, so the image pull and container start happen
   * after the request returns. The toast tracks the operation to completion --
   * a terminal `failed` resolves rather than throws, so it is rethrown here to
   * surface the reason.
   */
  const track = async (
    operation: Operation,
    serverId: string,
    messages: { loading: string; success: string },
  ) => {
    const settle = async () => {
      const finished = await pollOperation(serverId, operation.id);
      await refresh(serverId);

      if (finished.status !== "succeeded") {
        throw new Error(finished.error ?? `operation ${finished.status}`);
      }
      return finished;
    };

    try {
      await toast
        .promise(settle(), {
          loading: messages.loading,
          success: messages.success,
          error: (err) => (err instanceof Error ? err.message : String(err)),
        })
        .unwrap();
    } catch {
      // surfaced via the toast above
    }
  };

  /**
   * Static deploys build and ship an image before anything is queued, which
   * takes minutes -- so one toast follows the whole thing, fed by the main
   * process's build output, then hands over to the operation poll.
   */
  const deployStatic = async (
    submission: Extract<DeploySubmission, { kind: "static" }>,
    serverId: string,
  ) => {
    const toastId = toast.loading(`Building ${submission.name}...`);

    const off = window.ipcEvents.on("deployment:progress", (_event, ...args) => {
      const update = args[0] as { name: string; message: string };
      if (update.name === submission.name) {
        toast.loading(update.message, { id: toastId });
      }
    });

    try {
      const operation = await window.api.deployment.deployStatic(serverId, {
        name: submission.name,
        assetsDir: submission.assetsDir,
        spaFallback: submission.spaFallback,
        hostPort: submission.hostPort,
        envPrefix: submission.envPrefix,
        restartPolicy: submission.restartPolicy,
      });

      const finished = await pollOperation(serverId, operation.id);
      await refresh(serverId);

      if (finished.status !== "succeeded") {
        throw new Error(finished.error ?? `deployment ${finished.status}`);
      }

      toast.success(`${submission.name} is running`, { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err), { id: toastId });
    } finally {
      off();
    }
  };

  const handleSubmit = (submission: DeploySubmission) => {
    if (!selectedServerId) return;

    if (submission.kind === "static") {
      void deployStatic(submission, selectedServerId);
      return;
    }

    void (async () => {
      try {
        const operation = await window.api.deployment.create(selectedServerId, {
          name: submission.name,
          image: submission.image,
          source: "registry",
          container_port: submission.containerPort,
          host_port: submission.hostPort,
          env_prefix: submission.envPrefix,
          restart_policy: submission.restartPolicy,
        });

        await track(operation, selectedServerId, {
          loading: `Deploying ${submission.name}...`,
          success: `${submission.name} is running`,
        });
      } catch (err) {
        toast.error("Failed to queue deployment", {
          description: err instanceof Error ? err.message : String(err),
          position: "bottom-right",
        });
      }
    })();
  };

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

        <Button disabled={!selectedServerId} onClick={() => setAddDialogOpen(true)}>
          <PlusIcon />
          New deployment
        </Button>
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

      <AddDeploymentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleSubmit}
      />

      <DeleteDeploymentDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!selectedServerId || !deleteTarget) return;
          const name = deleteTarget.name;
          try {
            const operation = await window.api.deployment.delete(selectedServerId, name);
            setDeleteTarget(null);
            await track(operation, selectedServerId, {
              loading: `Removing ${name}...`,
              success: `${name} removed`,
            });
          } catch (err) {
            toast.error("Failed to queue removal", {
              description: err instanceof Error ? err.message : String(err),
              position: "bottom-right",
            });
          }
        }}
      />
    </div>
  );
}
