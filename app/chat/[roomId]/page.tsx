'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

interface Message {
  id: string
  content: string
  content_type: 'text' | 'file'
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

interface Member {
  id: string
  name: string
  email: string
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
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [roomMembers, setRoomMembers] = useState<string[]>([])
  const [showFileModal, setShowFileModal] = useState(false)
  const [filePath, setFilePath] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { 
    checkAuth()
    setIsElectron(!!window.electronAPI?.isElectron)
  }, [])
  useEffect(() => { if (user && roomId) { fetchRoom(); fetchMessages(); fetchMembers(); subscribeToMessages() } }, [user, roomId])
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

  const fetchMembers = async () => {
    // 전체 멤버
    const { data: all } = await supabase.from('profiles').select('id, name, email')
    if (all) setAllMembers(all)
    
    // 채팅방 멤버 (room_members 테이블이 있다면)
    const { data: members } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
    if (members) setRoomMembers(members.map(m => m.user_id))
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
      content: newMessage.trim(),
      content_type: 'text',
      sender_id: user.id,
      room_id: roomId,
    })
    setNewMessage('')
    
    // textarea 높이 리셋
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    
    // 자동 높이 조절
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px'
  }

  const handleSendFile = async () => {
    if (!filePath.trim() || !roomId || !user) return
    
    await supabase.from('messages').insert({
      content: filePath.trim(),
      content_type: 'file',
      sender_id: user.id,
      room_id: roomId,
    })
    setFilePath('')
    setShowFileModal(false)
  }

  const handleInviteMember = async (memberId: string) => {
    // room_members에 추가
    await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: memberId,
    })
    setRoomMembers(prev => [...prev, memberId])
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

  const openFilePath = (path: string) => {
    // Electron에서 파일 경로 열기
    if (window.electronAPI?.isElectron) {
      // shell.openPath 호출 필요 (preload에 추가해야 함)
      alert(`파일 경로: ${path}\n\n이 경로를 파일 탐색기에서 열어주세요.`)
    } else {
      alert(`파일 경로: ${path}`)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredMessages = searchQuery 
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const availableMembers = allMembers.filter(m => 
    m.id !== user?.id && !roomMembers.includes(m.id)
  )

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
        <p className="text-gray-500 text-xs">로그인이 필요합니다</p>
      </div>
    )
  }

  const roomName = room?.is_self ? '나와의 채팅' : room?.name || '채팅'

  return (
    <div className="h-screen flex flex-col bg-[#b2c7d9] overflow-hidden">
      {/* 헤더 */}
      <div 
        className="bg-[#b2c7d9] px-3 pt-2 pb-3"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* 신호등 버튼 */}
        {isElectron && (
          <div className="flex gap-2 mb-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button onClick={handleClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition" />
            <button onClick={handleMinimize} className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-90 transition" />
            <button className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition" />
          </div>
        )}
        
        {/* 프로필 + 버튼들 */}
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center text-lg">
            {room?.is_self ? '📝' : room?.is_group ? '👥' : '👤'}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{roomName}</p>
            {room?.is_group && <p className="text-xs text-gray-600">{roomMembers.length + 1}명 참여중</p>}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black/10 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {!room?.is_self && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black/10 rounded-full transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {showSearch && (
          <div className="mt-2">
            <input
              type="text"
              placeholder="대화 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white/70 rounded-lg focus:outline-none focus:bg-white"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredMessages.length === 0 ? (
          <p className="text-center text-gray-500 text-xs mt-8">
            {searchQuery ? '검색 결과가 없습니다' : room?.is_self ? '메모를 작성해보세요 ✏️' : '첫 메시지를 보내보세요 👋'}
          </p>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.sender_id === user.id
            const isFile = msg.content_type === 'file'
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!isMe && !room?.is_self && (
                    <p className="text-xs text-gray-600 mb-0.5 ml-1">{msg.sender?.name || '알 수 없음'}</p>
                  )}
                  <div className="flex items-end gap-1">
                    {isMe && <p className="text-xs text-gray-500 mb-0.5">{formatTime(msg.created_at)}</p>}
                    
                    {isFile ? (
                      <button
                        onClick={() => openFilePath(msg.content)}
                        className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${
                          isMe ? 'bg-[#fee500] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="underline truncate max-w-[150px]">{msg.content.split('/').pop() || msg.content}</span>
                      </button>
                    ) : (
                      <div className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                        isMe ? 'bg-[#fee500] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                    
                    {!isMe && <p className="text-xs text-gray-500 mb-0.5">{formatTime(msg.created_at)}</p>}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 - 카카오톡 스타일 */}
      <div className="bg-white border-t border-gray-200">
        {/* 상단 아이콘 바 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <button
            onClick={() => setShowFileModal(true)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
        </div>
        
        {/* 텍스트 입력 + 전송 */}
        <div className="flex items-end gap-2 p-2">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={room?.is_self ? '메모 입력...' : '메시지 입력...'}
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none overflow-hidden"
            style={{ minHeight: '40px', maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-[#fee500] text-gray-900 rounded-lg flex items-center justify-center hover:bg-[#fada0a] transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <span className="text-sm font-medium">전송</span>
          </button>
        </div>
      </div>

      {/* 멤버 초대 모달 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-xl p-4 w-64 max-h-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-gray-800">멤버 초대</p>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            {availableMembers.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">초대할 수 있는 멤버가 없습니다</p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {availableMembers.map(member => (
                  <div
                    key={member.id}
                    onClick={() => handleInviteMember(member.id)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">👤</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{member.name || member.email?.split('@')[0]}</p>
                    </div>
                    <span className="text-xs text-blue-500">초대</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 파일 경로 입력 모달 */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowFileModal(false)}>
          <div className="bg-white rounded-xl p-4 w-72 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-gray-800">파일 경로 공유</p>
              <button onClick={() => setShowFileModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <p className="text-xs text-gray-500 mb-2">NAS 또는 공유 폴더 경로를 입력하세요</p>
            
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="예: \\nas\공유폴더\파일.pdf"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowFileModal(false)}
                className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSendFile}
                disabled={!filePath.trim()}
                className="flex-1 py-2 text-sm text-gray-900 bg-[#fee500] rounded-lg hover:bg-[#fada0a] disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
