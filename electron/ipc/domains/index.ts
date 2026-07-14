import { registerHelloDomain, type HelloApi } from "./hello"
import { registerDbDomain, type DbApi } from "./db"
import { registerUtilDomain, type UtilApi } from "./util"

export interface IpcApi {
  hello: HelloApi
  db: DbApi
  util: UtilApi
}

export function registerIpcHandlers() {
  registerHelloDomain()
  registerDbDomain()
  registerUtilDomain()
}
