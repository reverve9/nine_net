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
      // 업데이트
      checkForUpdate: () => void
      installUpdate: () => void
      getAppVersion: () => Promise<string>
      onUpdateStatus: (callback: (data: UpdateStatus) => void) => void
      removeUpdateListener: () => void
    }
  }

  interface UpdateStatus {
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'dev-mode'
    message?: string
    version?: string
    percent?: number
    error?: string
  }
}
