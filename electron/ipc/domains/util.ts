import { dialog, BrowserWindow, type IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"

export interface UtilApi {
  openFile(): Promise<string | null>
}

export function registerUtilDomain() {
  registerDomain("util", {
    openFile: async (event: IpcMainInvokeEvent) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = win
        ? await dialog.showOpenDialog(win, { properties: ["openFile"] })
        : await dialog.showOpenDialog({ properties: ["openFile"] })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    },
  })
}
