import { dialog, BrowserWindow, clipboard, type IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"

export interface UtilApi {
  openFile(): Promise<string | null>
  openDirectory(): Promise<string | null>
  copyText(text: string): Promise<void>
}

async function pickPath(
  event: IpcMainInvokeEvent,
  property: "openFile" | "openDirectory",
): Promise<string | null> {
  const win = BrowserWindow.fromWebContents(event.sender)
  const options = { properties: [property] as ("openFile" | "openDirectory")[] }
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

export function registerUtilDomain() {
  registerDomain("util", {
    openFile: (event: IpcMainInvokeEvent) => pickPath(event, "openFile"),

    openDirectory: (event: IpcMainInvokeEvent) => pickPath(event, "openDirectory"),

    // The clipboard module isn't available to sandboxed preload scripts, so
    // writes have to be delegated to the main process.
    copyText: async (_event: IpcMainInvokeEvent, text: string) => {
      clipboard.writeText(text)
    },
  })
}
