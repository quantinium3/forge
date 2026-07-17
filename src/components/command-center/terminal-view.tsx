import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export function TerminalView({ serverId }: { serverId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, monospace",
      fontSize: 13,
      theme: { background: "#0a0a0a" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    let channelId: string | null = null;
    let cancelled = false;

    const offData = window.ipcEvents.on("terminal:data", (_event, ...args) => {
      const payload = args[0] as { channelId: string; data: string };
      if (payload.channelId !== channelId) return;
      term.write(payload.data);
    });

    const offClosed = window.ipcEvents.on("terminal:closed", (_event, ...args) => {
      const payload = args[0] as { channelId: string };
      if (payload.channelId !== channelId) return;
      term.write("\r\n\x1b[31m[connection closed]\x1b[0m\r\n");
    });

    window.api.terminal.open(serverId, term.cols, term.rows).then(
      (result) => {
        if (cancelled) {
          void window.api.terminal.close(result.channelId);
          return;
        }
        channelId = result.channelId;
      },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        term.write(`\r\n\x1b[31m${message}\x1b[0m\r\n`);
      },
    );

    const dataDisposable = term.onData((data) => {
      if (channelId) void window.api.terminal.write(channelId, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (channelId) void window.api.terminal.resize(channelId, term.cols, term.rows);
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      dataDisposable.dispose();
      offData();
      offClosed();
      if (channelId) void window.api.terminal.close(channelId);
      term.dispose();
    };
  }, [serverId]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}
