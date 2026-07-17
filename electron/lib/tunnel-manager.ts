import type { SelectServer } from "../db/schema/server"
import { SshSession } from "./ssh"

export const KUZNETS_PORT = 6967

/**
 * Opens a fresh SSH connection, forwards a local port to the remote kuznets
 * agent, runs `fn`, then tears the tunnel and connection back down. SSH
 * connections to remote hosts can't be kept alive reliably, so every kuznets
 * API call gets its own short-lived connection instead of reusing a cached
 * one that might have gone stale.
 */
export async function withKuznetsProxy<T>(
  server: SelectServer,
  fn: (localPort: number) => Promise<T>,
): Promise<T> {
  const session = await SshSession.connect({
    host: server.address,
    port: server.sshPort,
    username: server.username,
    privateKeyPath: server.privateKeyPath,
    passphrase: server.passphrase,
  })

  try {
    const tunnel = await session.openTunnel("127.0.0.1", KUZNETS_PORT)
    try {
      return await fn(tunnel.localPort)
    } finally {
      tunnel.close()
    }
  } finally {
    session.end()
  }
}
