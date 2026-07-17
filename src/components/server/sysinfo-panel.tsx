import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SystemInfo } from "@electron/lib/kuznets";

const POLL_INTERVAL_MS = 3000;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function usageColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

function UsageBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", usageColor(clamped))}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function UsageRow({ label, percent, detail }: { label: string; percent: number; detail?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>{detail ?? `${percent.toFixed(1)}%`}</span>
      </div>
      <UsageBar percent={percent} />
    </div>
  );
}

export function SysinfoPanel({ serverId }: { serverId: string }) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const data = await window.api.server.sysinfo(serverId);
        if (!cancelled) {
          setInfo(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        // Each poll opens a fresh SSH connection, so the next one is only
        // scheduled after the previous finishes -- otherwise a slow/flaky
        // link would pile up concurrent handshakes to the same server.
        if (!cancelled) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serverId]);

  if (error && !info) {
    return (
      <Card className="max-w-md">
        <CardContent className="pt-6 text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Fetching metrics...
      </div>
    );
  }

  const memoryUsedPercent = (info.memory.used_bytes / info.memory.total_bytes) * 100;
  const swapUsedPercent =
    info.memory.total_swap_bytes > 0
      ? (info.memory.used_swap_bytes / info.memory.total_swap_bytes) * 100
      : 0;
  const diskUsedPercent = (info.disks.used_bytes / info.disks.total_bytes) * 100;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hostname</span>
            <span>{info.host_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">OS</span>
            <span>{info.long_os_version ?? info.os_version ?? info.distribution_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kernel</span>
            <span>{info.kernel_version ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Architecture</span>
            <span>{info.cpu_arch}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uptime</span>
            <span>{formatUptime(info.uptime_seconds)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Load average</span>
            <span>
              {info.load_average.one_minute.toFixed(2)} / {info.load_average.five_minutes.toFixed(2)} /{" "}
              {info.load_average.fifteen_minutes.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CPU</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <UsageRow label={`Global (${info.cpu.logical_count} logical cores)`} percent={info.cpu.global_usage_percent} />
          <ScrollArea className="h-40">
            <div className="space-y-2 pr-2">
              {info.cpu.cpus.map((cpu, i) => (
                <UsageRow key={i} label={`Core ${i}`} percent={cpu.usage_percent} />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <UsageRow
            label="Memory"
            percent={memoryUsedPercent}
            detail={`${formatBytes(info.memory.used_bytes)} / ${formatBytes(info.memory.total_bytes)}`}
          />
          {info.memory.total_swap_bytes > 0 && (
            <UsageRow
              label="Swap"
              percent={swapUsedPercent}
              detail={`${formatBytes(info.memory.used_swap_bytes)} / ${formatBytes(info.memory.total_swap_bytes)}`}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <UsageRow
            label={`All disks (${info.disks.count})`}
            percent={diskUsedPercent}
            detail={`${formatBytes(info.disks.used_bytes)} / ${formatBytes(info.disks.total_bytes)}`}
          />
          <div className="space-y-2">
            {info.disks.disks.map((disk) => {
              const percent = (disk.used_bytes / disk.total_bytes) * 100;
              return (
                <UsageRow
                  key={disk.name + disk.mount_point}
                  label={`${disk.mount_point} (${disk.file_system})`}
                  percent={percent}
                  detail={`${formatBytes(disk.used_bytes)} / ${formatBytes(disk.total_bytes)}`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
