import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontalIcon, TrashIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SecretValueCell } from "@/components/secret/secret-value-cell";
import { VariableValueCell } from "@/components/secret/variable-value-cell";

export type SecretEntry =
  | { kind: "secret"; key: string; created_at: number; updated_at: number }
  | { kind: "variable"; key: string; value: string; created_at: number; updated_at: number };

function EntryPath({ entryKey }: { entryKey: string }) {
  const segments = entryKey.split("/");
  const name = segments.pop()!;
  const project = segments.join("/");

  return (
    <span className="font-mono text-sm">
      <span className="text-muted-foreground">/{project ? `${project}/` : ""}</span>
      <span className="font-medium">{name}</span>
    </span>
  );
}

export function getSecretColumns(
  serverId: string,
  onDeleteRequest: (entry: SecretEntry) => void,
): ColumnDef<SecretEntry>[] {
  return [
    {
      accessorKey: "key",
      header: "Path",
      cell: ({ row }) => <EntryPath entryKey={row.original.key} />,
    },
    {
      id: "kind",
      header: "Type",
      cell: ({ row }) => (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            row.original.kind === "secret"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {row.original.kind === "secret" ? "Secret" : "String"}
        </span>
      ),
    },
    {
      id: "value",
      header: "Value",
      cell: ({ row }) =>
        row.original.kind === "secret" ? (
          <SecretValueCell serverId={serverId} secretKey={row.original.key} />
        ) : (
          <VariableValueCell value={row.original.value} />
        ),
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
