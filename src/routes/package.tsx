import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PackageIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { pollOperation } from "@/lib/operations";
import type { CatalogPackage, Operation } from "@electron/lib/kuznets";

export const Route = createFileRoute("/package")({
  loader: () => window.api.server.list(),
  component: PackagePage,
});

function PackagePage() {
  const servers = Route.useLoaderData().filter((server) => server.status === "success");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogPackage[]>([]);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedServerId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [availablePackages, inventory] = await Promise.all([
          window.api.package.available(selectedServerId),
          window.api.package.list(selectedServerId),
        ]);
        if (cancelled) return;
        const installedNames = new Set(inventory.installed.map((pkg) => pkg.name));
        setCatalog(availablePackages);
        setInstalled(installedNames);
        setSelected(
          new Set(availablePackages.filter((pkg) => installedNames.has(pkg.slug)).map((pkg) => pkg.slug)),
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedServerId]);

  const { toInstall, toUninstall } = useMemo(() => {
    const toInstall: string[] = [];
    const toUninstall: string[] = [];
    for (const pkg of catalog) {
      const wasInstalled = installed.has(pkg.slug);
      const isSelected = selected.has(pkg.slug);
      if (isSelected && !wasInstalled) toInstall.push(pkg.slug);
      if (!isSelected && wasInstalled) toUninstall.push(pkg.slug);
    }
    return { toInstall, toUninstall };
  }, [catalog, installed, selected]);

  const dirty = toInstall.length > 0 || toUninstall.length > 0;

  const toggle = (slug: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const applyChanges = async () => {
    if (!selectedServerId) return;
    const serverId = selectedServerId;
    const operations: Promise<Operation>[] = [];

    if (toInstall.length > 0) {
      const operation = await window.api.package.install(serverId, toInstall);
      operations.push(pollOperation(serverId, operation.id));
    }
    if (toUninstall.length > 0) {
      const operation = await window.api.package.uninstall(serverId, toUninstall);
      operations.push(pollOperation(serverId, operation.id));
    }

    const results = await Promise.all(operations);

    const inventory = await window.api.package.list(serverId);
    setInstalled(new Set(inventory.installed.map((pkg) => pkg.name)));

    const failure = results.find((result) => result.status !== "succeeded");
    if (failure) {
      throw new Error(failure.error ?? `package operation ${failure.status}`);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await toast
        .promise(applyChanges(), {
          loading: "Applying package changes...",
          success: "Packages updated",
          error: (err) => (err instanceof Error ? err.message : String(err)),
        })
        .unwrap();
    } catch {
      // surfaced via the toast above
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
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

        <Button disabled={!selectedServerId || !dirty || applying} onClick={handleApply}>
          <RefreshCwIcon className={applying ? "animate-spin" : undefined} />
          Apply changes
        </Button>
      </div>

      {!selectedServerId ? (
        <Empty className="h-full">
          <EmptyMedia variant="icon">
            <PackageIcon />
          </EmptyMedia>
          <EmptyTitle>No server selected</EmptyTitle>
          <EmptyDescription>
            {servers.length === 0
              ? "No provisioned servers available yet."
              : "Pick a server above to manage packages."}
          </EmptyDescription>
        </Empty>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading packages...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Package</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.map((pkg) => {
              const wasInstalled = installed.has(pkg.slug);
              const isSelected = selected.has(pkg.slug);
              const pending = applying && isSelected !== wasInstalled;
              return (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      disabled={applying}
                      onCheckedChange={(checked) => toggle(pkg.slug, checked === true)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{pkg.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{pkg.description ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {pending
                      ? isSelected
                        ? "Installing..."
                        : "Uninstalling..."
                      : wasInstalled
                        ? "Installed"
                        : "Not installed"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
