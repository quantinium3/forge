import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LockIcon, PlusIcon, ShieldIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FieldDescription } from "@/components/ui/field";
import type { FirewallProtocol, FirewallState } from "@electron/lib/kuznets";

export const Route = createFileRoute("/firewall")({
  loader: () => window.api.server.list(),
  component: FirewallPage,
});

function FirewallPage() {
  const servers = Route.useLoaderData().filter((server) => server.status === "success");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [state, setState] = useState<FirewallState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [port, setPort] = useState("");
  const [protocol, setProtocol] = useState<FirewallProtocol>("tcp");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!selectedServerId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    window.api.firewall
      .get(selectedServerId)
      .then((next) => !cancelled && setState(next))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedServerId]);

  /** Every mutation returns the whole new state, so the table always reflects
   * what the server actually applied rather than an optimistic guess. */
  const run = async (action: () => Promise<FirewallState>, success: string) => {
    setBusy(true);
    try {
      setState(await action());
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err), { position: "bottom-right" });
    } finally {
      setBusy(false);
    }
  };

  const addPort = async () => {
    if (!selectedServerId) return;
    const parsed = Number(port);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      toast.error("Port must be between 1 and 65535", { position: "bottom-right" });
      return;
    }

    await run(
      () =>
        window.api.firewall.openPort(selectedServerId, {
          port: parsed,
          protocol,
          comment: comment.trim() === "" ? null : comment.trim(),
        }),
      `Port ${parsed}/${protocol} opened`,
    );

    setPort("");
    setComment("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
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

      {!selectedServerId ? (
        <Empty className="h-full">
          <EmptyMedia variant="icon">
            <ShieldIcon />
          </EmptyMedia>
          <EmptyTitle>No server selected</EmptyTitle>
          <EmptyDescription>
            {servers.length === 0
              ? "No provisioned servers available yet."
              : "Pick a server above to manage its firewall."}
          </EmptyDescription>
        </Empty>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : loading || !state ? (
        <p className="text-sm text-muted-foreground">Loading firewall...</p>
      ) : (
        <div className="flex max-w-3xl flex-col gap-4">
          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-medium">Firewall</p>
                <FieldDescription>
                  {state.enabled
                    ? "Only the ports below are reachable. Everything else is dropped."
                    : "All ports are reachable. Turning this on drops everything except the ports below."}
                </FieldDescription>
              </div>
              <Switch
                checked={state.enabled}
                disabled={busy}
                onCheckedChange={(checked) =>
                  run(
                    () => window.api.firewall.setEnabled(selectedServerId, checked),
                    checked ? "Firewall enabled" : "Firewall disabled",
                  )
                }
                aria-label="Enable firewall"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open ports</CardTitle>
              <FieldDescription>
                Applies to services on the host and to ports published by deployments.
              </FieldDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Port</TableHead>
                    <TableHead className="w-24">Protocol</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Not a row in the rules table: it is emitted unconditionally
                      when the rules are built, and cannot be removed. */}
                  <TableRow>
                    <TableCell className="font-mono">{state.ssh_port}</TableCell>
                    <TableCell className="text-muted-foreground">tcp</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <LockIcon className="size-3" />
                        SSH — always open, closing it would lock Forge out
                      </span>
                    </TableCell>
                    <TableCell />
                  </TableRow>

                  {state.rules
                    .filter((rule) => !(rule.port === state.ssh_port && rule.protocol === "tcp"))
                    .map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono">{rule.port}</TableCell>
                        <TableCell className="text-muted-foreground">{rule.protocol}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {rule.comment ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => window.api.firewall.closePort(selectedServerId, rule.id),
                                `Port ${rule.port}/${rule.protocol} closed`,
                              )
                            }
                            aria-label={`Close port ${rule.port}`}
                          >
                            <TrashIcon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              <div className="flex items-end gap-2">
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="8080"
                  className="w-28"
                  aria-label="Port to open"
                />
                <Select
                  value={protocol}
                  onValueChange={(value) => setProtocol(value as FirewallProtocol)}
                >
                  <SelectTrigger className="w-24" aria-label="Protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp">tcp</SelectItem>
                    <SelectItem value="udp">udp</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Note (optional)"
                  className="flex-1"
                  aria-label="Note"
                />
                <Button disabled={busy || port === ""} onClick={addPort}>
                  <PlusIcon />
                  Open port
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
