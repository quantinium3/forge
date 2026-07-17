import { BrowserWindow, type IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"
import { withKuznetsProxy } from "../../lib/tunnel-manager"
import { getServerOrThrow } from "../../utils/get-server"
import {
  assertDockerAvailable,
  buildStaticImage,
  localDocker,
  removeLocalImage,
  saveImage,
} from "../../lib/local-docker"
import {
  deleteDeployment,
  fetchDeployments,
  putDeployment,
  uploadImage,
  type Deployment,
  type EnvMapping,
  type Operation,
  type PutDeploymentInput,
} from "../../lib/kuznets"

export interface DeployStaticInput {
  name: string
  assetsDir: string
  spaFallback: boolean
  hostPort?: number | null
  env?: EnvMapping[]
  restartPolicy?: PutDeploymentInput["restart_policy"]
}

export interface DeploymentApi {
  list(serverId: string): Promise<Deployment[]>
  /** Resolves once the work is queued; poll the operation for the outcome. */
  create(serverId: string, input: PutDeploymentInput): Promise<Operation>
  /** Builds an image from a local directory, ships it, then queues the deploy. */
  deployStatic(serverId: string, input: DeployStaticInput): Promise<Operation>
  delete(serverId: string, name: string): Promise<Operation>
}

/** nginx serves on 80 inside the container regardless of how it is published. */
const STATIC_CONTAINER_PORT = 80

function progressReporter(event: IpcMainInvokeEvent, name: string) {
  const window = BrowserWindow.fromWebContents(event.sender)

  return (message: string) => {
    window?.webContents.send("deployment:progress", { name, message })
  }
}

export function registerDeploymentDomain() {
  registerDomain("deployment", {
    list: async (_event: IpcMainInvokeEvent, serverId: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchDeployments(localPort))
    },

    create: async (_event: IpcMainInvokeEvent, serverId: string, input: PutDeploymentInput) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => putDeployment(localPort, input))
    },

    deployStatic: async (
      event: IpcMainInvokeEvent,
      serverId: string,
      input: DeployStaticInput,
    ): Promise<Operation> => {
      const server = await getServerOrThrow(serverId)
      const report = progressReporter(event, input.name)

      const docker = localDocker()
      await assertDockerAvailable(docker)

      // Tagged per build so a redeploy is never mistaken for the previous image
      // by a daemon that already has that tag cached.
      const tag = `forge/${input.name}:${Date.now()}`

      report("Building image...")
      await buildStaticImage(docker, {
        assetsDir: input.assetsDir,
        tag,
        spaFallback: input.spaFallback,
        onProgress: report,
      })

      try {
        report("Uploading image to server...")
        const tarball = await saveImage(docker, tag)
        const images = await withKuznetsProxy(server, (localPort) =>
          uploadImage(localPort, tarball),
        )
        report(`Loaded ${images.join(", ")}`)

        report("Starting container...")
        return await withKuznetsProxy(server, (localPort) =>
          putDeployment(localPort, {
            name: input.name,
            image: tag,
            source: "imported",
            container_port: STATIC_CONTAINER_PORT,
            host_port: input.hostPort ?? null,
            env: input.env ?? [],
            restart_policy: input.restartPolicy ?? "unless-stopped",
          }),
        )
      } finally {
        // The server has its own copy now; keeping every build on the operator's
        // machine would pile up images they never asked for.
        await removeLocalImage(docker, tag)
      }
    },

    delete: async (_event: IpcMainInvokeEvent, serverId: string, name: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => deleteDeployment(localPort, name))
    },
  })
}
