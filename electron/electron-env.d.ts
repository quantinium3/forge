/// <reference types="vite-plugin-electron/electron-env" />

import type { IpcApi } from './ipc/domains'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * The built directory structure
       *
       * ```tree
       * ├─┬─┬ dist
       * │ │ └── index.html
       * │ │
       * │ ├─┬ dist-electron
       * │ │ ├── main.js
       * │ │ └── preload.js
       * │
       * ```
       */
      APP_ROOT: string
      /** /dist/ or /public/ */
      VITE_PUBLIC: string
    }
  }

  interface Window {
    api: IpcApi
    ipcEvents: {
      on(
        channel: string,
        listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void,
      ): () => void
    }
  }
}
