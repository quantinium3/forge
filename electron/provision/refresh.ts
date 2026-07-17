import { createLog } from "../ipc/domains/log"
import { SshSession } from "../lib/ssh"
import { fetchLatestKuznetsVersion, kuznetsDownloadUrl } from "../lib/kuznets"
import type { SelectServer } from "../db/schema/server"
import { KUZNETS_DATA_DIR, buildKuznetsUnitFile } from "./systemd-unit"

export async function refreshServer(server: SelectServer): Promise<void> {
  let session: SshSession | undefined

  const run = async (label: string, command: string) => {
    await createLog(server.id, "info", `${label}...`)
    const result = await session!.exec(command)

    if (result.code !== 0) {
      const detail =
        result.stderr.trim() || result.stdout.trim() || `exit code ${result.code}`
      throw new Error(`${label} failed: ${detail}`)
    }

    await createLog(server.id, "info", `${label}: done`)
    return result
  }

  try {
    await createLog(server.id, "info", "Checking for the latest kuznets release")
    const version = await fetchLatestKuznetsVersion()
    await createLog(server.id, "info", `Latest kuznets release is ${version}`)

    session = await SshSession.connect({
      host: server.address,
      port: server.sshPort,
      username: server.username,
      privateKeyPath: server.privateKeyPath,
      passphrase: server.passphrase,
    })

    const prefix = server.username === "root" ? "" : "sudo -n "

    const archResult = await run("Detecting architecture", "uname -m")
    const rawArch = archResult.stdout.trim()
    const arch = rawArch === "aarch64" || rawArch === "arm64" ? "aarch64" : "x86_64"

    const downloadUrl = kuznetsDownloadUrl(version, arch)

    await run(
      "Downloading latest kuznets binary",
      `curl -fsSL -o /tmp/kuznets "${downloadUrl}" && ${prefix}install -m 0755 /tmp/kuznets /usr/local/bin/kuznets && rm -f /tmp/kuznets`,
    )

    await run(
      "Creating data directory",
      `${prefix}install -d -m 0755 ${KUZNETS_DATA_DIR}`,
    )

    await run(
      "Writing systemd unit",
      `${prefix}tee /etc/systemd/system/kuznets.service >/dev/null <<'FORGE_EOF'
${buildKuznetsUnitFile()}
FORGE_EOF`,
    )

    await run("Reloading systemd", `${prefix}systemctl daemon-reload`)
    await run("Restarting kuznets service", `${prefix}systemctl restart kuznets`)
    await run("Verifying kuznets service", `${prefix}systemctl is-active --quiet kuznets`)

    await createLog(server.id, "info", `Refreshed kuznets to ${version}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await createLog(server.id, "error", `Refresh failed: ${message}`)
    throw error
  } finally {
    session?.end()
  }
}
