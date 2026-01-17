'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

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
}

export default function ChatWindow() {
  const params = useParams()
  const roomId = params.roomId as string
  
  const [user, setUser] = useState<any>(null)
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isElectron, setIsElectron] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { 
    checkAuth()
    setIsElectron(!!window.electronAPI?.isElectron)
  }, [])
  useEffect(() => { if (user && roomId) { fetchRoom(); fetchMessages(); subscribeToMessages() } }, [user, roomId])
  useEffect(() => { scrollToBottom() }, [messages])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) { setUser(session.user) }
    setLoading(false)
  }

  const fetchRoom = async () => {
    const { data } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single()
    if (data) setRoom(data)
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`chat-room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const { data: sender } = await supabase.from('profiles').select('name').eq('id', payload.new.sender_id).single()
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

  const handleClose = () => {
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow()
    }
  }

  const handleMinimize = () => {
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow()
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white rounded-xl">
        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white rounded-xl p-4">
        <p className="text-gray-500 text-xs">로그인이 필요합니다</p>
      </div>
    )
  }

  const roomName = room?.is_self ? '나와의 채팅' : room?.name || '채팅'

  return (
    <div className="h-screen flex flex-col bg-white rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div 
        className="px-3 py-2 bg-blue-500 text-white flex items-center gap-2"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* 커스텀 신호등 버튼 */}
        {isElectron && (
          <div className="flex gap-1.5 mr-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-white/30 hover:bg-[#ff5f57] transition"
            />
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-white/30 hover:bg-[#ffbd2e] transition"
            />
            <button
              className="w-3 h-3 rounded-full bg-white/30 hover:bg-[#28c840] transition"
            />
          </div>
        )}
        
        <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm">
          {room?.is_self ? '📝' : room?.is_group ? '👥' : '👤'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{roomName}</p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 text-xs mt-8">
            {room?.is_self ? '메모를 작성해보세요 ✏️' : '첫 메시지를 보내보세요 👋'}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!isMe && !room?.is_self && (
                    <p className="text-xs text-gray-400 mb-0.5 ml-1">{msg.sender?.name || '알 수 없음'}</p>
                  )}
                  <div className={`px-3 py-1.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-xs text-gray-300 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
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
      <div className="p-2 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={room?.is_self ? '메모 입력...' : '메시지 입력...'}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition disabled:opacity-50"
          >
            <span className="text-sm">↑</span>
          </button>
        </div>
      </div>
    </div>
  )
}
