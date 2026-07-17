import fs from "node:fs"
import net from "node:net"
import { Client } from "ssh2"

export interface SshConnectionConfig {
  host: string
  port: number
  username: string
  privateKeyPath: string
  passphrase?: string | null
  readyTimeoutMs?: number
}

export interface ExecResult {
  code: number | null
  stdout: string
  stderr: string
}

export type ExecOutputListener = (chunk: string, stream: "stdout" | "stderr") => void

export interface TunnelHandle {
  localPort: number
  close: () => void
}

export interface ShellHandle {
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  onData: (listener: (chunk: string) => void) => void
  onClose: (listener: () => void) => void
  close: () => void
}

export class SshSession {
  private constructor(private readonly client: Client) {}

  static connect(config: SshConnectionConfig): Promise<SshSession> {
    return new Promise((resolve, reject) => {
      const client = new Client()
      client
        .on("ready", () => {
          // Swap the connect-phase rejection for a permanent logger so
          // post-connect client errors aren't silently swallowed.
          client.removeAllListeners("error")
          client.on("error", (err) => console.error("[ssh] client error", err))
          resolve(new SshSession(client))
        })
        .on("error", reject)
        .connect({
          host: config.host,
          port: config.port,
          username: config.username,
          privateKey: fs.readFileSync(config.privateKeyPath),
          passphrase: config.passphrase || undefined,
          readyTimeout: config.readyTimeoutMs ?? 20_000,
        })
    })
  }

  exec(command: string, onOutput?: ExecOutputListener): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err)
          return
        }

        let stdout = ""
        let stderr = ""

        stream
          .on("close", (code: number | null) => resolve({ code, stdout, stderr }))
          .on("error", (err: Error) => reject(err))
          .on("data", (data: Buffer) => {
            const text = data.toString()
            stdout += text
            onOutput?.(text, "stdout")
          })
        stream.stderr
          .on("data", (data: Buffer) => {
            const text = data.toString()
            stderr += text
            onOutput?.(text, "stderr")
          })
          .on("error", () => {})
      })
    })
  }

  /**
   * Opens a local TCP listener that forwards each connection to
   * `remoteHost:remotePort` over this SSH connection. Binding `localPort` to
   * 0 (the default) lets the OS pick a free port, which is what you want
   * when tunnels for multiple servers can coexist.
   */
  openTunnel(remoteHost: string, remotePort: number, localPort = 0): Promise<TunnelHandle> {
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        socket.on("error", (err) => console.error("[ssh] tunnel connection error", err))

        this.client.forwardOut(
          socket.remoteAddress!,
          socket.remotePort!,
          remoteHost,
          remotePort,
          (err, stream) => {
            if (err) {
              socket.destroy(err)
              return
            }
            // .pipe() doesn't forward 'error' between sides, so a failed
            // stream/socket must explicitly destroy its counterpart or the
            // other half leaks as a half-open connection.
            stream.on("error", (err: Error) => {
              console.error("[ssh] tunnel forward error", err)
              socket.destroy()
            })
            socket.on("error", () => stream.destroy())
            socket.pipe(stream).pipe(socket)
          },
        )
      })

      // Stays attached for the server's whole life so a post-listen
      // accept()/OS-level error can never crash the process.
      server.on("error", (err) => {
        console.error(`[ssh] tunnel server error (requested port ${localPort})`, err)
        reject(err)
      })

      server.listen(localPort, "127.0.0.1", () => {
        const address = server.address()
        const boundPort = typeof address === "object" && address ? address.port : localPort

        resolve({
          localPort: boundPort,
          close: () => server.close(),
        })
      })
    })
  }

  /**
   * Starts an interactive PTY-backed shell on the remote server, over this
   * SSH connection.
   */
  openShell(cols: number, rows: number): Promise<ShellHandle> {
    return new Promise((resolve, reject) => {
      this.client.shell({ term: "xterm-256color", cols, rows }, (err, stream) => {
        if (err) {
          reject(err)
          return
        }

        let closeListener: (() => void) | undefined
        let closed = false
        const notifyClose = () => {
          if (closed) return
          closed = true
          closeListener?.()
        }

        stream.on("close", notifyClose)
        stream.on("error", (err: Error) => {
          console.error("[ssh] shell stream error", err)
          notifyClose()
        })
        stream.stderr.on("error", () => {})

        resolve({
          write: (data) => stream.write(data),
          resize: (newCols, newRows) => stream.setWindow(newRows, newCols, 0, 0),
          onData: (listener) => {
            stream.on("data", (chunk: Buffer) => listener(chunk.toString("utf8")))
            stream.stderr.on("data", (chunk: Buffer) => listener(chunk.toString("utf8")))
          },
          onClose: (listener) => {
            closeListener = listener
          },
          close: () => stream.end(),
        })
      })
    })
  }

  end() {
    this.client.end()
  }
}
