export {}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      toggleMessenger: () => void
      openChat: (roomId: string, roomName: string) => void
      closeChat: (roomId: string) => void
      closeWindow: () => void
      minimizeWindow: () => void
      onLogout: () => void
      onLogin: () => void
      showNotification: (title: string, body: string) => void
    }
  }
}
