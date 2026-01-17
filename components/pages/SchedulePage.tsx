'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SchedulePageProps {
  user: any
}

interface Schedule {
  id: string
  title: string
  description?: string
  date: string
  time: string
  attendees: string[]
  created_by: string
  created_at: string
}

export default function SchedulePage({ user }: SchedulePageProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    attendees: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    
    if (data) setSchedules(data)
    setLoading(false)
  }

  const handleCreateSchedule = async () => {
    if (!newSchedule.title.trim() || !newSchedule.date || !newSchedule.time) return

    const attendeesArray = newSchedule.attendees
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a)

    const { error } = await supabase.from('schedules').insert({
      title: newSchedule.title,
      description: newSchedule.description,
      date: newSchedule.date,
      time: newSchedule.time,
      attendees: attendeesArray.length > 0 ? attendeesArray : ['전원'],
      created_by: user.id,
    })

    if (!error) {
      setNewSchedule({ title: '', description: '', date: '', time: '', attendees: '' })
      setIsAdding(false)
      fetchSchedules()
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('일정을 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId)

    if (!error) {
      fetchSchedules()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return { month, day, weekday }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📅 일정</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
        >
          <span>{isAdding ? '×' : '+'}</span> {isAdding ? '취소' : '일정 추가'}
        </button>
      </div>

      {/* 일정 추가 폼 */}
      {isAdding && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">새 일정 추가</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 *
              </label>
              <input
                type="text"
                value={newSchedule.title}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="일정 제목"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                참석자 (쉼표로 구분)
              </label>
              <input
                type="text"
                value={newSchedule.attendees}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, attendees: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="홍길동, 김철수"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                날짜 *
              </label>
              <input
                type="date"
                value={newSchedule.date}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시간 *
              </label>
              <input
                type="time"
                value={newSchedule.time}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, time: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={newSchedule.description}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, description: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                placeholder="일정에 대한 설명"
              />
            </div>
          </div>
          <button
            onClick={handleCreateSchedule}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            추가하기
          </button>
        </div>
      )}

      {/* 일정 목록 */}
      {schedules.length > 0 ? (
        <div className="grid gap-4">
          {schedules.map((schedule) => {
            const { month, day, weekday } = formatDate(schedule.date)
            return (
              <div
                key={schedule.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-lg flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs text-blue-400">{month}월</span>
                    <span className="text-xl font-bold text-blue-600">{day}</span>
                    <span className="text-xs text-blue-400">{weekday}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{schedule.title}</h3>
                    <p className="text-sm text-gray-500">{schedule.time}</p>
                    {schedule.description && (
                      <p className="text-sm text-gray-400 mt-1">
                        {schedule.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">참석자:</span>
                      {schedule.attendees?.map((attendee) => (
                        <span
                          key={attendee}
                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {attendee}
                        </span>
                      ))}
                    </div>
                  </div>
                  {schedule.created_by === user.id && (
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-gray-300 hover:text-red-500 transition"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          예정된 일정이 없습니다. 새 일정을 추가해보세요!
        </div>
      )}
    </div>
  )
}
