'use client'

type PageType = 'home' | 'messenger' | 'board' | 'schedule' | 'settings'

interface SidebarProps {
  currentPage: PageType
  setCurrentPage: (page: PageType) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  user: any
  profile: any
  onLogout: () => void
}

const menuItems: { id: PageType; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'messenger', icon: '💬', label: '메신저' },
  { id: 'board', icon: '📋', label: '게시판' },
  { id: 'schedule', icon: '📅', label: '일정' },
  { id: 'settings', icon: '⚙️', label: '설정' },
]

export default function Sidebar({
  currentPage,
  setCurrentPage,
  collapsed,
  setCollapsed,
  user,
  profile,
  onLogout,
}: SidebarProps) {
  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}
    >
      {/* 로고 영역 */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <span className="font-bold text-gray-800">🏢 우리회사</span>
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
        {menuItems.map((item) => (
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

      {/* 사용자 정보 */}
      <div className="p-4 border-t border-gray-200">
        <div
          className={`flex items-center gap-3 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <span>👤</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {profile?.name || user?.email?.split('@')[0]}
              </p>
              <button
                onClick={onLogout}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
