import { createLog } from "../ipc/domains/log";
import { setServerStatus } from "../utils/server-status";
import { SshSession } from "../lib/ssh";
import type { SelectServer } from "../db/schema/server";
import { getInitCommands } from "./init-commands";
import { kuznetsDownloadUrl } from "../lib/kuznets";
import { KUZNETS_DATA_DIR, buildKuznetsUnitFile } from "./systemd-unit";

const KUZNETS_VERSION = "v0.0.1";

function lineStreamer(serverId: string) {
  let buffer = "";

  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim()) {
          void createLog(serverId, "debug", line);
        }
      }
    },

    flush() {
      if (buffer.trim()) {
        void createLog(serverId, "debug", buffer);
      }
      buffer = "";
    },
  };
}

export async function provisionServer(server: SelectServer): Promise<void> {
  let session: SshSession | undefined;

  const run = async (label: string, command: string) => {
    await createLog(server.id, "info", `${label}...`);

    const output = lineStreamer(server.id);
    const result = await session!.exec(command, (chunk) => output.push(chunk));
    output.flush();

    if (result.code !== 0) {
      const detail =
        result.stderr.trim() ||
        result.stdout.trim() ||
        `exit code ${result.code}`;

      throw new Error(`${label} failed: ${detail}`);
    }

    await createLog(server.id, "info", `${label}: done`);
    return result;
  };

  try {
    await createLog(
      server.id,
      "info",
      `Connecting to ${server.address}:${server.sshPort}`
    );

    session = await SshSession.connect({
      host: server.address,
      port: server.sshPort,
      username: server.username,
      privateKeyPath: server.privateKeyPath,
      passphrase: server.passphrase,
    });

    await createLog(server.id, "info", "Connected");

    const prefix = server.username === "root" ? "" : "sudo -n ";

    const osRelease = await run(
      "Detecting operating system",
      `. /etc/os-release && echo "$ID:$VERSION_ID"`
    );

    const [os, version] = osRelease.stdout
      .trim()
      .toLowerCase()
      .split(":");

    await createLog(server.id, "info", `Detected OS: ${os} ${version}`);

    const commands = getInitCommands(os, version);

    for (const command of commands) {
      await run(`Running ${command}`, `${prefix}${command}`);
    }

    const archResult = await run("Detecting architecture", "uname -m");
    const rawArch = archResult.stdout.trim();

    const arch =
      rawArch === "aarch64" || rawArch === "arm64"
        ? "aarch64"
        : "x86_64";

    const downloadUrl = kuznetsDownloadUrl(KUZNETS_VERSION, arch);

    await run(
      "Downloading kuznets binary",
      `curl -fsSL -o /tmp/kuznets "${downloadUrl}" && ${prefix}install -m 0755 /tmp/kuznets /usr/local/bin/kuznets && rm -f /tmp/kuznets`
    );

    await run(
      "Creating data directory",
      `${prefix}install -d -m 0755 ${KUZNETS_DATA_DIR}`
    );

    await run(
      "Writing systemd unit",
      `${prefix}tee /etc/systemd/system/kuznets.service >/dev/null <<'FORGE_EOF'
${buildKuznetsUnitFile()}
FORGE_EOF`
    );

    await run("Reloading systemd", `${prefix}systemctl daemon-reload`);
    await run(
      "Starting kuznets service",
      `${prefix}systemctl enable --now kuznets`
    );
    await run(
      "Verifying kuznets service",
      `${prefix}systemctl is-active --quiet kuznets`
    );

    await createLog(server.id, "info", "Provisioning completed successfully");
    await setServerStatus(server.id, "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await createLog(server.id, "fatal", message);
    await setServerStatus(server.id, "failed");
  } finally {
    session?.end();
  }
}
