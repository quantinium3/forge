import { ColumnDef } from "@tanstack/react-table";
import { ExternalLinkIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";
import type { Deployment, DeploymentStatus } from "@electron/lib/kuznets";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusColor: Record<DeploymentStatus, string> = {
  running: "bg-green-500",
  pending: "bg-yellow-500",
  stopped: "bg-muted-foreground",
  failed: "bg-red-500",
};

function StatusCell({ deployment }: { deployment: Deployment }) {
  const label = (
    <span className="flex items-center gap-2 capitalize">
      <span className={cn("size-2 rounded-full", statusColor[deployment.status])} />
      {deployment.status}
    </span>
  );

  // The failure reason is the whole story when a deploy breaks, and it is the
  // only place it surfaces until we have container logs.
  if (deployment.status !== "failed" || !deployment.last_error) return label;

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help">{label}</TooltipTrigger>
      <TooltipContent className="max-w-sm">{deployment.last_error}</TooltipContent>
    </Tooltip>
  );
}

export function getDeploymentColumns(
  serverAddress: string,
  onDeleteRequest: (deployment: Deployment) => void,
): ColumnDef<Deployment>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "image",
      header: "Image",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{row.original.image}</span>
          {row.original.source === "imported" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              built locally
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusCell deployment={row.original} />,
    },
    {
      id: "url",
      header: "Address",
      cell: ({ row }) => {
        const { host_port, container_port } = row.original;

        if (host_port === null) {
          return (
            <span className="text-sm text-muted-foreground">
              {container_port === null ? "—" : "not published"}
            </span>
          );
        }

        const url = `http://${serverAddress}:${host_port}`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm hover:underline"
          >
            {url}
            <ExternalLinkIcon className="size-3" />
          </a>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => new Date(row.original.updated_at * 1000).toLocaleString(),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteRequest(row.original)}
            >
              <TrashIcon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
