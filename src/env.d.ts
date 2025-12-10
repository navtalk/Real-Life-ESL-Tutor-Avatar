/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_NAVTALK_LICENSE?: string
  readonly VITE_NAVTALK_MODEL?: string
  readonly VITE_NAVTALK_CHARACTER?: string
  readonly VITE_NAVTALK_VOICE?: string
  readonly VITE_NAVTALK_PROMPT?: string
  readonly VITE_NAVTALK_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
