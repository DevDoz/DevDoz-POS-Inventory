/// <reference types="vite/client" />

// Declare environment variables
interface ImportMetaEnv {
  readonly ELECTRON_RENDERER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
