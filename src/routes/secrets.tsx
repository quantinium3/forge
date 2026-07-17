import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRoundIcon, PlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { DataTable } from "@/components/data-table";
import { getSecretColumns, type SecretEntry } from "@/components/secret/columns";
import { AddSecretDialog } from "@/components/secret/add-secret-dialog";
import { DeleteSecretDialog } from "@/components/secret/delete-secret-dialog";

export const Route = createFileRoute("/secrets")({
  loader: () => window.api.server.list(),
  component: SecretsPage,
});

function SecretsPage() {
  const servers = Route.useLoaderData().filter((server) => server.status === "success");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SecretEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SecretEntry | null>(null);

  const refresh = async (serverId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [secrets, variables] = await Promise.all([
        window.api.secret.list(serverId),
        window.api.variable.list(serverId),
      ]);
      const rows: SecretEntry[] = [
        ...secrets.map((secret) => ({ kind: "secret" as const, ...secret })),
        ...variables.map((variable) => ({ kind: "variable" as const, ...variable })),
      ].sort((a, b) => a.key.localeCompare(b.key));
      setEntries(rows);
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

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => `/${entry.key}`.toLowerCase().includes(query));
  }, [entries, search]);

  const columns = useMemo(
    () =>
      selectedServerId
        ? getSecretColumns(selectedServerId, (entry) => setDeleteTarget(entry))
        : [],
    [selectedServerId],
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

          <InputGroup className="w-72">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by name or /project/name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!selectedServerId}
            />
          </InputGroup>
        </div>

        <Button disabled={!selectedServerId} onClick={() => setAddDialogOpen(true)}>
          <PlusIcon />
          Add entry
        </Button>
      </div>

      {!selectedServerId ? (
        <Empty className="h-full">
          <EmptyMedia variant="icon">
            <KeyRoundIcon />
          </EmptyMedia>
          <EmptyTitle>No server selected</EmptyTitle>
          <EmptyDescription>
            {servers.length === 0
              ? "No provisioned servers available yet."
              : "Pick a server above to manage its secrets."}
          </EmptyDescription>
        </Empty>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading secrets...</p>
      ) : (
        <DataTable columns={columns} data={filteredEntries} getRowId={(row) => row.key} />
      )}

      {selectedServerId && (
        <AddSecretDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          serverId={selectedServerId}
          onCreated={() => void refresh(selectedServerId)}
        />
      )}

      <DeleteSecretDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!selectedServerId || !deleteTarget) return;
          try {
            if (deleteTarget.kind === "secret") {
              await window.api.secret.delete(selectedServerId, deleteTarget.key);
            } else {
              await window.api.variable.delete(selectedServerId, deleteTarget.key);
            }
            setDeleteTarget(null);
            await refresh(selectedServerId);
          } catch (err) {
            toast.error(`Failed to delete ${deleteTarget.kind}`, {
              description: err instanceof Error ? err.message : String(err),
              position: "bottom-right",
            });
          }
        }}
      />
    </div>
  );
}
