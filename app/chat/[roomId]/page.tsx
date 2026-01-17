'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

interface Message {
  id: string
  content: string
  content_type?: 'text' | 'file'
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
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [roomMembers, setRoomMembers] = useState<Member[]>([])
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
    const { data: all } = await supabase.from('profiles').select('id, name, email')
    if (all) setAllMembers(all)
    
    const { data: members } = await supabase
      .from('room_members')
      .select('user_id, profiles:user_id(id, name, email)')
      .eq('room_id', roomId)
    
    if (members) {
      const memberList = members.map((m: any) => m.profiles).filter(Boolean)
      setRoomMembers(memberList)
    }
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
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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
    await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: memberId,
    })
    const member = allMembers.find(m => m.id === memberId)
    if (member) setRoomMembers(prev => [...prev, member])
  }

  const handleClose = () => {
    window.electronAPI?.closeWindow?.()
  }

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.()
  }

  const openFilePath = (path: string) => {
    alert(`파일 경로: ${path}\n\n이 경로를 파일 탐색기에서 열어주세요.`)
  }

  const openBoard = () => {
    // 게시판 열기 (추후 구현)
    alert('게시판 기능 준비중')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredMessages = searchQuery 
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const availableMembers = allMembers.filter(m => 
    m.id !== user?.id && !roomMembers.some(rm => rm.id === m.id)
  )

  const memberCount = roomMembers.length + 1

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
    <div className="h-screen flex flex-col bg-[#9bbbd4] overflow-hidden">
      {/* 헤더 - 드래그 영역 */}
      <div 
        className="bg-[#9bbbd4] px-3 pt-2 pb-3"
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
            {!room?.is_self && (
              <button 
                onClick={() => setShowMembersModal(true)}
                className="text-xs text-gray-600 hover:underline"
              >
                {memberCount}명
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* 검색 버튼 */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black/10 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {/* 게시판 버튼 */}
            <button
              onClick={openBoard}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black/10 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            
            {/* 초대 버튼 */}
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
      </div>

      {/* 검색창 */}
      {showSearch && (
        <div className="px-3 py-2 bg-[#9bbbd4]">
          <input
            type="text"
            placeholder="대화 내용 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredMessages.length === 0 ? (
          <p className="text-center text-gray-600 text-xs mt-8">
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
                        className={`px-3 py-2 text-sm flex items-center gap-2 ${
                          isMe 
                            ? 'bg-[#5b9bd5] text-white rounded-lg rounded-br-sm' 
                            : 'bg-white text-gray-900 rounded-lg rounded-bl-sm'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="underline truncate max-w-[150px]">{msg.content.split(/[/\\]/).pop() || msg.content}</span>
                      </button>
                    ) : (
                      <div className={`px-3 py-2 text-sm whitespace-pre-wrap ${
                        isMe 
                          ? 'bg-[#5b9bd5] text-white rounded-lg rounded-br-sm' 
                          : 'bg-white text-gray-900 rounded-lg rounded-bl-sm'
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

      {/* 입력창 */}
      <div className="bg-white">
        {/* 텍스트 입력 - 높이 80px */}
        <textarea
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={room?.is_self ? '메모 입력...' : '메시지 입력...'}
          className="w-full px-3 py-2 text-sm bg-white focus:outline-none resize-none"
          style={{ height: '80px' }}
        />
        
        {/* 하단 툴바 - 높이 35px */}
        <div className="flex items-center justify-between px-2 h-[35px] border-t border-gray-100">
          {/* 왼쪽: 첨부 버튼 */}
          <button
            onClick={() => setShowFileModal(true)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {/* 오른쪽: 전송 버튼 */}
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              newMessage.trim() 
                ? 'bg-[#5b9bd5] text-white hover:bg-[#4a8bc5]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* 멤버 목록 모달 */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowMembersModal(false)}>
          <div className="bg-white rounded-xl p-4 w-64 max-h-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-gray-800">참여 멤버 ({memberCount})</p>
              <button onClick={() => setShowMembersModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-1 max-h-52 overflow-y-auto">
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">👤</div>
                <p className="text-sm text-gray-800">나</p>
              </div>
              
              {roomMembers.map(member => (
                <div key={member.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">👤</div>
                  <p className="text-sm text-gray-800">{member.name || member.email?.split('@')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                className="flex-1 py-2 text-sm text-white bg-[#5b9bd5] rounded-lg hover:bg-[#4a8bc5] disabled:opacity-50"
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
