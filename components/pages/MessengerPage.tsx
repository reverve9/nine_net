'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface MessengerPageProps {
  user: any
}

interface Message {
  id: string
  content: string
  sender_id: string
  room_id: string
  created_at: string
  sender?: {
    name: string
  }
}

interface ChatRoom {
  id: string
  name: string
  is_group: boolean
}

export default function MessengerPage({ user }: MessengerPageProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    if (currentRoom) {
      fetchMessages(currentRoom.id)
      
      // 실시간 구독
      const subscription = supabase
        .channel(`room:${currentRoom.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${currentRoom.id}`,
          },
          async (payload) => {
            // 새 메시지 발신자 정보 가져오기
            const { data: sender } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single()
            
            const newMsg = {
              ...payload.new,
              sender,
            } as Message
            
            setMessages((prev) => [...prev, newMsg])
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [currentRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchRooms = async () => {
    // 기본 팀 채팅방이 없으면 생성
    const { data: existingRooms } = await supabase
      .from('chat_rooms')
      .select('*')
    
    if (!existingRooms || existingRooms.length === 0) {
      // 기본 채팅방 생성
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({ name: '팀 채팅방', is_group: true })
        .select()
        .single()
      
      if (newRoom) {
        setRooms([newRoom])
        setCurrentRoom(newRoom)
      }
    } else {
      setRooms(existingRooms)
      setCurrentRoom(existingRooms[0])
    }
    setLoading(false)
  }

  const fetchMessages = async (roomId: string) => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(name)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentRoom) return

    const { error } = await supabase.from('messages').insert({
      content: newMessage,
      sender_id: user.id,
      room_id: currentRoom.id,
    })

    if (!error) {
      setNewMessage('')
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* 채팅방 목록 */}
      <div className="w-64 border-r border-gray-200 bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700">메시지</h3>
        </div>
        <div className="p-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setCurrentRoom(room)}
              className={`w-full text-left rounded-lg p-3 mb-1 transition ${
                currentRoom?.id === room.id
                  ? 'bg-white border-l-4 border-blue-500'
                  : 'hover:bg-white'
              }`}
            >
              <p className="font-medium text-gray-700">{room.name}</p>
              <p className="text-sm text-gray-500 truncate">
                {room.is_group ? '그룹 채팅' : '1:1 채팅'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {currentRoom ? (
          <>
            {/* 채팅방 헤더 */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-700">{currentRoom.name}</h3>
              <p className="text-sm text-gray-400">
                {currentRoom.is_group ? '그룹 채팅' : '1:1 채팅'}
              </p>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user.id
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isMe ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="text-2xl">👤</span>
                    <div className={isMe ? 'items-end' : ''}>
                      <p className="text-xs text-gray-400 mb-1">
                        {msg.sender?.name || '나'} · {formatTime(msg.created_at)}
                      </p>
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-xs ${
                          isMe
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력창 */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                >
                  전송
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            채팅방을 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}
