'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ChatRoom {
  id: string
  name: string
  is_group: boolean
  is_self?: boolean
  created_at: string
}

interface Member {
  id: string
  name: string
  email: string
  status: 'online' | 'away' | 'offline'
  role?: string
}

type TabType = 'chats' | 'members' | 'settings'

export default function MessengerMain() {
  const [user, setUser] = useState<any>(null)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('chats')
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'offline'>('online')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (user) { fetchRooms(); fetchMembers() } }, [user])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) { setUser(session.user) }
    setLoading(false)
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
      await supabase
        .from('chat_rooms')
        .insert({ name: '나와의 채팅', is_group: false, is_self: true, created_by: user.id })
    }

    const { data: allRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false })

    if (allRooms) {
      const sortedRooms = allRooms.sort((a, b) => {
        if (a.is_self) return -1
        if (b.is_self) return 1
        return 0
      })
      setRooms(sortedRooms)
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
      // 웹에서는 새 탭으로
      window.open(`/chat/${room.id}`, '_blank')
    }
  }

  const startDirectChat = async (member: Member) => {
    const roomName = member.name || member.email?.split('@')[0]
    
    // 기존 1:1 채팅방 찾기
    const { data: existingRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('is_group', false)
      .eq('is_self', false)

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

  const updateUserStatus = async (status: 'online' | 'away' | 'offline') => {
    setUserStatus(status)
    await supabase.from('profiles').update({ status }).eq('id', user.id)
  }

  const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = { online: 'bg-green-500', away: 'bg-yellow-500', offline: 'bg-gray-300' }
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-300'}`}></span>
  }

  const filteredRooms = rooms.filter(r => 
    (r.is_self ? '나와의 채팅' : r.name).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMembers = members.filter(m => 
    (m.name || m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-500 text-sm text-center">메인 앱에서 로그인해주세요</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-white">
      {/* 아이콘 사이드바 */}
      <div className="w-14 bg-gray-900 flex flex-col items-center py-4 gap-3">
        <button
          onClick={() => setActiveTab('chats')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition ${
            activeTab === 'chats' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          💬
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition ${
            activeTab === 'members' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          👥
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition ${
            activeTab === 'settings' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          ⚙️
        </button>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div 
          className="px-4 py-3 border-b border-gray-200 flex items-center gap-3"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <h1 className="font-semibold text-gray-800">
            {activeTab === 'chats' ? '채팅' : activeTab === 'members' ? '멤버' : '설정'}
          </h1>
          {activeTab !== 'settings' && (
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ WebkitAppRegion: 'no-drag' } as any}
            />
          )}
          {activeTab === 'chats' && (
            <button
              onClick={createGroupChat}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              + 그룹
            </button>
          )}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 채팅방 리스트 */}
          {activeTab === 'chats' && (
            <div className="divide-y divide-gray-100">
              {filteredRooms.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">채팅방이 없습니다</p>
              ) : (
                filteredRooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => openChatWindow(room)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                      {room.is_self ? '📝' : room.is_group ? '👥' : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {room.is_self ? '나와의 채팅' : room.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {room.is_self ? '메모, 파일 보관용' : room.is_group ? '그룹 채팅' : '1:1 채팅'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 멤버 리스트 */}
          {activeTab === 'members' && (
            <div className="divide-y divide-gray-100">
              {filteredMembers.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">멤버가 없습니다</p>
              ) : (
                filteredMembers.map(member => (
                  <div
                    key={member.id}
                    onClick={() => startDirectChat(member)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate flex items-center gap-2">
                        {member.name || member.email?.split('@')[0]}
                        <StatusDot status={member.status || 'offline'} />
                      </p>
                      <p className="text-sm text-gray-400">{member.role || '팀원'}</p>
                    </div>
                    <button className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
                      채팅
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 설정 */}
          {activeTab === 'settings' && (
            <div className="p-4 space-y-6">
              {/* 내 상태 */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">내 상태</p>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  {(['online', 'away', 'offline'] as const).map((status, i) => (
                    <button
                      key={status}
                      onClick={() => updateUserStatus(status)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                        userStatus === status ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                      } ${i > 0 ? 'border-t border-gray-200' : ''}`}
                    >
                      <StatusDot status={status} />
                      <span className="flex-1 text-left">
                        {status === 'online' ? '온라인' : status === 'away' ? '자리비움' : '오프라인'}
                      </span>
                      {userStatus === status && <span className="text-blue-500">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 알림 */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">알림</p>
                <div 
                  onClick={() => setNotificationEnabled(!notificationEnabled)}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                >
                  <span className="text-sm text-gray-700">알림 받기</span>
                  <div className={`w-12 h-7 rounded-full relative transition ${notificationEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${notificationEnabled ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>

              {/* 계정 정보 */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">계정</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-700">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
