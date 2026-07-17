import http from "node:http"
import type { Readable } from "node:stream"

export const KUZNETS_REPO = "quantinium3/kuznets"

export interface LoadAverageInfo {
  one_minute: number
  five_minutes: number
  fifteen_minutes: number
}

export interface CpuInfo {
  name: string
  vendor_id: string
  brand: string
  frequency_mhz: number
  usage_percent: number
}

export interface CpuSummary {
  logical_count: number
  physical_count: number | null
  global_usage_percent: number
  cpus: CpuInfo[]
}

export interface MemoryInfo {
  total_bytes: number
  used_bytes: number
  available_bytes: number
  free_bytes: number
  total_swap_bytes: number
  used_swap_bytes: number
  free_swap_bytes: number
}

export interface DiskInfo {
  name: string
  kind: string
  file_system: string
  mount_point: string
  total_bytes: number
  available_bytes: number
  used_bytes: number
  is_removable: boolean
  is_read_only: boolean
}

export interface DiskSummary {
  count: number
  total_bytes: number
  available_bytes: number
  used_bytes: number
  disks: DiskInfo[]
}

export interface SystemInfo {
  name: string | null
  host_name: string | null
  architecture: string
  cpu_arch: string
  distribution_id: string
  distribution_id_like: string[]
  kernel_version: string | null
  long_kernel_version: string
  os_version: string | null
  long_os_version: string | null
  uptime_seconds: number
  boot_time_seconds: number
  load_average: LoadAverageInfo
  cpu: CpuSummary
  memory: MemoryInfo
  disks: DiskSummary
}

export interface InstalledPackage {
  name: string
  version: string | null
}

export interface PackageInventory {
  manager: string
  installed: InstalledPackage[]
}

export interface CatalogPackage {
  id: number
  slug: string
  description: string | null
  created_at: number
  updated_at: number
}

export type OperationKind =
  | "package_install"
  | "package_uninstall"
  | "deployment_apply"
  | "deployment_remove"

export type OperationStatus =
  | "requested"
  | "validating"
  | "applying"
  | "succeeded"
  | "failed"
  | "rolling_back"
  | "rolled_back"

export interface Operation {
  id: number
  kind: OperationKind
  status: OperationStatus
  request: unknown
  result: unknown
  error: string | null
  created_at: number
  updated_at: number
}

export interface SecretMeta {
  key: string
  created_at: number
  updated_at: number
}

export interface SecretValue {
  key: string
  value: string
}

export interface Variable {
  key: string
  value: string
  created_at: number
  updated_at: number
}

export type FirewallProtocol = "tcp" | "udp"

export interface FirewallRule {
  id: number
  port: number
  protocol: string
  comment: string | null
  created_at: number
}

export interface FirewallState {
  enabled: boolean
  /** Always reachable and refused as a rule target, so the UI can never close
   * the connection Forge itself depends on. */
  ssh_port: number
  rules: FirewallRule[]
}

export interface OpenPortInput {
  port: number
  protocol?: FirewallProtocol
  comment?: string | null
}

export type DeploymentStatus = "pending" | "running" | "stopped" | "failed"

export type RestartPolicy = "no" | "always" | "unless-stopped" | "on-failure"

export interface Deployment {
  id: number
  name: string
  image: string
  source: DeploymentSource
  container_port: number | null
  host_port: number | null
  domain: string | null
  env: EnvMapping[]
  restart_policy: string
  status: DeploymentStatus
  container_id: string | null
  last_error: string | null
  created_at: number
  updated_at: number
}

/** `registry` images are pulled on every apply; `imported` ones were built
 * locally and loaded via uploadImage, so the server must not try to pull them. */
export type DeploymentSource = "registry" | "imported"

/** Which store an env var's value is read from. */
export type EnvSource = "secret" | "variable"

/**
 * Binds an env var name to a stored secret or variable. The name is independent
 * of the key, so one secret can be exposed under whatever name an image expects.
 * Values are read on the server at apply time and never travel through Forge.
 */
export interface EnvMapping {
  name: string
  source: EnvSource
  key: string
}

export interface PutDeploymentInput {
  name: string
  image: string
  source?: DeploymentSource | null
  container_port?: number | null
  host_port?: number | null
  domain?: string | null
  env?: EnvMapping[]
  restart_policy?: RestartPolicy | null
}

interface KuznetsResponse<T> {
  success: boolean
  data: T
}

interface KuznetsErrorResponse {
  success: false
  error: { message: string }
}

const REQUEST_TIMEOUT_MS = 15_000

