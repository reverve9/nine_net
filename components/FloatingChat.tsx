'use client'

import { useState, useEffect } from 'react'

interface FloatingChatProps {
  user: any
}

// 메신저앱 URL (배포 시 환경변수로 변경)
const MESSENGER_URL = process.env.NEXT_PUBLIC_MESSENGER_URL || 'http://localhost:3001'

export default function FloatingChat({ user }: FloatingChatProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(!!window.electronAPI?.isElectron)
  }, [])

  const handleButtonClick = () => {
    if (isElectron && window.electronAPI) {
      // Electron: 메신저앱 실행
      window.electronAPI.openMessengerApp()
    } else {
      // 웹: 메신저앱 새 창으로 열기
      const width = 400
      const height = 600
      const left = window.screen.width - width - 20
      const top = 80
      window.open(
        MESSENGER_URL,
        'messenger',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
      )
    }
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={handleButtonClick}
        className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg hover:opacity-90 transition flex items-center justify-center z-50"
        style={{ backgroundColor: '#5677b0' }}
        title="메신저 열기"
      >
        <span className="text-2xl">💬</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </>
  )
}

