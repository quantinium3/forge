import { useEffect, useState } from "react";
import { RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { serverColumns, type ServerRow } from "@/components/server/columns";
import { ServerToolbar } from "@/components/server/server-toolbar";
import { DeleteServerDialog } from "@/components/server/delete-server-dialog";

export const Route = createFileRoute("/server/")({
  loader: () => window.api.server.list(),
  component: ServerPage,
});

function ServerPage() {
  const servers = Route.useLoaderData();
  const router = useRouter();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    return window.ipcEvents.on("server:status-changed", () => {
      router.invalidate();
    });
  }, [router]);

  const data: ServerRow[] = servers.map((server) => ({
    ...server,
    isOnline: false,
  }));
  const selectedIds = Object.keys(rowSelection);
  const selectedCount = selectedIds.length;

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
        onConfirm={async () => {
          await window.api.server.delete(selectedIds);
          setRowSelection({});
          setDeleteDialogOpen(false);
          router.invalidate();
        }}
      />
    </div>
  );
}
