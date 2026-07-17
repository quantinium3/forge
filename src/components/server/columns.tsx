import { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { type SelectServer } from "@electron/db/schema/server";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ServerRowActions } from "@/components/server/server-row-actions";

export type ServerRow = SelectServer & { isOnline: boolean };

const setupStatusTextColor: Record<SelectServer["status"], string> = {
  initializing: "text-yellow-500",
  failed: "text-red-500",
  success: "text-green-500",
};

function StatusDot({ className }: { className: string }) {
  return <span className={cn("size-2 rounded-full", className)} />;
}

export const serverColumns: ColumnDef<ServerRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "liveStatus",
    header: "",
    cell: ({ row }) => (
      <StatusDot className={row.original.isOnline ? "bg-green-500" : "bg-red-500"} />
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        to="/server/$id"
        params={{ id: row.original.id }}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    accessorKey: "sshPort",
    header: "Port",
  },
  {
    accessorKey: "status",
    header: "Setup",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={cn("capitalize", setupStatusTextColor[status])}>
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ServerRowActions server={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];
