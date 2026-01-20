'use client'

interface DashboardPageProps {
  user: any
  profile: any
  setCurrentPage: (page: any) => void
}

export default function DashboardPage({ user, profile, setCurrentPage }: DashboardPageProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 요약 카드들 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">오늘 일정</p>
          <p className="text-2xl font-bold text-gray-800">0건</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">진행중 프로젝트</p>
          <p className="text-2xl font-bold text-gray-800">0건</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">대기중 결재</p>
          <p className="text-2xl font-bold text-gray-800">0건</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">새 게시글</p>
          <p className="text-2xl font-bold text-gray-800">0건</p>
        </div>
      </div>

      {/* 퀵 메뉴 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => setCurrentPage('contacts')}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition text-center"
        >
          <span className="text-3xl mb-2 block">📇</span>
          <span className="text-gray-700">연락처</span>
        </button>
        <button 
          onClick={() => setCurrentPage('schedule')}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition text-center"
        >
          <span className="text-3xl mb-2 block">📅</span>
          <span className="text-gray-700">일정</span>
        </button>
        <button 
          onClick={() => setCurrentPage('project')}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition text-center"
        >
          <span className="text-3xl mb-2 block">📋</span>
          <span className="text-gray-700">프로젝트</span>
        </button>
        <button 
          onClick={() => setCurrentPage('board')}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition text-center"
        >
          <span className="text-3xl mb-2 block">📝</span>
          <span className="text-gray-700">게시판</span>
        </button>
      </div>
    </div>
  )
}
