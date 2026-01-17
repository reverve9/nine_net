'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'
import HomePage from './pages/HomePage'
import MessengerPage from './pages/MessengerPage'
import BoardPage from './pages/BoardPage'
import SchedulePage from './pages/SchedulePage'
import SettingsPage from './pages/SettingsPage'

type PageType = 'home' | 'messenger' | 'board' | 'schedule' | 'settings'

interface DashboardProps {
  user: any
}

export default function Dashboard({ user }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    // 사용자 프로필 가져오기
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
  }, [user.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage user={user} profile={profile} setCurrentPage={setCurrentPage} />
      case 'messenger':
        return <MessengerPage user={user} />
      case 'board':
        return <BoardPage user={user} />
      case 'schedule':
        return <SchedulePage user={user} />
      case 'settings':
        return <SettingsPage user={user} profile={profile} setProfile={setProfile} />
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
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  )
}
