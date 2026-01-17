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

export default function MessengerPopup() {
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (roomId) { fetchMessages(); subscribeToMessages() } }, [roomId])
  useEffect(() => { scrollToBottom() }, [messages])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) { setUser(session.user); await getOrCreateRoom() }
    setLoading(false)
  }

  const getOrCreateRoom = async () => {
    const { data: rooms } = await supabase.from('chat_rooms').select('*').limit(1)
    if (rooms && rooms.length > 0) {
      setRoomId(rooms[0].id)
    } else {
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({ name: '팀 채팅방', is_group: true })
        .select()
        .single()
      if (newRoom) setRoomId(newRoom.id)
    }
  }

  const fetchMessages = async () => {
    if (!roomId) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50)
    if (data) setMessages(data)
  }

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`popup-room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
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
    if (!newMessage.trim() || !roomId || !user) return
    await supabase.from('messages').insert({
      content: newMessage,
      sender_id: user.id,
      room_id: roomId,
    })
    setNewMessage('')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
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
    <div className="h-screen flex flex-col bg-white">
      {/* 헤더 */}
      <div 
        className="px-4 py-3 bg-blue-500 text-white flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-2">
          <span>💬</span>
          <span className="font-medium text-sm">팀 채팅</span>
        </div>
        <span className="text-xs opacity-75">{messages.length}개 메시지</span>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%]`}>
                {!isMe && (
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
        })}
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
            placeholder="메시지 입력..."
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
  )
}
