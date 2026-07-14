import { useState } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "@/components/server/data-table";
import { createFileRoute } from "@tanstack/react-router";
import { serverColumns, type ServerRow } from "@/components/server/columns";
import { ServerToolbar } from "@/components/server/server-toolbar";
import { DeleteServerDialog } from "@/components/server/delete-server-dialog";

const data: ServerRow[] = [
  {
    id: "server_1",
    name: "prod-web-1",
    address: "10.0.0.12",
    username: "deploy",
    sshPort: 22,
    privateKeyPath: "/home/deploy/.ssh/id_ed25519",
    passphrase: null,
    status: "success",
    isOnline: true,
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
  },
  {
    id: "server_2",
    name: "staging-api",
    address: "10.0.0.20",
    username: "deploy",
    sshPort: 22,
    privateKeyPath: "/home/deploy/.ssh/id_ed25519",
    passphrase: null,
    status: "initializing",
    isOnline: false,
    createdAt: new Date("2026-07-01T09:30:00Z"),
    updatedAt: new Date("2026-07-01T09:30:00Z"),
  },
  {
    id: "server_3",
    name: "db-replica-2",
    address: "10.0.0.31",
    username: "postgres",
    sshPort: 2222,
    privateKeyPath: "/home/deploy/.ssh/id_ed25519",
    passphrase: null,
    status: "failed",
    isOnline: false,
    createdAt: new Date("2026-05-15T14:20:00Z"),
    updatedAt: new Date("2026-07-10T08:05:00Z"),
  },
];

export const Route = createFileRoute("/server/")({
  component: ServerPage,
});

function ServerPage() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-2">
      <ServerToolbar
        selectedCount={selectedCount}
        onDeleteClick={() => setDeleteDialogOpen(true)}
      />
      <DataTable
        columns={serverColumns}
        data={data}
        getRowId={(row) => row.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
      <DeleteServerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selectedCount={selectedCount}
      />
    </div>
  );
}
