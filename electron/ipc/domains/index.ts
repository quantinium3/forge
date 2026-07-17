import { registerHelloDomain, type HelloApi } from "./hello"
import { registerDbDomain, type DbApi } from "./db"
import { registerUtilDomain, type UtilApi } from "./util"
import { registerServerDomain, type ServerApi } from "./server"
import { registerLogDomain, type LogApi } from "./log"
import { registerTerminalDomain, type TerminalApi } from "./terminal"
import { registerPackageDomain, type PackageApi } from "./package"
import { registerSecretDomain, type SecretApi } from "./secret"
import { registerVariableDomain, type VariableApi } from "./variable"
import { registerOperationDomain, type OperationApi } from "./operation"
import { registerDeploymentDomain, type DeploymentApi } from "./deployment"

export interface IpcApi {
  hello: HelloApi
  db: DbApi
  util: UtilApi
  server: ServerApi
  log: LogApi
  terminal: TerminalApi
  package: PackageApi
  secret: SecretApi
  variable: VariableApi
  operation: OperationApi
  deployment: DeploymentApi
}

export function registerIpcHandlers() {
  registerHelloDomain()
  registerDbDomain()
  registerUtilDomain()
  registerServerDomain()
  registerLogDomain()
  registerTerminalDomain()
  registerPackageDomain()
  registerSecretDomain()
  registerVariableDomain()
  registerOperationDomain()
  registerDeploymentDomain()
}
