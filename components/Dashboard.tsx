'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'
import FloatingChat from './FloatingChat'

// 페이지 컴포넌트들
import DashboardPage from './pages/DashboardPage'
import ContactsPage from './pages/ContactsPage'
import SchedulePage from './pages/SchedulePage'
import ProjectPage from './pages/ProjectPage'
import BoardPage from './pages/BoardPage'
import ApprovalPage from './pages/ApprovalPage'
import AdminPage from './pages/AdminPage'

type PageType = 'dashboard' | 'contacts' | 'schedule' | 'project' | 'board' | 'approval' | 'admin'

interface DashboardProps {
  user: any
}

export default function Dashboard({ user }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
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
      case 'dashboard':
        return <DashboardPage user={user} profile={profile} setCurrentPage={setCurrentPage} />
      case 'contacts':
        return <ContactsPage user={user} profile={profile} />
      case 'schedule':
        return <SchedulePage user={user} />
      case 'project':
        return <ProjectPage user={user} profile={profile} />
      case 'board':
        return <BoardPage user={user} />
      case 'approval':
        return <ApprovalPage user={user} profile={profile} />
      case 'admin':
        return <AdminPage user={user} profile={profile} />
      default:
        return <DashboardPage user={user} profile={profile} setCurrentPage={setCurrentPage} />
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
