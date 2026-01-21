export {}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      openMessengerApp: () => void
      toggleMessenger: () => void
      openChat: (roomId: string, roomName: string) => void
      closeChat: (roomId: string) => void
      closeWindow: () => void
      minimizeWindow: () => void
      showNotification: (title: string, body: string) => void
      selectFile: () => Promise<string | null>
      openPath: (filePath: string) => void
      onLogout: () => void
      onLogin: () => void
    }
  }
}
