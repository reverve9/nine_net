'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============================================
// 타입 정의
// ============================================
interface ProjectSchedulePageProps {
  user: any
  profile: any
}

interface Project {
  id: string
  name: string
  description: string | null
  status: 'pending' | 'in_progress' | 'review' | 'completed'
  category: string | null
  start_date: string | null
  end_date: string | null
  priority: 'low' | 'medium' | 'high'
  created_by: string
  created_at: string
  assignees?: string[]
}

interface Member {
  id: string
  name: string
  email: string
}

// ============================================
// 상수 - 커스텀 컬러
// ============================================
const CUSTOM_COLORS = [
  '#eeac42', // 주황/골드
  '#c4334b', // 빨강
  '#a8ca54', // 연두
  '#55b8af', // 청록
  '#5677b0', // 파랑
  '#874e7f', // 보라
  '#747474', // 회색
]

const STATUS_CONFIG = {
  pending: { label: '예정', color: '#747474' },
  in_progress: { label: '진행', color: '#5677b0' },
  review: { label: '검토', color: '#eeac42' },
  completed: { label: '완료', color: '#a8ca54' },
}

const CATEGORY_COLORS: Record<string, string> = {
  '영상': '#5677b0',
  '기획': '#a8ca54',
  '디자인': '#874e7f',
  '마케팅': '#c4334b',
  '개발': '#eeac42',
  '기타': '#747474',
}

