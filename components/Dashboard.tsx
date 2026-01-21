'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'
import FloatingChat from './FloatingChat'

// 페이지 컴포넌트들
import DashboardPage from './pages/DashboardPage'
import PartnershipPage from './pages/PartnershipPage'
import SchedulePage from './pages/SchedulePage'
import ProjectSchedulePage from './pages/ProjectSchedulePage'
import ProjectPage from './pages/ProjectPage'
import BoardPage from './pages/BoardPage'
import ApprovalPage from './pages/ApprovalPage'
import AdminPage from './pages/AdminPage'

type PageType = 'dashboard' | 'schedule' | 'project' | 'board' | 'approval' | 'partnership' | 'admin'

interface DashboardProps {
  user: any
}

export default function Dashboard({ user }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [currentSubMenu, setCurrentSubMenu] = useState<string>('overview')
  const [profile, setProfile] = useState<any>(null)
  const [companyName, setCompanyName] = useState<string>('Nine Net')

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

    const fetchCompany = async () => {
      const { data } = await supabase
        .from('companies')
        .select('name')
        .eq('is_our_company', true)
        .single()
      
      if (data) {
        setCompanyName(data.name)
      }
    }

    fetchProfile()
    fetchCompany()
    
  }, [user.id])

  const handleLogout = async () => {
    if (window.electronAPI?.onLogout) {
      window.electronAPI.onLogout()
    }
    
    await supabase.auth.signOut()
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage user={user} profile={profile} setCurrentPage={setCurrentPage} />
      case 'partnership':
        return <PartnershipPage user={user} profile={profile} subMenu={currentSubMenu} />
      case 'schedule':
        if (currentSubMenu === 'project') {
          return <ProjectSchedulePage user={user} profile={profile} />
        }
        return <SchedulePage user={user} profile={profile} subMenu={currentSubMenu} />
      case 'project':
        return <ProjectPage user={user} profile={profile} />
      case 'board':
        return <BoardPage user={user} />
      case 'approval':
        return <ApprovalPage user={user} profile={profile} subMenu={currentSubMenu} />
      case 'admin':
        return <AdminPage user={user} profile={profile} />
      default:
        return <DashboardPage user={user} profile={profile} setCurrentPage={setCurrentPage} />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 상단 헤더 바 - 드래그 가능 */}
      <header 
        className="h-11 bg-white border-b border-gray-200 flex items-center px-4 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* 좌측: 신호등 버튼 공간 (macOS) */}
        <div className="w-16 flex-shrink-0" />
        
        {/* 중앙: 빈 공간 (드래그 영역) */}
        <div className="flex-1" />
        
        {/* 우측: 회사 로고/이름 */}
        <div 
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <span className="font-semibold text-gray-700 text-sm">{companyName}</span>
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white text-xs">🏢</span>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          currentSubMenu={currentSubMenu}
          setCurrentSubMenu={setCurrentSubMenu}
          user={user}
          profile={profile}
          setProfile={setProfile}
          onLogout={handleLogout}
        />
        
        {/* 메인 컨텐츠 - 흰색 배경 */}
        <main className="flex-1 overflow-auto bg-white">
          {renderPage()}
        </main>
      </div>

      {/* 플로팅 채팅 */}
      <FloatingChat user={user} />
    </div>
  )
}
