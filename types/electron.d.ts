export {}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      openMessengerApp: () => void
      closeWindow: () => void
      minimizeWindow: () => void
      showNotification: (title: string, body: string) => void
      selectFile: () => Promise<string | null>
      openPath: (filePath: string) => void
    }
  }
}
