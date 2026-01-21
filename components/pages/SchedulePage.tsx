'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SafeInput, SafeTextarea, CardGrid, DataTable, ViewModeToggle, inputClassLg } from '@/components/common/PageLayout'
import type { ViewMode as ListViewMode } from '@/components/common/PageLayout'

// ============================================
// 타입 정의
// ============================================
interface SchedulePageProps {
  user: any
  profile: any
  subMenu: string
}

interface Schedule {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  category: Category
  attendees: string[]
  is_completed: boolean
  created_by: string
  created_at: string
}

type Category = 'agency' | 'video' | 'planning' | 'contents' | 'marketing' | 'etc'
type ViewMode = 'month' | 'list'

// ============================================
// 상수
// ============================================
const CATEGORIES: { key: Category; label: string; color: string; bgColor: string }[] = [
  { key: 'agency', label: '대행', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { key: 'video', label: '영상', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { key: 'planning', label: '기획', color: 'text-green-600', bgColor: 'bg-green-100' },
  { key: 'contents', label: '콘텐츠', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { key: 'marketing', label: '마케팅', color: 'text-red-600', bgColor: 'bg-red-100' },
  { key: 'etc', label: '기타', color: 'text-gray-600', bgColor: 'bg-gray-100' },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// ============================================
// 유틸리티 함수
// ============================================
const getCategoryInfo = (category: Category) => {
  return CATEGORIES.find(c => c.key === category) || CATEGORIES[5]
}

const formatTime = (time: string | null) => {
  if (!time) return ''
  return time.slice(0, 5)
}

const isSameDay = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
}

const isToday = (date: Date) => isSameDay(date, new Date())

// ============================================
// 카테고리 배지 컴포넌트
// ============================================
const CategoryBadge = ({ category, size = 'sm' }: { category: Category; size?: 'sm' | 'xs' }) => {
  const info = getCategoryInfo(category)
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[12px]' : 'px-1.5 py-0.5 text-[11px]'
  
  return (
    <span className={`${info.bgColor} ${info.color} ${sizeClass} rounded font-medium`}>
      {info.label}
    </span>
  )
}

// ============================================
// 뷰 모드 토글 (일정용 - 월간/캘린더/목록)
// ============================================
const ScheduleViewToggle = ({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void }) => (
  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
    {[
      { key: 'month' as ViewMode, label: '캘린더' },
      { key: 'list' as ViewMode, label: '목록' },
    ].map(({ key, label }) => (
      <button
        key={key}
        onClick={() => setViewMode(key)}
        className={`px-3 py-1 rounded-md text-[13px] transition ${
          viewMode === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
)

// ============================================
// 메인 컴포넌트
// ============================================
export default function SchedulePage({ user, profile, subMenu }: SchedulePageProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [listViewMode, setListViewMode] = useState<ListViewMode>('card')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showMyOnly, setShowMyOnly] = useState(false) // 내 일정만 보기
  
  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  
  // 폼 상태
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    category: 'etc' as Category,
    attendees: '',
  })

  // ============================================
  // 내 일정 필터링 (참석자에 내 이름 포함 또는 내가 만든 일정)
  // ============================================
  const filterMySchedules = (allSchedules: Schedule[]) => {
    if (!showMyOnly) return allSchedules
    
    const myName = profile?.name || ''
    return allSchedules.filter(s => 
      s.created_by === user.id || 
      s.attendees?.some(a => a.includes(myName) || myName.includes(a))
    )
  }

  // ============================================
  // 데이터 로드
  // ============================================
  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    
    if (data) setSchedules(data)
    setLoading(false)
  }

  // ============================================
  // 날짜 네비게이션
  // ============================================
  const goToToday = () => setCurrentDate(new Date())
  
  const goToPrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCurrentDate(newDate)
  }
  
  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  // ============================================
  // 캘린더 데이터 계산
  // ============================================
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay()
    const days: { date: Date; isCurrentMonth: boolean }[] = []
    
    // 이전 달 날짜
    const prevMonth = new Date(year, month, 0) // 이전 달 마지막 날
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      })
    }
    
    // 현재 달
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }
    
    // 다음 달 날짜 (6주 채우기)
    const remainingDays = 42 - days.length // 6주 = 42일
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }
    
    return days
  }

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const filtered = filterMySchedules(schedules)
    return filtered.filter(s => s.date === dateStr)
  }

  // ============================================
  // CRUD 함수
  // ============================================
  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      category: 'etc',
      attendees: '',
    })
    setEditingSchedule(null)
  }

  const openAddModal = (date?: Date) => {
    resetForm()
    if (date) {
      setForm(prev => ({ ...prev, date: date.toISOString().split('T')[0] }))
    }
    setShowAddModal(true)
  }

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setForm({
      title: schedule.title,
      description: schedule.description || '',
      date: schedule.date,
      start_time: schedule.start_time || schedule.time || '',
      end_time: schedule.end_time || '',
      location: schedule.location || '',
      category: schedule.category || 'etc',
      attendees: schedule.attendees?.join(', ') || '',
    })
    setShowDetailModal(false)
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return

    const attendeesArray = form.attendees
      .split(',')
      .map(a => a.trim())
      .filter(a => a)

    const saveData = {
      title: form.title,
      description: form.description || null,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      time: form.start_time || null, // 기존 호환
      location: form.location || null,
      category: form.category,
      attendees: attendeesArray.length > 0 ? attendeesArray : [],
      is_completed: editingSchedule?.is_completed || false,
      created_by: editingSchedule?.created_by || user.id,
    }

    if (editingSchedule) {
      await supabase.from('schedules').update(saveData).eq('id', editingSchedule.id)
    } else {
      await supabase.from('schedules').insert(saveData)
    }

    setShowAddModal(false)
    resetForm()
    fetchSchedules()
  }

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`)) return
    
    await supabase.from('schedules').delete().eq('id', schedule.id)
    setShowDetailModal(false)
    setSelectedSchedule(null)
    fetchSchedules()
  }

  const toggleComplete = async (schedule: Schedule) => {
    await supabase
      .from('schedules')
      .update({ is_completed: !schedule.is_completed })
      .eq('id', schedule.id)
    
    fetchSchedules()
  }

  const openDetail = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowDetailModal(true)
  }

  // ============================================
  // 렌더링: 로딩
  // ============================================
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // ============================================
  // 헤더 텍스트
  // ============================================
  const getHeaderText = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    
    return `${year}년 ${month}월`
  }

  // ============================================
  // 렌더링: 월간 뷰
  // ============================================
  const renderMonthView = () => {
    const days = getMonthDays()
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-[15px] font-medium ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7">
          {days.map((dayInfo, index) => {
            const day = dayInfo.date
            const daySchedules = getSchedulesForDate(day)
            const dayOfWeek = day.getDay()
            const isSingle = daySchedules.length === 1
            
            return (
              <div
                key={index}
                className={`h-[120px] border-b border-r p-1.5 cursor-pointer hover:bg-blue-50 transition ${
                  !dayInfo.isCurrentMonth ? 'bg-gray-50' : ''
                } ${isToday(day) ? 'bg-blue-50' : ''}`}
                onClick={() => openAddModal(day)}
              >
                {/* 1줄: 날짜 + 배지들 (날짜 좌측, 배지 우측) */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[15px] font-medium ${
                    !dayInfo.isCurrentMonth ? 'text-gray-300' :
                    dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
                  } ${isToday(day) ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[13px]' : ''}`}>
                    {day.getDate()}
                  </span>
                  {/* 배지들 (우측) */}
                  <div className="flex items-center gap-0.5 flex-wrap justify-end">
                    {daySchedules.slice(0, 3).map(schedule => {
                      const catInfo = getCategoryInfo(schedule.category)
                      return (
                        <span 
                          key={schedule.id}
                          className={`${catInfo.bgColor} ${catInfo.color} px-1.5 py-0.5 rounded text-[11px] font-medium ${!dayInfo.isCurrentMonth ? 'opacity-50' : ''}`}
                        >
                          {catInfo.label}
                        </span>
                      )
                    })}
                    {daySchedules.length > 3 && (
                      <span className="text-[11px] text-gray-400">+{daySchedules.length - 3}</span>
                    )}
                  </div>
                </div>
                
                {/* 일정 내용 */}
                <div className={`overflow-hidden ${!dayInfo.isCurrentMonth ? 'opacity-50' : ''}`}>
                  {isSingle && daySchedules.length === 1 ? (
                    // 단일 일정: 시간, 타이틀, 참석자
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetail(daySchedules[0])
                      }}
                      className="cursor-pointer hover:text-blue-600"
                    >
                      {/* 시간 */}
                      <div className="text-[13px] text-gray-500">
                        {formatTime(daySchedules[0].start_time || daySchedules[0].time)}
                        {daySchedules[0].end_time && ` - ${formatTime(daySchedules[0].end_time)}`}
                      </div>
                      {/* 타이틀 */}
                      <div className={`text-[14px] text-gray-700 truncate font-medium ${
                        daySchedules[0].is_completed ? 'line-through opacity-50' : ''
                      }`}>
                        {daySchedules[0].title}
                      </div>
                      {/* 참석자 */}
                      {daySchedules[0].attendees && daySchedules[0].attendees.length > 0 && (
                        <div className="text-[12px] text-blue-500 truncate">
                          {daySchedules[0].attendees.slice(0, 2).join(', ')}
                          {daySchedules[0].attendees.length > 2 && ` 외 ${daySchedules[0].attendees.length - 2}명`}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 복합 일정: 타이틀만 나열
                    <div className="space-y-0.5">
                      {daySchedules.slice(0, 3).map(schedule => (
                        <div
                          key={schedule.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail(schedule)
                          }}
                          className={`text-[14px] text-gray-700 truncate cursor-pointer hover:text-blue-600 ${
                            schedule.is_completed ? 'line-through opacity-50' : ''
                          }`}
                        >
                          {schedule.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================================
  // 렌더링: 목록 뷰
  // ============================================
  const renderListView = () => {
    const today = new Date().toISOString().split('T')[0]
    const filtered = filterMySchedules(schedules)
    const upcomingSchedules = filtered.filter(s => s.date >= today)
    const pastSchedules = filtered.filter(s => s.date < today).reverse()
    
    // 카드 컴포넌트
    const ScheduleCard = ({ schedule }: { schedule: Schedule }) => {
      const date = new Date(schedule.date)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekday = WEEKDAYS[date.getDay()]
      const catInfo = getCategoryInfo(schedule.category)
      
      return (
        <div
          onClick={() => openDetail(schedule)}
          className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition ${
            schedule.is_completed ? 'opacity-60' : ''
          }`}
        >
          {/* 제목 + 배지 (가로, 배지 우측) */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className={`font-semibold text-gray-800 text-[15px] truncate ${schedule.is_completed ? 'line-through' : ''}`}>
              {schedule.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`${catInfo.bgColor} ${catInfo.color} px-2 py-0.5 rounded text-[12px] font-medium`}>
                {catInfo.label}
              </span>
              {schedule.is_completed && (
                <span className="text-[12px] px-2 py-0.5 bg-green-100 text-green-600 rounded">완료</span>
              )}
            </div>
          </div>
          
          {/* 정보 */}
          <div className="space-y-1 text-[13px]">
            <p className="text-gray-500">
              <span className="text-gray-400">날짜:</span> {month}/{day} ({weekday})
            </p>
            {(schedule.start_time || schedule.time) && (
              <p className="text-gray-500">
                <span className="text-gray-400">시간:</span> {formatTime(schedule.start_time || schedule.time)}{schedule.end_time && ` - ${formatTime(schedule.end_time)}`}
              </p>
            )}
            {schedule.location && (
              <p className="text-gray-500">
                <span className="text-gray-400">장소:</span> {schedule.location}
              </p>
            )}
            {schedule.attendees && schedule.attendees.length > 0 && (
              <p className="text-blue-600 mt-2">
                <span className="text-gray-400">참석:</span> {schedule.attendees.slice(0, 3).join(', ')}{schedule.attendees.length > 3 && ` 외 ${schedule.attendees.length - 3}명`}
              </p>
            )}
          </div>
        </div>
      )
    }

    // 테이블 행 컴포넌트
    const ScheduleRow = ({ schedule }: { schedule: Schedule }) => {
      const date = new Date(schedule.date)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekday = WEEKDAYS[date.getDay()]
      const catInfo = getCategoryInfo(schedule.category)
      
      return (
        <tr 
          className={`border-b hover:bg-gray-50 cursor-pointer ${schedule.is_completed ? 'opacity-60' : ''}`}
          onClick={() => openDetail(schedule)}
        >
          <td className={`px-3 py-3 font-medium text-gray-800 ${schedule.is_completed ? 'line-through' : ''}`}>
            {schedule.title}
          </td>
          <td className="px-3 py-3">
            <span className={`${catInfo.bgColor} ${catInfo.color} px-2 py-0.5 rounded text-[12px] font-medium`}>
              {catInfo.label}
            </span>
          </td>
          <td className="px-3 py-3 text-gray-500">
            {month}/{day} ({weekday})
          </td>
          <td className="px-3 py-3 text-gray-500">
            {month}/{day} ({weekday})
          </td>
          <td className="px-3 py-3 text-gray-500">
            {formatTime(schedule.start_time || schedule.time)}
            {schedule.end_time && ` - ${formatTime(schedule.end_time)}`}
          </td>
          <td className="px-3 py-3 text-gray-500">
            {schedule.location || '-'}
          </td>
          <td className="px-3 py-3">
            {schedule.is_completed && (
              <span className="text-[12px] px-2 py-0.5 bg-green-100 text-green-600 rounded">완료</span>
            )}
          </td>
        </tr>
      )
    }

    const tableHeaders = [
      { key: 'title', label: '제목' },
      { key: 'category', label: '분야', width: '80px' },
      { key: 'date', label: '날짜', width: '100px' },
      { key: 'time', label: '시간', width: '120px' },
      { key: 'location', label: '장소', width: '120px' },
      { key: 'status', label: '상태', width: '70px' },
    ]
    
    return (
      <div className="space-y-4">
        {/* 리스트/카드 토글 */}
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-gray-500">예정된 일정 ({upcomingSchedules.length})</h3>
          <ViewModeToggle viewMode={listViewMode} setViewMode={setListViewMode} />
        </div>
        
        {/* 예정된 일정 */}
        {upcomingSchedules.length > 0 ? (
          listViewMode === 'card' ? (
            <CardGrid>
              {upcomingSchedules.map(schedule => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))}
            </CardGrid>
          ) : (
            <DataTable headers={tableHeaders}>
              {upcomingSchedules.map(schedule => (
                <ScheduleRow key={schedule.id} schedule={schedule} />
              ))}
            </DataTable>
          )
        ) : (
          <div className="text-center py-8 text-gray-400 text-[14px] bg-white rounded-lg border border-gray-100">
            예정된 일정이 없습니다
          </div>
        )}
        
        {/* 지난 일정 */}
        {pastSchedules.length > 0 && (
          <div>
            <h3 className="text-[14px] font-semibold text-gray-400 mb-2">지난 일정 ({pastSchedules.length})</h3>
            {listViewMode === 'card' ? (
              <CardGrid>
                {pastSchedules.slice(0, 8).map(schedule => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))}
              </CardGrid>
            ) : (
              <DataTable headers={tableHeaders}>
                {pastSchedules.slice(0, 10).map(schedule => (
                  <ScheduleRow key={schedule.id} schedule={schedule} />
                ))}
              </DataTable>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // 렌더링: 메인
  // ============================================
  return (
    <div className="p-4 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">월간 일정표</h1>
          <ScheduleViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          {/* 내 일정만 보기 토글 */}
          <button
            onClick={() => setShowMyOnly(!showMyOnly)}
            className={`px-3 py-1 text-[13px] rounded-lg transition ${
              showMyOnly 
                ? 'text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            👤 내 일정만
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 네비게이션 */}
          {viewMode !== 'list' && (
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                ‹
              </button>
              <span className="text-[13px] font-medium text-gray-700 min-w-[180px] text-center">
                {getHeaderText()}
              </span>
              <button
                onClick={goToNext}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                ›
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-[13px] text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                오늘
              </button>
            </div>
          )}
          
          <button
            onClick={() => openAddModal()}
            className="px-3 py-1.5 text-white rounded-lg hover:opacity-90 text-[13px]"
            style={{ backgroundColor: '#5677b0' }}
          >
            + 일정 추가
          </button>
        </div>
      </div>

      {/* 캘린더/목록 뷰 */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'list' && renderListView()}
      </div>

      {/* 일정 추가/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-800 mb-4">
              {editingSchedule ? '일정 수정' : '일정 추가'}
            </h3>
            
            <div className="space-y-3">
              {/* 제목 */}
              <div>
                <label className="block text-[14px] text-gray-600 mb-1">제목 *</label>
                <SafeInput
                  type="text"
                  value={form.title}
                  onChange={(v: string) => setForm({ ...form, title: v })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="일정 제목"
                />
              </div>
              
              {/* 카테고리 */}
              <div>
                <label className="block text-[14px] text-gray-600 mb-1">분야</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.key })}
                      className={`px-3 py-1.5 rounded-lg text-[14px] transition ${
                        form.category === cat.key
                          ? `${cat.bgColor} ${cat.color} ring-2 ring-offset-1 ring-current`
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 날짜 */}
              <div>
                <label className="block text-[14px] text-gray-600 mb-1">날짜 *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              
              {/* 시간 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[14px] text-gray-600 mb-1">시작 시간</label>
                  <SafeInput
                    type="time"
                    value={form.start_time}
                    onChange={(v: string) => setForm({ ...form, start_time: v })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-[14px] text-gray-600 mb-1">종료 시간</label>
                  <SafeInput
                    type="time"
                    value={form.end_time}
                    onChange={(v: string) => setForm({ ...form, end_time: v })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              
              {/* 장소 */}
              <div>
                <label className="block text-[14px] text-gray-600 mb-1">장소</label>
                <SafeInput
                  type="text"
                  value={form.location}
                  onChange={(v: string) => setForm({ ...form, location: v })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="장소"
                />
              </div>
              
              {/* 참석자 */}
              <div>
                <label className="block text-[14px] text-gray-600 mb-1">참석자 (쉼표로 구분)</label>
                <SafeInput
                  type="text"
                  value={form.attendees}
                  onChange={(v: string) => setForm({ ...form, attendees: v })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="홍길동, 김철수"
                />
              </div>
              
              {/* 설명 */}
              <div>
                <label className="block text-[14px] text-gray-600 mb-1">설명</label>
                <SafeTextarea
                  value={form.description}
                  onChange={(v: string) => setForm({ ...form, description: v })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  rows={3}
                  placeholder="일정에 대한 설명"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="flex-1 py-2 text-[14px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.date}
                className="flex-1 py-2 text-[14px] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#5677b0' }}
              >
                {editingSchedule ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 상세 모달 */}
      {showDetailModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-md">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <CategoryBadge category={selectedSchedule.category} />
                {selectedSchedule.is_completed && (
                  <span className="text-[13px] px-2 py-0.5 bg-green-100 text-green-600 rounded">완료</span>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <h3 className={`text-lg font-bold text-gray-800 mb-3 ${selectedSchedule.is_completed ? 'line-through' : ''}`}>
              {selectedSchedule.title}
            </h3>
            
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2 text-gray-600">
                <span>📅</span>
                <span>
                  {new Date(selectedSchedule.date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </span>
              </div>
              
              {(selectedSchedule.start_time || selectedSchedule.time) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span>🕐</span>
                  <span>
                    {formatTime(selectedSchedule.start_time || selectedSchedule.time)}
                    {selectedSchedule.end_time && ` - ${formatTime(selectedSchedule.end_time)}`}
                  </span>
                </div>
              )}
              
              {selectedSchedule.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📍</span>
                  <span>{selectedSchedule.location}</span>
                </div>
              )}
              
              {selectedSchedule.attendees && selectedSchedule.attendees.length > 0 && (
                <div className="flex items-start gap-2 text-gray-600">
                  <span>👥</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedSchedule.attendees.map(a => (
                      <span key={a} className="px-2 py-0.5 bg-gray-100 rounded text-[13px]">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedSchedule.description && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedSchedule.description}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => toggleComplete(selectedSchedule)}
                className={`flex-1 py-2 text-[14px] rounded-lg ${
                  selectedSchedule.is_completed
                    ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                }`}
              >
                {selectedSchedule.is_completed ? '미완료로 변경' : '완료로 표시'}
              </button>
              <button
                onClick={() => openEditModal(selectedSchedule)}
                className="flex-1 py-2 text-[14px] text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                수정
              </button>
              <button
                onClick={() => handleDelete(selectedSchedule)}
                className="px-4 py-2 text-[14px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
