'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ChatRoom {
  id: string
  name: string
  is_group: boolean
  is_self?: boolean
  created_at: string
  last_message?: string
  last_message_time?: string
  unread_count?: number
}

interface Member {
  id: string
  name: string
  email: string
  status: 'online' | 'away' | 'offline'
  role?: string
}

type TabType = 'members' | 'chats' | 'settings'

export default function MessengerMain() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Member | null>(null)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('members')
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => { 
    checkAuth()
    setIsElectron(!!window.electronAPI?.isElectron)
  }, [])
  useEffect(() => { if (user) { fetchProfile(); fetchRooms(); fetchMembers() } }, [user])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) { setUser(session.user) }
    setLoading(false)
  }

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  const fetchRooms = async () => {
    // 나와의 채팅방 확인/생성
    const { data: selfRoom } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('is_self', true)
      .eq('created_by', user.id)
      .single()

    if (!selfRoom) {
      await supabase.from('chat_rooms').insert({ name: '나와의 채팅', is_group: false, is_self: true, created_by: user.id })
    }

    // 모든 채팅방 가져오기
    const { data: allRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .or(`created_by.eq.${user.id},is_group.eq.true`)
      .order('created_at', { ascending: false })

    if (allRooms) {
      // 각 채팅방의 최신 메시지 가져오기
      const roomsWithMessages = await Promise.all(
        allRooms.map(async (room) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // 안 읽은 메시지 수 (간단히 구현)
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .neq('sender_id', user.id)

          return {
            ...room,
            last_message: lastMsg?.content || '',
            last_message_time: lastMsg?.created_at || room.created_at,
            unread_count: 0 // 실제 구현 시 읽음 표시 테이블 필요
          }
        })
      )

      // 나와의 채팅을 맨 위로, 나머지는 최신 메시지 순
      const sortedRooms = roomsWithMessages.sort((a, b) => {
        if (a.is_self) return -1
        if (b.is_self) return 1
        return new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
      })

      // 중복 제거 (나와의 채팅이 여러 개인 경우)
      const uniqueRooms = sortedRooms.filter((room, index, self) => {
        if (room.is_self) {
          return index === self.findIndex(r => r.is_self && r.created_by === user.id)
        }
        return true
      })

      setRooms(uniqueRooms)
    }
  }

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').neq('id', user.id)
    if (data) setMembers(data)
  }

  const openChatWindow = (room: ChatRoom) => {
    const roomName = room.is_self ? '나와의 채팅' : room.name
    if (window.electronAPI?.isElectron) {
      window.electronAPI.openChat(room.id, roomName)
    } else {
      window.open(`/chat/${room.id}`, '_blank')
    }
  }

  const openSelfChat = async () => {
    const selfRoom = rooms.find(r => r.is_self)
    if (selfRoom) openChatWindow(selfRoom)
    setShowProfileModal(false)
  }

  const startDirectChat = async (member: Member) => {
    const roomName = member.name || member.email?.split('@')[0]
    const { data: existingRooms } = await supabase.from('chat_rooms').select('*').eq('is_group', false).eq('is_self', false)
    const existing = existingRooms?.find(r => r.name === roomName)
    
    if (existing) {
      openChatWindow(existing)
    } else {
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({ name: roomName, is_group: false, is_self: false, created_by: user.id })
        .select()
        .single()
      if (newRoom) {
        setRooms(prev => [...prev, newRoom])
        openChatWindow(newRoom)
      }
    }
  }

  const createGroupChat = async () => {
    const name = prompt('그룹 채팅방 이름:')
    if (!name) return
    const { data: newRoom } = await supabase
      .from('chat_rooms')
      .insert({ name, is_group: true, is_self: false, created_by: user.id })
      .select()
      .single()
    if (newRoom) {
      setRooms(prev => [...prev, newRoom])
      openChatWindow(newRoom)
    }
  }

  const leaveRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('채팅방을 나가시겠습니까?')) return
    
    // room_members에서 삭제
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', user.id)
    
    // 리스트에서 제거
    setRooms(prev => prev.filter(r => r.id !== roomId))
  }

  const updateUserStatus = async (status: 'online' | 'away' | 'offline') => {
    await supabase.from('profiles').update({ status }).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, status } : null)
    setShowProfileModal(false)
  }

  const handleClose = () => {
    window.electronAPI?.closeWindow?.()
  }

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.()
  }

  const StatusDot = ({ status, size = 'sm' }: { status: string, size?: 'sm' | 'md' }) => {
    const colors: Record<string, string> = { online: 'bg-green-500', away: 'bg-yellow-500', offline: 'bg-gray-400' }
    const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'
    return <span className={`inline-block ${sizeClass} rounded-full ${colors[status] || 'bg-gray-400'}`}></span>
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-500 text-xs">메인 앱에서 로그인해주세요</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* 사이드바 - 드래그 영역 */}
      <div 
        className="w-[70px] bg-gray-100 flex flex-col items-center pt-3 pb-4"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* 커스텀 신호등 버튼 */}
        {isElectron && (
          <div className="flex gap-2 mb-6" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button onClick={handleClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition" />
            <button onClick={handleMinimize} className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-90 transition" />
            <button className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition" />
          </div>
        )}
        
        {/* 탭 아이콘 */}
        <div className="flex flex-col items-center gap-4 mt-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => setActiveTab('members')}
            className={`w-7 h-7 flex items-center justify-center transition ${
              activeTab === 'members' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`w-7 h-7 flex items-center justify-center transition ${
              activeTab === 'chats' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </button>
        </div>
        
        <div className="flex-1" />
        
        {/* 설정 */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-7 h-7 flex items-center justify-center transition ${
            activeTab === 'settings' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
          }`}
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-800">
            {activeTab === 'chats' ? '채팅' : activeTab === 'members' ? '멤버' : '설정'}
          </h1>
          {activeTab === 'chats' && (
            <button
              onClick={createGroupChat}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 멤버 리스트 */}
          {activeTab === 'members' && (
            <div>
              {/* 나 */}
              <div
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-base">👤</div>
                  <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-white rounded-full">
                    <StatusDot status={profile?.status || 'offline'} size="md" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{profile?.name || user.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-400">{profile?.role || '나'}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 my-1" />

              {members.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-8">다른 멤버가 없습니다</p>
              ) : (
                members.map(member => (
                  <div
                    key={member.id}
                    onClick={() => startDirectChat(member)}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-base">👤</div>
                      <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-white rounded-full">
                        <StatusDot status={member.status || 'offline'} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{member.name || member.email?.split('@')[0]}</p>
                      <p className="text-xs text-gray-400">{member.role || '팀원'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 채팅방 리스트 */}
          {activeTab === 'chats' && (
            <div>
              {rooms.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-8">채팅방이 없습니다</p>
              ) : (
                rooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => openChatWindow(room)}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      {room.is_self ? '📝' : room.is_group ? '👥' : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{room.is_self ? '나와의 채팅' : room.name}</p>
                      <p className="text-xs text-gray-400 truncate">{room.last_message || (room.is_self ? '메모' : room.is_group ? '그룹' : '1:1')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">{formatTime(room.last_message_time || '')}</span>
                      {room.unread_count && room.unread_count > 0 && (
                        <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {room.unread_count > 99 ? '99+' : room.unread_count}
                        </span>
                      )}
                    </div>
                    {/* 나가기 버튼 (나와의 채팅 제외) */}
                    {!room.is_self && (
                      <button
                        onClick={(e) => leaveRoom(room.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 설정 */}
          {activeTab === 'settings' && (
            <div className="p-3 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">알림</p>
                <div 
                  onClick={() => setNotificationEnabled(!notificationEnabled)}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg cursor-pointer"
                >
                  <span className="text-sm text-gray-700">알림 받기</span>
                  <div className={`w-10 h-6 rounded-full relative transition ${notificationEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notificationEnabled ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">계정</p>
                <div className="px-3 py-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 프로필/상태 변경 모달 */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-xl p-4 w-52 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-3">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl mb-2">👤</div>
              <p className="font-medium text-gray-800 text-sm">{profile?.name || user.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            
            <p className="text-xs text-gray-500 mb-2">상태 변경</p>
            <div className="space-y-1">
              {(['online', 'away', 'offline'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => updateUserStatus(status)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg ${
                    profile?.status === status ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <StatusDot status={status} size="md" />
                  {status === 'online' ? '온라인' : status === 'away' ? '자리비움' : '오프라인'}
                  {profile?.status === status && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-3 pt-3">
              <button
                onClick={openSelfChat}
                className="w-full text-xs text-gray-600 hover:text-gray-800 py-1"
              >
                나와의 채팅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
