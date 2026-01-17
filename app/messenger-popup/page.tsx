'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  content: string
  sender_id: string
  room_id: string
  created_at: string
  sender?: { name: string }
}

interface ChatRoom {
  id: string
  name: string
  is_group: boolean
  is_self?: boolean
  created_at: string
  last_message?: string
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

export default function MessengerPopup() {
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('chats')
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'offline'>('online')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (user) { fetchRooms(); fetchMembers() } }, [user])
  useEffect(() => { if (currentRoom) { fetchMessages(); subscribeToMessages() } }, [currentRoom])
  useEffect(() => { scrollToBottom() }, [messages])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
    }
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

    let selfChatRoom = selfRoom
    if (!selfRoom) {
      const { data: newSelfRoom } = await supabase
        .from('chat_rooms')
        .insert({ name: '나와의 채팅', is_group: false, is_self: true, created_by: user.id })
        .select()
        .single()
      selfChatRoom = newSelfRoom
    }

    // 전체 채팅방 가져오기
    const { data: allRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false })

    if (allRooms) {
      // 나와의 채팅을 맨 위로
      const sortedRooms = allRooms.sort((a, b) => {
        if (a.is_self) return -1
        if (b.is_self) return 1
        return 0
      })
      setRooms(sortedRooms)
      if (!currentRoom && sortedRooms.length > 0) {
        setCurrentRoom(sortedRooms[0])
      }
    }
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
    if (data) setMembers(data)
  }

  const fetchMessages = async () => {
    if (!currentRoom) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(name)')
      .eq('room_id', currentRoom.id)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  const subscribeToMessages = () => {
    if (!currentRoom) return
    const subscription = supabase
      .channel(`messenger-room:${currentRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${currentRoom.id}`,
      }, async (payload) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', payload.new.sender_id)
          .single()
        const newMsg = { ...payload.new, sender } as Message
        setMessages((prev) => [...prev, newMsg])
      })
      .subscribe()
    return () => subscription.unsubscribe()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !currentRoom || !user) return
    await supabase.from('messages').insert({
      content: newMessage,
      sender_id: user.id,
      room_id: currentRoom.id,
    })
    setNewMessage('')
  }

  const startDirectChat = async (member: Member) => {
    // 기존 1:1 채팅방 찾기
    const { data: existingRoom } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('is_group', false)
      .eq('is_self', false)
      .or(`name.eq.${member.name},name.eq.${user.email?.split('@')[0]}`)
      .single()

    if (existingRoom) {
      setCurrentRoom(existingRoom)
    } else {
      // 새 1:1 채팅방 생성
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({ 
          name: member.name, 
          is_group: false, 
          is_self: false,
          created_by: user.id 
        })
        .select()
        .single()
      if (newRoom) {
        setRooms(prev => [newRoom, ...prev])
        setCurrentRoom(newRoom)
      }
    }
    setActiveTab('chats')
  }

  const createGroupChat = async () => {
    const name = prompt('그룹 채팅방 이름을 입력하세요:')
    if (!name) return
    
    const { data: newRoom } = await supabase
      .from('chat_rooms')
      .insert({ name, is_group: true, is_self: false, created_by: user.id })
      .select()
      .single()
    
    if (newRoom) {
      setRooms(prev => [newRoom, ...prev])
      setCurrentRoom(newRoom)
    }
  }

  const updateUserStatus = async (status: 'online' | 'away' | 'offline') => {
    setUserStatus(status)
    await supabase
      .from('profiles')
      .update({ status })
      .eq('id', user.id)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      offline: 'bg-gray-300',
    }
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-300'}`}></span>
  }

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
      {/* 사이드바 토글 버튼 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-3 left-3 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-600"
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* 사이드바 */}
      {sidebarOpen && (
        <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
          {/* 탭 헤더 */}
          <div className="flex border-b border-gray-200 mt-12">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2 text-xs font-medium ${activeTab === 'members' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              👥 멤버
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 text-xs font-medium ${activeTab === 'chats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              💬 채팅
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 text-xs font-medium ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              ⚙️ 설정
            </button>
          </div>

          {/* 탭 내용 */}
          <div className="flex-1 overflow-y-auto">
            {/* 멤버 탭 */}
            {activeTab === 'members' && (
              <div className="p-2">
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="멤버 검색..."
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  {members.map(member => (
                    <div
                      key={member.id}
                      onClick={() => startDirectChat(member)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">
                        👤
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate flex items-center gap-1">
                          {member.name || member.email?.split('@')[0]}
                          <StatusDot status={member.status || 'offline'} />
                        </p>
                        <p className="text-xs text-gray-400">{member.role || '팀원'}</p>
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">멤버가 없습니다</p>
                  )}
                </div>
              </div>
            )}

            {/* 채팅방 탭 */}
            {activeTab === 'chats' && (
              <div className="p-2">
                <button
                  onClick={createGroupChat}
                  className="w-full mb-2 px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  + 새 그룹 만들기
                </button>
                <div className="space-y-1">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      onClick={() => setCurrentRoom(room)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${currentRoom?.id === room.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-white'}`}
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                        {room.is_self ? '📝' : room.is_group ? '👥' : '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {room.is_self ? '나와의 채팅' : room.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {room.is_self ? '메모용' : room.is_group ? '그룹' : '1:1'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 설정 탭 */}
            {activeTab === 'settings' && (
              <div className="p-3 space-y-4">
                {/* 상태 변경 */}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">내 상태</p>
                  <div className="space-y-1">
                    {(['online', 'away', 'offline'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => updateUserStatus(status)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg ${userStatus === status ? 'bg-blue-50 text-blue-600' : 'hover:bg-white'}`}
                      >
                        <StatusDot status={status} />
                        {status === 'online' ? '온라인' : status === 'away' ? '자리비움' : '오프라인'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 알림 설정 */}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">알림</p>
                  <label className="flex items-center justify-between px-3 py-2 bg-white rounded-lg cursor-pointer">
                    <span className="text-xs text-gray-600">알림 받기</span>
                    <div
                      onClick={() => setNotificationEnabled(!notificationEnabled)}
                      className={`w-10 h-5 rounded-full relative ${notificationEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${notificationEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div 
          className="px-4 py-3 bg-blue-500 text-white flex items-center justify-between"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div className="flex items-center gap-2 ml-8">
            <span>{currentRoom?.is_self ? '📝' : currentRoom?.is_group ? '👥' : '💬'}</span>
            <span className="font-medium text-sm">
              {currentRoom?.is_self ? '나와의 채팅' : currentRoom?.name || '채팅'}
            </span>
          </div>
          <span className="text-xs opacity-75">{messages.length}개 메시지</span>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mt-10">
              {currentRoom?.is_self ? '메모를 작성해보세요' : '아직 메시지가 없어요'}
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user.id
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    {!isMe && !currentRoom?.is_self && (
                      <p className="text-xs text-gray-400 mb-1 ml-1">
                        {msg.sender?.name || '알 수 없음'}
                      </p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <p className={`text-xs text-gray-300 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div className="p-3 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={currentRoom?.is_self ? '메모 입력...' : '메시지 입력...'}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
