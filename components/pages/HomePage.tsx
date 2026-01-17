'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type PageType = 'home' | 'messenger' | 'board' | 'schedule' | 'settings'

interface HomePageProps {
  user: any
  profile: any
  setCurrentPage: (page: PageType) => void
}

export default function HomePage({ user, profile, setCurrentPage }: HomePageProps) {
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [todaySchedules, setTodaySchedules] = useState<any[]>([])

  useEffect(() => {
    fetchTeamMembers()
    fetchRecentMessages()
    fetchTodaySchedules()
  }, [])

  const fetchTeamMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .limit(10)
    
    if (data) setTeamMembers(data)
  }

  const fetchRecentMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (data) setRecentMessages(data)
  }

  const fetchTodaySchedules = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(3)
    
    if (data) setTodaySchedules(data)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '좋은 아침이에요!'
    if (hour < 18) return '좋은 오후에요!'
    return '좋은 저녁이에요!'
  }

  const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      offline: 'bg-gray-300',
    }
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-300'}`}
      ></span>
    )
  }

  const quickAccess = [
    { id: 'messenger' as PageType, icon: '💬', label: '메신저' },
    { id: 'board' as PageType, icon: '📋', label: '게시판' },
    { id: 'schedule' as PageType, icon: '📅', label: '일정' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {getGreeting()} 👋
      </h1>
      <p className="text-gray-500 mb-8">
        {profile?.name || user?.email?.split('@')[0]}님, 오늘도 좋은 하루 되세요.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 빠른 접근 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>⚡</span> 빠른 접근
          </h3>
          <div className="space-y-2">
            {quickAccess.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition flex items-center gap-3 text-gray-600"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 최근 메시지 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>💬</span> 최근 메시지
          </h3>
          <div className="space-y-3">
            {recentMessages.length > 0 ? (
              recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <span className="text-xl">👤</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">
                      {msg.sender?.name || '알 수 없음'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{msg.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">아직 메시지가 없습니다</p>
            )}
          </div>
        </div>

        {/* 오늘 일정 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>📅</span> 다가오는 일정
          </h3>
          <div className="space-y-3">
            {todaySchedules.length > 0 ? (
              todaySchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {schedule.time?.slice(0, 5)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {schedule.title}
                    </p>
                    <p className="text-xs text-gray-400">{schedule.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">예정된 일정이 없습니다</p>
            )}
          </div>
        </div>

        {/* 팀원 현황 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 md:col-span-2 lg:col-span-3">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>👥</span> 팀원 현황
          </h3>
          <div className="flex flex-wrap gap-4">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg"
                >
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {member.name || member.email?.split('@')[0]}
                      <StatusDot status={member.status || 'offline'} />
                    </p>
                    <p className="text-xs text-gray-400">{member.role || '팀원'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">아직 등록된 팀원이 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
