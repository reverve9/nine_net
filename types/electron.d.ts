export {}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      toggleMessenger: () => void
      openChat: (roomId: string, roomName: string) => void
      closeChat: (roomId: string) => void
    }
  }
}
