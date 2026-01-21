'use client'

import { useState } from 'react'
import ProfileModal from './ProfileModal'

type PageType = 'dashboard' | 'schedule' | 'project' | 'board' | 'approval' | 'partnership' | 'admin'
type SubMenuType = string

interface MenuItem {
  id: PageType
  icon: string
  label: string
  adminOnly?: boolean
  subMenus?: { id: SubMenuType; label: string }[]
}

interface SidebarProps {
  currentPage: PageType
  setCurrentPage: (page: PageType) => void
  currentSubMenu: string
  setCurrentSubMenu: (subMenu: string) => void
  user: any
  profile: any
  setProfile?: (profile: any) => void
  onLogout: () => void
}

const menuItems: MenuItem[] = [
  { 
    id: 'dashboard', 
    icon: '📊', 
    label: '대시보드',
    subMenus: [
      { id: 'overview', label: '개요' },
    ]
  },
  { 
    id: 'schedule', 
    icon: '📅', 
    label: '일정',
    subMenus: [
      { id: 'calendar', label: '월간 일정표' },
      { id: 'project', label: '프로젝트 일정' },
    ]
  },
  { 
    id: 'project', 
    icon: '📋', 
    label: '프로젝트',
    subMenus: [
      { id: 'all', label: '전체' },
      { id: 'dev', label: '개발' },
      { id: 'marketing', label: '마케팅' },
      { id: 'design', label: '디자인' },
      { id: 'planning', label: '기획' },
      { id: 'video', label: '영상' },
      { id: 'other', label: '기타' },
    ]
  },
  { 
    id: 'board', 
    icon: '📝', 
    label: '게시판',
    subMenus: [
      { id: 'notice', label: '공지사항' },
      { id: 'free', label: '자유게시판' },
    ]
  },
  { 
    id: 'approval', 
    icon: '✅', 
    label: '결재',
    subMenus: [
      { id: 'draft', label: '기안함' },
      { id: 'inbox', label: '결재함' },
      { id: 'reference', label: '열람/공람' },
      { id: 'certificate', label: '증명서 신청' },
    ]
  },
  { 
    id: 'partnership', 
    icon: '🤝', 
    label: '파트너쉽',
    subMenus: [
      { id: 'all', label: '전체' },
      { id: 'company', label: '기업' },
      { id: 'organization', label: '기관' },
      { id: 'personal', label: '개인' },
    ]
  },
  { 
    id: 'admin', 
    icon: '⚙️', 
    label: '관리', 
    adminOnly: true,
    subMenus: [
      { id: 'users', label: '사용자 관리' },
      { id: 'company', label: '회사 정보' },
      { id: 'settings', label: '시스템 설정' },
    ]
  },
]

export default function Sidebar({
  currentPage,
  setCurrentPage,
  currentSubMenu,
  setCurrentSubMenu,
  user,
  profile,
  setProfile,
  onLogout,
}: SidebarProps) {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const isAdmin = profile?.role === 'super_admin'

  const currentMenuItem = menuItems.find(item => item.id === currentPage)

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return '대표'
      case 'fin_admin': return '회계'
      case 'guest': return '외부'
      default: return null
    }
  }

  const roleBadge = getRoleBadge(profile?.role)

  const handleMenuClick = (item: MenuItem) => {
    setCurrentPage(item.id)
    if (item.subMenus && item.subMenus.length > 0) {
      setCurrentSubMenu(item.subMenus[0].id)
    }
  }

  return (
    <>
      <div className="flex h-full">
        {/* 1단: 메인 사이드바 (아이콘 + 텍스트) - 흰색 배경, 드래그 가능 */}
        <div 
          className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-3"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          {/* 메뉴 아이콘들 */}
          <nav 
            className="flex-1 flex flex-col gap-0.5 w-full px-1.5"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            {menuItems
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`w-full py-2.5 rounded-lg flex flex-col items-center gap-0.5 transition-all
                  ${currentPage === item.id 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 2단: 서브 사이드바 - 그레이 배경 */}
        <div className="w-52 bg-gray-100 border-r border-gray-200 flex flex-col">
          {/* 현재 메뉴 타이틀 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 text-sm">{currentMenuItem?.label}</h2>
          </div>

          {/* 서브 메뉴 */}
          <nav className="flex-1 p-2 overflow-y-auto">
            {currentMenuItem?.subMenus?.map((subMenu) => (
              <button
                key={subMenu.id}
                onClick={() => setCurrentSubMenu(subMenu.id)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm transition
                  ${currentSubMenu === subMenu.id
                    ? 'bg-white text-blue-600 font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }
                `}
              >
                {subMenu.label}
              </button>
            ))}
          </nav>

          {/* 사용자 정보 - 서브 사이드바 하단 (배경 통일) */}
          <div className="p-3 border-t border-gray-200">
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-300 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {profile?.name || user?.email?.split('@')[0]}
                  </p>
                  {roleBadge && (
                    <span className="px-1 py-0.5 text-[9px] bg-blue-100 text-blue-600 rounded">
                      {roleBadge}
                    </span>
                  )}
                </div>
                {profile?.status_message ? (
                  <p className="text-[11px] text-gray-400 truncate">{profile.status_message}</p>
                ) : (
                  <p className="text-[11px] text-gray-400">프로필 설정</p>
                )}
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 프로필 모달 */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updatedProfile) => {
            if (setProfile) setProfile(updatedProfile)
          }}
        />
      )}
    </>
  )
}
