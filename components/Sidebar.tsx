'use client'

import { useState } from 'react'
import ProfileModal from './ProfileModal'

type PageType = 'home' | 'board' | 'schedule' | 'settings' | 'admin'

interface SidebarProps {
  currentPage: PageType
  setCurrentPage: (page: PageType) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  user: any
  profile: any
  setProfile?: (profile: any) => void
  onLogout: () => void
}

const menuItems: { id: PageType; icon: string; label: string; adminOnly?: boolean }[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'board', icon: '📋', label: '게시판' },
  { id: 'schedule', icon: '📅', label: '일정' },
  { id: 'settings', icon: '⚙️', label: '설정' },
  { id: 'admin', icon: '👑', label: '사용자 관리', adminOnly: true },
]

export default function Sidebar({
  currentPage,
  setCurrentPage,
  collapsed,
  setCollapsed,
  user,
  profile,
  setProfile,
  onLogout,
}: SidebarProps) {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const isAdmin = profile?.role === 'super_admin'

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return '대표'
      case 'fin_admin': return '회계'
      case 'guest': return '외부'
      default: return null
    }
  }

  const roleBadge = getRoleBadge(profile?.role)

  return (
    <>
      <div
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}
      >
        {/* 로고 영역 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!collapsed && (
            <span className="font-bold text-gray-800">🏢 Nine Net</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-gray-100 rounded text-gray-400"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 p-2">
          {menuItems
            .filter(item => !item.adminOnly || isAdmin)
            .map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition
                ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* 사용자 정보 - 클릭 시 프로필 모달 */}
        <div className="p-4 border-t border-gray-200">
          <div
            onClick={() => setShowProfileModal(true)}
            className={`flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span>👤</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {profile?.name || user?.email?.split('@')[0]}
                  </p>
                  {roleBadge && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">
                      {roleBadge}
                    </span>
                  )}
                </div>
                {profile?.status_message ? (
                  <p className="text-xs text-gray-400 truncate">{profile.status_message}</p>
                ) : (
                  <p className="text-xs text-gray-400">프로필 설정</p>
                )}
              </div>
            )}
          </div>
          
          {/* 로그아웃 버튼 */}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
            >
              로그아웃
            </button>
          )}
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
