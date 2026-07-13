import { app } from "electron"
import { registerDomain } from "../registry"

export interface AppApi {
  getVersion(): Promise<string>
  getPath(
    name: "home" | "appData" | "userData" | "temp" | "desktop" | "documents" | "downloads",
  ): Promise<string>
}

export function registerAppDomain() {
  registerDomain("app", {
    getVersion: () => app.getVersion(),
    getPath: (_event, name: Parameters<AppApi["getPath"]>[0]) => app.getPath(name),
  })
}