// 프로젝트별 고유 색상 (인덱스 기반)
const getProjectColor = (index: number) => {
  return CUSTOM_COLORS[index % CUSTOM_COLORS.length]
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function ProjectSchedulePage({ user, profile }: ProjectSchedulePageProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showMyOnly, setShowMyOnly] = useState(false)
  const [selectedDate, setSelectedDate] = useState<number | null>(null)

  // ============================================
  // 데이터 로드
  // ============================================
  useEffect(() => {
    loadProjects()
    loadMembers()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('start_date', { ascending: true })

    if (!error && data) {
      setProjects(data)
    }
    setLoading(false)
  }

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
    if (data) setMembers(data)
  }

  // ============================================
  // 필터링
  // ============================================
  const filteredProjects = showMyOnly
    ? projects.filter(p => 
        p.created_by === user.id || 
        p.assignees?.includes(user.id)
      )
    : projects

  // 날짜가 있는 프로젝트만
  const projectsWithDates = filteredProjects.filter(p => p.start_date || p.end_date)

  // ============================================
  // 날짜 유틸리티
  // ============================================
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today.getDate())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
  }

  // 특정 날짜에 해당하는 프로젝트
  const getProjectsForDate = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
    
    return projectsWithDates.filter(p => {
      const start = p.start_date || ''
      const end = p.end_date || ''
      return dateStr >= start && dateStr <= end
    })
  }

  // ============================================
  // 프로젝트 바 계산
  // ============================================
  const getProjectBar = (project: Project, days: Date[]) => {
    if (!project.start_date && !project.end_date) return null

    const monthStart = days[0]
    const monthEnd = days[days.length - 1]
    
    const projectStart = project.start_date ? new Date(project.start_date) : monthStart
    const projectEnd = project.end_date ? new Date(project.end_date) : monthEnd

    if (projectEnd < monthStart || projectStart > monthEnd) return null

    const startIdx = Math.max(0, Math.floor((projectStart.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)))
    const endIdx = Math.min(days.length - 1, Math.floor((projectEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)))

    return { startIdx, endIdx, width: endIdx - startIdx + 1 }
  }

  // ============================================
  // 담당자 이름 가져오기
  // ============================================
  const getAssigneeNames = (assignees?: string[]) => {
    if (!assignees || assignees.length === 0) return ''
    return assignees
      .map(id => members.find(m => m.id === id)?.name || '')
      .filter(Boolean)
      .join(', ')
  }

  // ============================================
  // 프로젝트 페이지로 이동
  // ============================================
  const goToProject = (projectId: string) => {
    router.push('/project')
  }

  // ============================================
  // 로딩
  // ============================================
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const days = getMonthDays()

  // ============================================
  // 메인 렌더링
  // ============================================
  return (
    <div className="p-4 h-full flex flex-col overflow-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">프로젝트 일정</h1>

          {/* 내 프로젝트만 */}
          <button
            onClick={() => setShowMyOnly(!showMyOnly)}
            className={`px-3 py-1 text-[13px] rounded-lg transition ${
              showMyOnly 
                ? 'text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={showMyOnly ? { backgroundColor: '#5677b0' } : {}}
          >
            👤 내 프로젝트만
          </button>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            ‹
          </button>
          <span className="text-[14px] font-medium text-gray-700 min-w-[120px] text-center">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </span>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            ›
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-[13px] rounded-lg hover:opacity-80"
            style={{ backgroundColor: '#55b8af', color: 'white' }}
          >
            오늘
          </button>
        </div>
      </div>

      {/* 타임라인 (한 줄 날짜) */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {days.map((day) => {
            const dayNum = day.getDate()
            const dayOfWeek = day.getDay()
            const hasProjects = getProjectsForDate(dayNum).length > 0
            const isSelected = selectedDate === dayNum

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDate(isSelected ? null : dayNum)}
                className={`flex flex-col items-center min-w-[36px] py-2 px-1 rounded-lg transition ${
                  isSelected ? 'text-white' : 
                  isToday(day) ? 'bg-blue-50' : 'hover:bg-gray-100'
                }`}
                style={isSelected ? { backgroundColor: '#5677b0' } : {}}
              >
                <span className={`text-[10px] mb-1 ${
                  isSelected ? 'text-white/80' :
                  dayOfWeek === 0 ? 'text-red-400' : 
                  dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {['일','월','화','수','목','금','토'][dayOfWeek]}
                </span>
                <span className={`text-[14px] font-medium ${
                  isSelected ? 'text-white' :
                  isToday(day) ? 'text-blue-600' :
                  dayOfWeek === 0 ? 'text-red-500' : 
                  dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
                }`}>
                  {dayNum}
                </span>
                {hasProjects && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: '#55b8af' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택된 날짜의 프로젝트 카드 */}
      {selectedDate && (
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-gray-700 mb-3">
            {currentDate.getMonth() + 1}월 {selectedDate}일 프로젝트
          </h2>
          {getProjectsForDate(selectedDate).length === 0 ? (
            <p className="text-center text-gray-400 py-4 bg-gray-50 rounded-lg">해당 날짜에 프로젝트가 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getProjectsForDate(selectedDate).map((project, idx) => {
                const status = STATUS_CONFIG[project.status]
                const color = project.category 
                  ? CATEGORY_COLORS[project.category] || '#747474'
                  : getProjectColor(projects.indexOf(project))
                const startDate = project.start_date ? new Date(project.start_date) : null
                const endDate = project.end_date ? new Date(project.end_date) : null

                return (
                  <div
                    key={project.id}
                    onClick={() => goToProject(project.id)}
                    className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition cursor-pointer"
                    style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold text-gray-800 text-[14px] ${
                        project.status === 'completed' ? 'line-through opacity-60' : ''
                      }`}>
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {project.category && (
                          <span 
                            className="text-white px-1.5 py-0.5 rounded text-[10px]"
                            style={{ backgroundColor: color }}
                          >
                            {project.category}
                          </span>
                        )}
                        <span 
                          className="text-white px-1.5 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>
                        📅 {startDate ? `${startDate.getMonth() + 1}/${startDate.getDate()}` : '?'} 
                        ~ {endDate ? `${endDate.getMonth() + 1}/${endDate.getDate()}` : '?'}
                      </span>
                      {project.assignees && project.assignees.length > 0 && (
                        <span>👤 {getAssigneeNames(project.assignees)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 간트 차트 */}
      <div className="flex-1">
        <h2 className="text-[14px] font-semibold text-gray-700 mb-3">간트 차트</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* 헤더: 날짜 */}
          <div className="flex border-b bg-gray-50">
            <div className="w-44 shrink-0 p-2 border-r font-medium text-[12px] text-gray-600">
              프로젝트
            </div>
            <div className="flex-1 flex overflow-x-auto">
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className={`flex-1 min-w-[24px] py-1 text-center text-[10px] border-r ${
                    isToday(day) ? 'font-bold' : ''
                  } ${day.getDay() === 0 ? 'text-red-500' : day.getDay() === 6 ? 'text-blue-500' : 'text-gray-600'}`}
                  style={isToday(day) ? { backgroundColor: '#e0f2fe', color: '#5677b0' } : {}}
                >
                  {day.getDate()}
                </div>
              ))}
            </div>
          </div>

          {/* 프로젝트 행 */}
          {projectsWithDates.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-[13px]">
              일정이 설정된 프로젝트가 없습니다
            </div>
          ) : (
            projectsWithDates.map((project, projectIdx) => {
              const bar = getProjectBar(project, days)
              const status = STATUS_CONFIG[project.status]
              const color = project.category 
                ? CATEGORY_COLORS[project.category] || '#747474'
                : getProjectColor(projectIdx)

              return (
                <div 
                  key={project.id} 
                  className="flex border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => goToProject(project.id)}
                >
                  {/* 프로젝트 이름 */}
                  <div className="w-44 shrink-0 p-2 border-r">
                    <div className="flex items-center gap-1 mb-0.5">
                      {project.category && (
                        <span 
                          className="text-white px-1 py-0.5 rounded text-[9px]"
                          style={{ backgroundColor: color }}
                        >
                          {project.category}
                        </span>
                      )}
                      <span 
                        className="text-white px-1 py-0.5 rounded text-[9px]"
                        style={{ backgroundColor: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className={`text-[12px] font-medium text-gray-700 truncate ${
                      project.status === 'completed' ? 'line-through opacity-60' : ''
                    }`}>
                      {project.name}
                    </div>
                  </div>

                  {/* 간트 바 */}
                  <div className="flex-1 flex relative overflow-x-auto">
                    {days.map((day, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 min-w-[24px] border-r h-12`}
                        style={isToday(day) ? { backgroundColor: '#f0f9ff' } : {}}
                      />
                    ))}
                    
                    {/* 프로젝트 바 */}
                    {bar && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full opacity-90"
                        style={{
                          left: `${(bar.startIdx / days.length) * 100}%`,
                          width: `${(bar.width / days.length) * 100}%`,
                          minWidth: '16px',
                          backgroundColor: color,
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