async function kuznetsRequest<T>(
  localPort: number,
  path: string,
  init?: RequestInit,
): Promise<T> {
  // Bounds how long a hung (non-erroring) connection can keep its one-shot
  // SSH tunnel alive -- without this a black-holed link never tears down.
  const res = await fetch(`http://127.0.0.1:${localPort}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const body = await res.json()

  if (!res.ok) {
    const message = (body as KuznetsErrorResponse)?.error?.message
    throw new Error(message || `kuznets request to ${path} failed with status ${res.status}`)
  }

  return (body as KuznetsResponse<T>).data
}

export async function fetchSysinfo(localPort: number): Promise<SystemInfo> {
  return kuznetsRequest<SystemInfo>(localPort, "/api/sysinfo")
}

export async function fetchPackages(localPort: number): Promise<PackageInventory> {
  return kuznetsRequest<PackageInventory>(localPort, "/api/packages")
}

export async function fetchAvailablePackages(localPort: number): Promise<CatalogPackage[]> {
  return kuznetsRequest<CatalogPackage[]>(localPort, "/api/packages/available")
}

export async function installPackages(localPort: number, packages: string[]): Promise<Operation> {
  return kuznetsRequest<Operation>(localPort, "/api/packages/install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packages }),
  })
}

export async function uninstallPackages(localPort: number, packages: string[]): Promise<Operation> {
  return kuznetsRequest<Operation>(localPort, "/api/packages/uninstall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packages }),
  })
}

export async function fetchOperation(localPort: number, id: number): Promise<Operation> {
  return kuznetsRequest<Operation>(localPort, `/api/operations/${id}`)
}

export async function fetchSecrets(localPort: number): Promise<SecretMeta[]> {
  return kuznetsRequest<SecretMeta[]>(localPort, "/api/secrets")
}

export async function fetchSecretValue(localPort: number, key: string): Promise<SecretValue> {
  return kuznetsRequest<SecretValue>(localPort, `/api/secrets/${encodePathKey(key)}`)
}

export async function putSecret(localPort: number, key: string, value: string): Promise<{ key: string }> {
  return kuznetsRequest<{ key: string }>(localPort, "/api/secrets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
}

export async function deleteSecret(localPort: number, key: string): Promise<{ key: string }> {
  return kuznetsRequest<{ key: string }>(localPort, `/api/secrets/${encodePathKey(key)}`, {
    method: "DELETE",
  })
}

function encodePathKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/")
}

/**
 * Streams a `docker save` tarball to kuznets, which loads it into the server's
 * daemon. Uses node:http rather than fetch so the body streams without being
 * buffered into memory -- these tarballs are tens of megabytes.
 */
export async function uploadImage(localPort: number, tarball: Readable): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port: localPort,
        path: "/api/images",
        method: "POST",
        headers: { "Content-Type": "application/x-tar" },
      },
      (response) => {
        let body = ""
        response.setEncoding("utf8")
        response.on("data", (chunk) => (body += chunk))
        response.on("end", () => {
          let parsed: KuznetsResponse<{ images: string[] }> | KuznetsErrorResponse
          try {
            parsed = JSON.parse(body)
          } catch {
            reject(new Error(`kuznets returned a non-JSON response: ${body.slice(0, 200)}`))
            return
          }

          if (response.statusCode && response.statusCode >= 400) {
            const message = (parsed as KuznetsErrorResponse)?.error?.message
            reject(new Error(message || `image upload failed with status ${response.statusCode}`))
            return
          }

          resolve((parsed as KuznetsResponse<{ images: string[] }>).data.images)
        })
      },
    )

    request.on("error", reject)
    tarball.on("error", reject)
    tarball.pipe(request)
  })
}

export async function fetchFirewall(localPort: number): Promise<FirewallState> {
  return kuznetsRequest<FirewallState>(localPort, "/api/firewall")
}

export async function setFirewall(
  localPort: number,
  input: { enabled: boolean; ssh_port: number },
): Promise<FirewallState> {
  return kuznetsRequest<FirewallState>(localPort, "/api/firewall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function openFirewallPort(
  localPort: number,
  input: OpenPortInput,
): Promise<FirewallState> {
  return kuznetsRequest<FirewallState>(localPort, "/api/firewall/ports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function closeFirewallPort(localPort: number, id: number): Promise<FirewallState> {
  return kuznetsRequest<FirewallState>(localPort, `/api/firewall/ports/${id}`, {
    method: "DELETE",
  })
}

export async function fetchDeployments(localPort: number): Promise<Deployment[]> {
  return kuznetsRequest<Deployment[]>(localPort, "/api/deployments")
}

/** Returns the queued operation -- the container is not running yet. */
export async function putDeployment(
  localPort: number,
  input: PutDeploymentInput,
): Promise<Operation> {
  return kuznetsRequest<Operation>(localPort, "/api/deployments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteDeployment(localPort: number, name: string): Promise<Operation> {
  return kuznetsRequest<Operation>(localPort, `/api/deployments/${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
}

export async function fetchVariables(localPort: number): Promise<Variable[]> {
  return kuznetsRequest<Variable[]>(localPort, "/api/variables")
}

export async function putVariable(localPort: number, key: string, value: string): Promise<Variable> {
  return kuznetsRequest<Variable>(localPort, "/api/variables", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
}

export async function deleteVariable(localPort: number, key: string): Promise<{ key: string }> {
  return kuznetsRequest<{ key: string }>(localPort, `/api/variables/${encodePathKey(key)}`, {
    method: "DELETE",
  })
}

export function kuznetsDownloadUrl(version: string, arch: "x86_64" | "aarch64"): string {
  return `https://github.com/${KUZNETS_REPO}/releases/download/${version}/kuznets-${arch}-unknown-linux-gnu`
}

export async function fetchLatestKuznetsVersion(): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${KUZNETS_REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "forge-app" },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch latest kuznets release: ${res.status}`)
  }

  const body = (await res.json()) as { tag_name?: string }
  if (!body.tag_name) {
    throw new Error("Latest kuznets release response did not include a tag name")
  }
  return body.tag_name
}
