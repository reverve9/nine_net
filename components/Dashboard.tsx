'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'
import FloatingChat from './FloatingChat'
import HomePage from './pages/HomePage'
import BoardPage from './pages/BoardPage'
import SchedulePage from './pages/SchedulePage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'

type PageType = 'home' | 'board' | 'schedule' | 'settings' | 'admin'

interface DashboardProps {
  user: any
}

export default function Dashboard({ user }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setProfile(data)
      }
    }

    fetchProfile()
    
    // 로그인 시 메신저 창 새로고침
    if (window.electronAPI?.onLogin) {
      window.electronAPI.onLogin()
    }
  }, [user.id])

  const handleLogout = async () => {
    // Electron: 메신저/채팅창 모두 닫기
    if (window.electronAPI?.onLogout) {
      window.electronAPI.onLogout()
    }
    
    await supabase.auth.signOut()
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage user={user} profile={profile} setCurrentPage={setCurrentPage} />
      case 'board':
        return <BoardPage user={user} />
      case 'schedule':
        return <SchedulePage user={user} />
      case 'settings':
        return <SettingsPage user={user} profile={profile} setProfile={setProfile} />
      case 'admin':
        return <AdminPage user={user} profile={profile} />
      default:
        return <HomePage user={user} profile={profile} setCurrentPage={setCurrentPage} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
        profile={profile}
        setProfile={setProfile}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>

      {/* 플로팅 채팅 */}
      <FloatingChat user={user} />
    </div>
  )
}
