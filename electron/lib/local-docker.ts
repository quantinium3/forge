import path from "node:path"
import type { Readable } from "node:stream"
import Docker from "dockerode"
import tarFs from "tar-fs"

/**
 * The operator's own docker daemon. Builds happen here rather than on the
 * server, so servers need no toolchain and the source never leaves this machine.
 */
export function localDocker(): Docker {
  return new Docker()
}

export async function assertDockerAvailable(docker: Docker): Promise<void> {
  try {
    await docker.ping()
  } catch (error) {
    throw new Error(
      `Docker is not available on this machine: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

/** Assets are packed under this prefix so the generated files sit beside them
 * rather than inside the served directory. */
const SITE_DIR = "site"

function nginxConf(spaFallback: boolean): string {
  // An SPA serves index.html for unknown paths so client-side routing works;
  // a plain static site should genuinely 404 instead.
  const location = spaFallback
    ? "location / {\n        try_files $uri $uri/ /index.html;\n    }"
    : "location / {\n        try_files $uri $uri/ =404;\n    }"

  return `server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    ${location}
}
`
}

function dockerfile(): string {
  return `FROM nginx:alpine
COPY ${SITE_DIR}/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
`
}

export interface BuildStaticOptions {
  assetsDir: string
  tag: string
  spaFallback: boolean
  onProgress?: (line: string) => void
}

/**
 * Packs the asset directory into a build context with a generated Dockerfile
 * and nginx config, then builds it. Nothing is written into the user's
 * directory -- the generated files are appended to the tar stream instead.
 */
export async function buildStaticImage(
  docker: Docker,
  { assetsDir, tag, spaFallback, onProgress }: BuildStaticOptions,
): Promise<void> {
  const context = tarFs.pack(assetsDir, {
    map: (header) => {
      header.name = path.posix.join(SITE_DIR, header.name)
      return header
    },
    finalize: false,
    finish(pack) {
      pack.entry({ name: "Dockerfile" }, dockerfile())
      pack.entry({ name: "nginx.conf" }, nginxConf(spaFallback))
      pack.finalize()
    },
  })

  const output = await docker.buildImage(context as unknown as Readable, { t: tag })

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      output,
      (error: Error | null) => (error ? reject(error) : resolve()),
      (event: { stream?: string; error?: string }) => {
        if (event.error) {
          reject(new Error(event.error))
          return
        }
        const line = event.stream?.trim()
        if (line) onProgress?.(line)
      },
    )
  })
}

/** The `docker save` tarball, streamed rather than buffered -- images run to
 * tens of megabytes. */
export async function saveImage(docker: Docker, tag: string): Promise<Readable> {
  return (await docker.getImage(tag).get()) as unknown as Readable
}

export async function removeLocalImage(docker: Docker, tag: string): Promise<void> {
  try {
    await docker.getImage(tag).remove({ force: true })
  } catch {
    // Best effort: a leftover local image is harmless next to a failed deploy.
  }
}
