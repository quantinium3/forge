import { BrowserWindow } from "electron"
import { registerDomain } from "../registry"

export interface WindowApi {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
}

export function registerWindowDomain() {
  registerDomain("window", {
    minimize: (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize()
    },
    toggleMaximize: (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      win.isMaximized() ? win.unmaximize() : win.maximize()
    },
    close: (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close()
    },
  })
}
