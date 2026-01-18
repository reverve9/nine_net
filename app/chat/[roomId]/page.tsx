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
  reply_to?: string
  read_by?: string[]
  sender?: { name: string }
}

interface ChatRoom {
  id: string
  name: string
  is_group: boolean
  is_self?: boolean
  created_by?: string
}

interface Member {
  id: string
  name: string
  email: string
}

interface BoardPost {
  id: string
  title: string
  content: string
  author_id: string
  room_id: string
  is_important: boolean
  created_at: string
  author?: { name: string }
}

const renderMessageContent = (content: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = content.split(urlRegex)
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
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
  const [showBoardModal, setShowBoardModal] = useState(false)
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [roomMembers, setRoomMembers] = useState<Member[]>([])
  const [showFileModal, setShowFileModal] = useState(false)
  const [filePath, setFilePath] = useState('')
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([])
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImportant, setNewPostImportant] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [displayName, setDisplayName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { 
    checkAuth()
    setIsElectron(!!window.electronAPI?.isElectron)
  }, [])
  
  useEffect(() => { 
    if (user && roomId) { 
      fetchRoom()
      fetchMessages()
      fetchMembers()
      fetchBoardPosts()
      
      const channel = supabase.channel(`room-${roomId}`)
      
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            const newMsg = payload.new as any
            
            // sender 정보 가져오기
            const { data: sender } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newMsg.sender_id)
              .single()
            
            // 중복 방지하고 메시지 추가
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) {
                return prev
              }
              return [...prev, { ...newMsg, sender }]
            })
            
            // 새 메시지 읽음 처리 (내가 보낸 게 아니면)
            if (newMsg.sender_id !== user.id) {
              markMessageAsRead(newMsg.id)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            setMessages(prev => prev.map(m => 
              m.id === payload.new.id ? { ...m, read_by: payload.new.read_by } : m
            ))
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, roomId])
  
  useEffect(() => { scrollToBottom() }, [messages])
  
  // 메시지 로드 후 읽음 처리
  useEffect(() => {
    if (user && messages.length > 0 && !room?.is_self) {
      markAllAsRead()
    }
  }, [messages.length, user, room])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) { setUser(session.user) }
    setLoading(false)
  }

  const fetchRoom = async () => {
    const { data } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single()
    if (data) {
      setRoom(data)
      
      // 표시 이름 계산
      if (data.is_self) {
        setDisplayName('나와의 채팅')
      } else if (!data.is_group) {
        // 1:1 채팅 - 상대방 이름만
        const { data: members } = await supabase
          .from('room_members')
          .select('user_id')
          .eq('room_id', roomId)
        
        if (members) {
          const otherUserId = members.find(m => m.user_id !== user?.id)?.user_id
          if (otherUserId) {
            const { data: otherUser } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', otherUserId)
              .single()
            
            if (otherUser) {
              setDisplayName(otherUser.name || otherUser.email?.split('@')[0] || data.name)
            }
          }
        }
      } else {
        // 그룹 채팅 - 나 제외한 멤버들
        const { data: members } = await supabase
          .from('room_members')
          .select('user_id')
          .eq('room_id', roomId)
        
        if (members) {
          const otherUserIds = members.filter(m => m.user_id !== user?.id).map(m => m.user_id)
          if (otherUserIds.length > 0) {
            const { data: otherUsers } = await supabase
              .from('profiles')
              .select('name, email')
              .in('id', otherUserIds)
            
            if (otherUsers) {
              setDisplayName(otherUsers.map(u => u.name || u.email?.split('@')[0]).join(', '))
            }
          }
        }
      }
    }
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
    
    const { data: memberIds } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
    
    if (memberIds && all) {
      const userIds = memberIds.map((m: any) => m.user_id)
      const memberList = all.filter((p: any) => userIds.includes(p.id))
      setRoomMembers(memberList)
    }
  }

  const fetchBoardPosts = async () => {
    const { data } = await supabase
      .from('board_posts')
      .select('*, author:profiles!author_id(name)')
      .eq('room_id', roomId)
      .order('is_important', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setBoardPosts(data)
  }

  const markAllAsRead = async () => {
    if (!user) return
    
    const unreadMessages = messages.filter(msg => {
      if (msg.sender_id === user.id) return false
      const readBy = msg.read_by || []
      return !readBy.includes(user.id)
    })
    
    for (const msg of unreadMessages) {
      await markMessageAsRead(msg.id)
    }
  }

  const markMessageAsRead = async (messageId: string) => {
    if (!user) return
    
    const { data: msg } = await supabase
      .from('messages')
      .select('read_by')
      .eq('id', messageId)
      .single()
    
    if (msg) {
      const readBy = msg.read_by || []
      if (!readBy.includes(user.id)) {
        await supabase
          .from('messages')
          .update({ read_by: [...readBy, user.id] })
          .eq('id', messageId)
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !roomId || !user) return
    
    const messageData: any = {
      content: newMessage.trim(),
      content_type: 'text',
      sender_id: user.id,
      room_id: roomId,
      read_by: [user.id],
    }
    
    if (replyTo) {
      messageData.reply_to = replyTo.id
    }
    
    // 입력창 먼저 비우기
    setNewMessage('')
    setReplyTo(null)
    
    // 메시지 전송 (실시간 구독에서 처리됨)
    const { error } = await supabase.from('messages').insert(messageData)
    
    if (error) {
      alert('메시지 전송에 실패했습니다: ' + error.message)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    
    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1)
      const spaceIndex = textAfterAt.indexOf(' ')
      
      if (spaceIndex === -1) {
        setMentionFilter(textAfterAt.toLowerCase())
        setShowMentionList(true)
      } else {
        setShowMentionList(false)
      }
    } else {
      setShowMentionList(false)
    }
  }

  const insertMention = (member: Member) => {
    const lastAtIndex = newMessage.lastIndexOf('@')
    const beforeAt = newMessage.slice(0, lastAtIndex)
    const memberName = member.name || member.email?.split('@')[0]
    setNewMessage(`${beforeAt}@${memberName} `)
    setShowMentionList(false)
    textareaRef.current?.focus()
  }

  const handleSendFile = async () => {
    if (!filePath.trim() || !roomId || !user) return
    
    await supabase.from('messages').insert({
      content: filePath.trim(),
      content_type: 'file',
      sender_id: user.id,
      room_id: roomId,
      read_by: [user.id],
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

  const handleLeaveRoom = async () => {
    if (room?.is_self) {
      alert('나와의 채팅은 나갈 수 없습니다.')
      return
    }
    
    if (!confirm('채팅방을 나가시겠습니까?')) return
    
    console.log("DEBUG 삭제 전:", { roomId, userId: user.id });
    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('나가기 실패:', error)
      alert('채팅방 나가기에 실패했습니다: ' + error.message)
      return
    }
    console.log("DEBUG 삭제 성공!");
    
    // 창 닫기
    if (window.electronAPI?.isElectron) {
      window.electronAPI.closeWindow?.()
    } else {
      window.close()
    }
  }

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return
    
    await supabase.from('board_posts').insert({
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
      author_id: user.id,
      room_id: roomId,
      is_important: newPostImportant,
    })
    
    setNewPostTitle('')
    setNewPostContent('')
    setNewPostImportant(false)
    setShowNewPostModal(false)
    fetchBoardPosts()
  }

  const handleToggleImportant = async (postId: string, currentValue: boolean) => {
    await supabase.from('board_posts').update({ is_important: !currentValue }).eq('id', postId)
    fetchBoardPosts()
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    await supabase.from('board_posts').delete().eq('id', postId)
    fetchBoardPosts()
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const getReplyMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId)
  }

  const getUnreadCount = (msg: Message) => {
    if (msg.sender_id !== user?.id) return 0
    if (room?.is_self) return 0
    const readBy = msg.read_by || []
    const totalMembers = roomMembers.length
    const readCount = readBy.length
    return Math.max(0, totalMembers - readCount)
  }

  const filteredMessages = searchQuery 
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const availableMembers = allMembers.filter(m => 
    m.id !== user?.id && !roomMembers.some(rm => rm.id === m.id)
  )

  const filteredMentionMembers = roomMembers.filter(m => {
    const name = (m.name || m.email?.split('@')[0] || '').toLowerCase()
    return name.includes(mentionFilter)
  })

  // 멤버 수 (나 제외)
  const memberCount = roomMembers.length

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#494949]">
        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#494949] p-4">
        <p className="text-gray-300 text-xs">로그인이 필요합니다</p>
      </div>
    )
  }

  const roomDisplayName = displayName || room?.name || '채팅'

  return (
    <div className="h-screen flex flex-col bg-[#494949] overflow-hidden">
      {/* 헤더 */}
      <div 
        className="bg-[#494949] flex-shrink-0 px-3 py-2"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center justify-between mb-1 min-h-[16px]">
          {isElectron && (
            <div className="flex gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button onClick={handleClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition" />
              <button onClick={handleMinimize} className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-90 transition" />
              <button className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition" />
            </div>
          )}
          <div className="flex-1" />
        </div>
        
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{roomDisplayName}</p>
            {!room?.is_self && memberCount > 0 && (
              <button 
                onClick={() => setShowMembersModal(true)}
                className="text-xs text-gray-300 hover:text-white"
              >
                {memberCount}명
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowBoardModal(true)}
              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            
            {!room?.is_self && (
              <>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </button>
                
                <button
                  onClick={handleLeaveRoom}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-white/10 rounded-full transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 검색창 */}
      {showSearch && (
        <div className="px-3 py-2 bg-[#494949] flex-shrink-0">
          <input
            type="text"
            placeholder="대화 내용 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white/10 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30"
            autoFocus
          />
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredMessages.length === 0 ? (
          <p className="text-center text-gray-400 text-xs mt-8">
            {searchQuery ? '검색 결과가 없습니다' : room?.is_self ? '메모를 작성해보세요 ✏️' : '첫 메시지를 보내보세요 👋'}
          </p>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.sender_id === user.id
            const isFile = msg.content_type === 'file'
            const replyMsg = msg.reply_to ? getReplyMessage(msg.reply_to) : null
            const unreadCount = getUnreadCount(msg)
            
            const prevMsg = index > 0 ? filteredMessages[index - 1] : null
            const isSameSender = prevMsg && prevMsg.sender_id === msg.sender_id
            const showProfile = !isMe && !room?.is_self && !isSameSender
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                {/* 상대방 프로필 */}
                {!isMe && !room?.is_self && (
                  <div className="w-9 flex-shrink-0 mr-2">
                    {showProfile && (
                      <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="max-w-[70%]">
                  {/* 상대방 이름 */}
                  {showProfile && (
                    <p className="text-xs text-gray-300 mb-1">{msg.sender?.name || '알 수 없음'}</p>
                  )}
                  
                  <div className="flex items-end gap-1">
                    {/* 답장 버튼 (내 메시지) */}
                    {isMe && (
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                      </button>
                    )}
                    
                    {/* 내 메시지: 읽음 표시 + 시간 */}
                    {isMe && (
                      <div className="flex flex-col items-end justify-end mb-0.5">
                        {unreadCount > 0 && (
                          <span className="text-xs text-yellow-400 font-medium">{unreadCount}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    
                    <div>
                      {/* 답장 표시 */}
                      {replyMsg && (
                        <div className={`text-xs px-2 py-1 mb-1 rounded ${isMe ? 'bg-blue-300/50 text-gray-800' : 'bg-gray-200 text-gray-600'}`}>
                          <span className="font-medium">{replyMsg.sender?.name || '알 수 없음'}</span>에게 답장
                          <p className="truncate">{replyMsg.content}</p>
                        </div>
                      )}
                      
                      {isFile ? (
                        <button
                          onClick={() => openFilePath(msg.content)}
                          className={`px-3 py-2 text-sm flex items-center gap-2 ${
                            isMe 
                              ? 'bg-[#aacbec] text-gray-900 rounded-lg rounded-br-sm' 
                              : 'bg-white text-gray-900 rounded-lg rounded-bl-sm'
                          }`}
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="underline break-all">{msg.content.split(/[/\\]/).pop() || msg.content}</span>
                        </button>
                      ) : (
                        <div className={`px-3 py-2 text-sm whitespace-pre-wrap break-all ${
                          isMe 
                            ? 'bg-[#aacbec] text-gray-900 rounded-lg rounded-br-sm' 
                            : 'bg-white text-gray-900 rounded-lg rounded-bl-sm'
                        }`}>
                          {renderMessageContent(msg.content)}
                        </div>
                      )}
                    </div>
                    
                    {/* 상대방 메시지: 시간 */}
                    {!isMe && (
                      <span className="text-xs text-gray-400 self-end mb-0.5">{formatTime(msg.created_at)}</span>
                    )}
                    
                    {/* 답장 버튼 (상대방 메시지) */}
                    {!isMe && (
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 답장 표시 */}
      {replyTo && (
        <div className="px-3 py-2 bg-[#3a3a3a] flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-400">{replyTo.sender?.name || '알 수 없음'}에게 답장</p>
            <p className="text-xs text-gray-400 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white ml-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 멘션 리스트 */}
      {showMentionList && filteredMentionMembers.length > 0 && (
        <div className="px-3 py-2 bg-[#3a3a3a] border-t border-gray-600">
          <p className="text-xs text-gray-400 mb-1">멤버 선택</p>
          <div className="flex flex-wrap gap-1">
            {filteredMentionMembers.map(member => (
              <button
                key={member.id}
                onClick={() => insertMention(member)}
                className="px-2 py-1 text-xs bg-white/10 text-white rounded hover:bg-white/20"
              >
                @{member.name || member.email?.split('@')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력창 */}
      <div className="bg-white flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={newMessage}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder={room?.is_self ? '메모 입력...' : '메시지 입력... (@로 멘션)'}
          className="w-full px-3 py-2 text-sm bg-white focus:outline-none resize-none border-0"
          style={{ height: '80px' }}
        />
        
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => setShowFileModal(true)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              newMessage.trim() 
                ? 'bg-[#5b9bd5] text-white hover:bg-[#4a8bc5]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* 게시판 모달 */}
      {showBoardModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center" 
          style={{ zIndex: 99999 }}
          onClick={() => setShowBoardModal(false)}
        >
          <div className="bg-white rounded-xl w-[360px] max-h-[80vh] shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <p className="font-medium text-gray-800">📋 게시판</p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowNewPostModal(true)}
                  className="text-blue-500 text-sm hover:underline"
                >
                  글쓰기
                </button>
                <button onClick={() => setShowBoardModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {boardPosts.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">게시글이 없습니다</p>
              ) : (
                boardPosts.map(post => (
                  <div key={post.id} className={`p-3 border-b hover:bg-gray-50 ${post.is_important ? 'bg-yellow-50' : ''}`}>
                    <div className="flex items-start gap-2">
                      {post.is_important && (
                        <span className="text-yellow-500 text-sm flex-shrink-0">📌</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{post.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{post.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {post.author?.name || '알 수 없음'} · {formatDate(post.created_at)}
                        </p>
                      </div>
                      {post.author_id === user.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggleImportant(post.id, post.is_important)}
                            className={`p-1 rounded ${post.is_important ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 새 게시글 작성 모달 */}
      {showNewPostModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center" 
          style={{ zIndex: 100000 }}
          onClick={() => setShowNewPostModal(false)}
        >
          <div className="bg-white rounded-xl p-4 w-[360px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-gray-800">새 게시글</p>
              <button onClick={() => setShowNewPostModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <input
              type="text"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              placeholder="제목"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
            />
            
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="내용"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2 resize-none"
              rows={4}
            />
            
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newPostImportant}
                onChange={(e) => setNewPostImportant(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">📌 중요 글로 등록</span>
            </label>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewPostModal(false)}
                className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim()}
                className="flex-1 py-2 text-sm text-white bg-[#5b9bd5] rounded-lg hover:bg-[#4a8bc5] disabled:opacity-50"
              >
                작성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 멤버 목록 모달 */}
      {showMembersModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center" 
          style={{ zIndex: 99999 }}
          onClick={() => setShowMembersModal(false)}
        >
          <div className="bg-white rounded-xl p-4 w-[360px] max-h-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-gray-800">참여 멤버 ({memberCount})</p>
              <button onClick={() => setShowMembersModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {roomMembers.filter(m => m.id !== user.id).map(member => (
                <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200">
                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-800">
                    {member.name || member.email?.split('@')[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 멤버 초대 모달 */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center" 
          style={{ zIndex: 99999 }}
          onClick={() => setShowInviteModal(false)}
        >
          <div className="bg-white rounded-xl p-4 w-[360px] max-h-80 shadow-xl" onClick={e => e.stopPropagation()}>
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
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
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
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center" 
          style={{ zIndex: 99999 }}
          onClick={() => setShowFileModal(false)}
        >
          <div className="bg-white rounded-xl p-4 w-[360px] shadow-xl" onClick={e => e.stopPropagation()}>
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
