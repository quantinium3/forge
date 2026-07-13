import { registerDomain } from "../registry"

export interface HelloApi {
  helloWorld(): Promise<string>
}

export function registerHelloDomain() {
  registerDomain("hello", {
    helloWorld: () => "Hello World from the main process!",
  })
}
