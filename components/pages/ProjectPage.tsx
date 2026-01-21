'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  PageContainer, 
  PageHeader, 
  ContentArea, 
  AddButton,
  CardGrid,
  SafeInput,
  SafeTextarea
} from '@/components/common/PageLayout'

// ============================================
// 타입 정의
// ============================================
interface ProjectPageProps {
  user: any
  profile: any
}

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

interface Comment {
  id: string
  content: string
  author_id: string
  author_name?: string
  created_at: string
}

interface FileAttachment {
  id: string
  name: string
  url: string
  size?: number
}

interface Project {
  id: string
  name: string
  description: string | null
  status: 'pending' | 'in_progress' | 'review' | 'completed'
  category: string | null
  start_date: string | null
  end_date: string | null
  priority: 'low' | 'medium' | 'high'
  created_by: string
  created_at: string
  updated_by?: string
  updated_at?: string
  assignees?: string[]
  checklist?: ChecklistItem[]
  comments?: Comment[]
  files?: FileAttachment[]
  creator?: {
    id: string
    name: string
    email: string
  }
  updater?: {
    id: string
    name: string
    email: string
  }
}

interface Member {
  id: string
  name: string
  email: string
}

type StatusType = 'all' | 'pending' | 'in_progress' | 'review' | 'completed'

const STATUS_CONFIG = {
  pending: { label: '예정', icon: '📋', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: '진행', icon: '🔄', color: 'bg-blue-100 text-blue-700' },
  review: { label: '검토', icon: '👀', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '완료', icon: '✅', color: 'bg-green-100 text-green-700' },
}

const PRIORITY_CONFIG = {
  low: { label: '낮음', color: 'bg-gray-100 text-gray-600' },
  medium: { label: '보통', color: 'bg-blue-100 text-blue-600' },
  high: { label: '높음', color: 'bg-red-100 text-red-600' },
}

const CATEGORY_OPTIONS = [
  '영상', '기획', '디자인', '마케팅', '개발', '기타'
]

// ============================================
// 메인 컴포넌트
// ============================================
export default function ProjectPage({ user, profile }: ProjectPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<StatusType>('all')
  
  // 모달 상태
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'checklist' | 'comments' | 'files'>('info')
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    start_date: '',
    end_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in_progress' | 'review' | 'completed',
    assignees: [] as string[],
    checklist: [] as ChecklistItem[],
    comments: [] as Comment[],
    files: [] as FileAttachment[],
  })
  
  // 체크리스트 입력
  const [newChecklistItem, setNewChecklistItem] = useState('')
  // 댓글 입력
  const [newComment, setNewComment] = useState('')
  // 파일 링크 입력
  const [newFileUrl, setNewFileUrl] = useState('')
  const [newFileName, setNewFileName] = useState('')

  // ============================================
  // 데이터 로드
  // ============================================
  useEffect(() => {
    loadProjects()
    loadMembers()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProjects(data)
    }
    setLoading(false)
  }

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('approval_status', 'approved')
    
    if (data) setMembers(data)
  }

  // ============================================
  // 프로젝트 CRUD
  // ============================================
  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      alert('프로젝트 이름을 입력해주세요.')
      return
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        priority: formData.priority,
        status: formData.status,
        assignees: formData.assignees,
        checklist: formData.checklist,
        comments: formData.comments,
        files: formData.files,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      alert('프로젝트 생성 실패: ' + error.message)
      return
    }

    loadProjects()
    closeModal()
  }

  const handleUpdateProject = async () => {
    if (!editingProject || !formData.name.trim()) return

    const { error } = await supabase
      .from('projects')
      .update({
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        priority: formData.priority,
        status: formData.status,
        assignees: formData.assignees,
        checklist: formData.checklist,
        comments: formData.comments,
        files: formData.files,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', editingProject.id)

    if (error) {
      alert('프로젝트 수정 실패: ' + error.message)
      return
    }

    loadProjects()
    closeModal()
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }

    loadProjects()
    closeModal()
  }

  const handleStatusChange = async (projectId: string, newStatus: Project['status']) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId)

    if (!error) {
      loadProjects()
    }
  }

  // ============================================
  // 모달 제어
  // ============================================
  const openCreateModal = () => {
    setEditingProject(null)
    setActiveTab('info')
    setFormData({
      name: '',
      description: '',
      category: '',
      start_date: '',
      end_date: '',
      priority: 'medium',
      status: 'pending',
      assignees: [],
      checklist: [],
      comments: [],
      files: [],
    })
    setNewChecklistItem('')
    setNewComment('')
    setShowModal(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setActiveTab('info')
    setFormData({
      name: project.name,
      description: project.description || '',
      category: project.category || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      priority: project.priority,
      status: project.status,
      assignees: project.assignees || [],
      checklist: project.checklist || [],
      comments: project.comments || [],
      files: project.files || [],
    })
    setNewChecklistItem('')
    setNewComment('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProject(null)
    setActiveTab('info')
  }

  // ============================================
  // 체크리스트 핸들러
  // ============================================
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistItem.trim(),
      checked: false,
    }
    setFormData({ ...formData, checklist: [...formData.checklist, newItem] })
    setNewChecklistItem('')
  }

  const toggleChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    })
  }

  const deleteChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter(item => item.id !== id),
    })
  }

  // ============================================
  // 댓글 핸들러
  // ============================================
  const addComment = () => {
    if (!newComment.trim()) return
    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment.trim(),
      author_id: user.id,
      author_name: profile?.name || user.email?.split('@')[0],
      created_at: new Date().toISOString(),
    }
    setFormData({ ...formData, comments: [...formData.comments, comment] })
    setNewComment('')
  }

  const deleteComment = (id: string) => {
    setFormData({
      ...formData,
      comments: formData.comments.filter(c => c.id !== id),
    })
  }

  // ============================================
  // 파일 핸들러
  // ============================================
  const addFileLink = () => {
    if (!newFileUrl.trim()) return
    const file: FileAttachment = {
      id: Date.now().toString(),
      name: newFileName.trim() || newFileUrl.split('/').pop() || '파일',
      url: newFileUrl.trim(),
    }
    setFormData({ ...formData, files: [...formData.files, file] })
    setNewFileUrl('')
    setNewFileName('')
  }

  const deleteFile = (id: string) => {
    setFormData({
      ...formData,
      files: formData.files.filter(f => f.id !== id),
    })
  }

  // ============================================
  // 필터링
  // ============================================
  const filteredProjects = activeStatus === 'all' 
    ? projects 
    : projects.filter(p => p.status === activeStatus)

  const getStatusCount = (status: StatusType) => {
    if (status === 'all') return projects.length
    return projects.filter(p => p.status === status).length
  }

  // ============================================
  // 날짜 포맷
  // ============================================
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return '기간 미정'
    if (start && !end) return `${formatDate(start)} ~`
    if (!start && end) return `~ ${formatDate(end)}`
    return `${formatDate(start)} ~ ${formatDate(end)}`
  }

  // ============================================
  // 렌더링
  // ============================================
  if (loading) {
    return (
      <PageContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">로딩 중...</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* 헤더 */}
      <PageHeader title="프로젝트">
        <AddButton label="새 프로젝트" onClick={openCreateModal} />
      </PageHeader>

      {/* 칸반 탭 (상단) */}
      <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setActiveStatus('all')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-[14px] font-medium transition ${
            activeStatus === 'all' 
              ? 'bg-white shadow text-gray-800' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          전체 <span className="ml-1 text-[12px] text-gray-400">{getStatusCount('all')}</span>
        </button>
        {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-[14px] font-medium transition ${
              activeStatus === status 
                ? 'bg-white shadow text-gray-800' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
            <span className="ml-1 text-[12px] text-gray-400">{getStatusCount(status)}</span>
          </button>
        ))}
      </div>

      {/* 프로젝트 카드 목록 */}
      <ContentArea>
        <CardGrid emptyMessage={activeStatus === 'all' ? '프로젝트가 없습니다' : `${STATUS_CONFIG[activeStatus as keyof typeof STATUS_CONFIG]?.label} 상태의 프로젝트가 없습니다`}>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => openEditModal(project)}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition"
            >
              {/* 상단: 카테고리 + 우선순위 */}
              <div className="flex items-center justify-between mb-2">
                {project.category ? (
                  <span className="text-[12px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {project.category}
                  </span>
                ) : <span />}
                <span className={`text-[11px] px-2 py-0.5 rounded ${PRIORITY_CONFIG[project.priority].color}`}>
                  {PRIORITY_CONFIG[project.priority].label}
                </span>
              </div>

              {/* 제목 */}
              <h3 className="text-[15px] font-semibold text-gray-800 mb-2 line-clamp-2">
                {project.name}
              </h3>

              {/* 설명 */}
              {project.description && (
                <p className="text-[13px] text-gray-500 mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* 기간 */}
              <div className="flex items-center gap-1 text-[12px] text-gray-400 mb-3">
                <span>📅</span>
                <span>{formatDateRange(project.start_date, project.end_date)}</span>
              </div>

              {/* 하단: 상태 + 담당자 */}
              <div className="flex items-center justify-between">
                <span className={`text-[12px] px-2 py-1 rounded-full ${STATUS_CONFIG[project.status].color}`}>
                  {STATUS_CONFIG[project.status].icon} {STATUS_CONFIG[project.status].label}
                </span>
                
                {project.assignees && project.assignees.length > 0 && (
                  <div className="flex -space-x-2">
                    {project.assignees.slice(0, 3).map((assigneeId, i) => {
                      const member = members.find(m => m.id === assigneeId)
                      return (
                        <div 
                          key={i}
                          className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center border-2 border-white"
                          title={member?.name || ''}
                        >
                          {member?.name?.charAt(0) || '?'}
                        </div>
                      )
                    })}
                    {project.assignees.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-[10px] flex items-center justify-center border-2 border-white">
                        +{project.assignees.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardGrid>
      </ContentArea>

      {/* 모달 */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <input
                type="checkbox"
                checked={formData.status === 'completed'}
                onChange={() => setFormData({ 
                  ...formData, 
                  status: formData.status === 'completed' ? 'pending' : 'completed' 
                })}
                className="w-5 h-5 rounded border-gray-300"
              />
              <SafeInput
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                className="flex-1 text-[16px] font-semibold text-gray-800 border-none focus:outline-none focus:ring-0 bg-transparent"
                placeholder="프로젝트 명"
              />
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>

            {/* 모달 바디 - 2컬럼 */}
            <div className="flex-1 overflow-auto flex">
              {/* 왼쪽: 정보, 체크리스트, 파일, 댓글 */}
              <div className="flex-1 p-4 space-y-5 border-r border-gray-100 overflow-auto">
                {/* 정보 */}
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-2">
                    <span>📝</span> 정보
                  </div>
                  <SafeTextarea
                    value={formData.description}
                    onChange={(v) => setFormData({ ...formData, description: v })}
                    className="w-full px-3 py-2 text-[14px] text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    rows={4}
                    placeholder="프로젝트 정보 입력"
                  />
                  <div className="text-right text-[11px] text-gray-400 mt-1">
                    {formData.description.length} / 1,000
                  </div>
                </div>

                {/* 체크리스트 */}
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-2">
                    <span>☑️</span> 체크리스트
                  </div>
                  <div className="space-y-2">
                    {formData.checklist.map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-500"
                        />
                        <span className={`flex-1 text-[14px] ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => deleteChecklistItem(item.id)}
                          className="text-gray-300 hover:text-red-500 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">+</span>
                      <SafeInput
                        value={newChecklistItem}
                        onChange={setNewChecklistItem}
                        className="flex-1 px-2 py-1 text-[14px] text-gray-600 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder="항목 추가 후 Enter"
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addChecklistItem()
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 파일 */}
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-2">
                    <span>📎</span> 파일
                  </div>
                  <div className="space-y-2">
                    {formData.files.map(file => (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span>📄</span>
                        <span 
                          onClick={() => {
                            if (typeof window !== 'undefined' && (window as any).electronAPI?.openPath) {
                              (window as any).electronAPI.openPath(file.url)
                            } else {
                              navigator.clipboard.writeText(file.url)
                              alert(`경로가 복사되었습니다:\n${file.url}`)
                            }
                          }}
                          className="flex-1 text-[13px] text-blue-600 hover:underline truncate cursor-pointer"
                          title={file.url}
                        >
                          {file.name}
                        </span>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="text-gray-300 hover:text-red-500 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {/* 파일 경로 입력 */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <SafeInput
                          value={newFileUrl}
                          onChange={setNewFileUrl}
                          className="flex-1 px-3 py-2 text-[13px] text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="파일 경로"
                        />
                        <button
                          onClick={async () => {
                            if (typeof window !== 'undefined' && (window as any).electronAPI?.selectFile) {
                              const selected = await (window as any).electronAPI.selectFile()
                              if (selected) {
                                setNewFileUrl(selected)
                                const fileName = selected.split(/[/\\]/).pop() || ''
                                setNewFileName(fileName)
                              }
                            }
                          }}
                          className="px-3 py-2 text-[13px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                        >
                          찾아보기
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <SafeInput
                          value={newFileName}
                          onChange={setNewFileName}
                          className="flex-1 px-3 py-2 text-[13px] text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="표시명 (선택)"
                        />
                        <button
                          onClick={addFileLink}
                          disabled={!newFileUrl.trim()}
                          className="px-4 py-2 text-[13px] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: '#5677b0' }}
                        >
                          추가
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 댓글 */}
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-2">
                    <span>💬</span> 댓글
                  </div>
                  
                  {formData.comments.length === 0 ? (
                    <p className="text-center text-gray-400 text-[13px] py-4">추가된 댓글이 없습니다.</p>
                  ) : (
                    <div className="space-y-3 mb-3">
                      {formData.comments.map(comment => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] text-gray-500 shrink-0">
                            {comment.author_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-gray-700">{comment.author_name}</span>
                              <span className="text-[11px] text-gray-400">
                                {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                              </span>
                              {comment.author_id === user.id && (
                                <button onClick={() => deleteComment(comment.id)} className="text-[11px] text-gray-400 hover:text-red-500">
                                  삭제
                                </button>
                              )}
                            </div>
                            <p className="text-[13px] text-gray-600">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 댓글 입력 */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] text-gray-500 shrink-0">
                      {profile?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <SafeTextarea
                        value={newComment}
                        onChange={setNewComment}
                        className="w-full px-3 py-2 text-[13px] text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        rows={2}
                        placeholder="댓글 입력"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-gray-400">{newComment.length} / 500</span>
                        <button
                          onClick={addComment}
                          disabled={!newComment.trim()}
                          className="px-3 py-1 text-[12px] bg-gray-100 text-gray-500 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          등록
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 메타 정보 */}
              <div className="w-52 p-4 space-y-4 bg-gray-50">
                {/* 일정 */}
                <div>
                  <div className="text-[12px] text-gray-500 mb-2">📅 일정</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                    <span className="text-gray-400">~</span>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                  </div>
                </div>

                {/* 카테고리 (라벨) */}
                <div>
                  <div className="flex flex-wrap gap-1">
                    {CATEGORY_OPTIONS.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFormData({ ...formData, category: formData.category === cat ? '' : cat })}
                        className={`px-2 py-1 text-[11px] rounded-full transition ${
                          formData.category === cat
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 담당자 */}
                <div>
                  <div className="text-[12px] text-gray-500 mb-2">👤 담당자</div>
                  <div className="flex flex-wrap gap-1">
                    {members.map(member => (
                      <button
                        key={member.id}
                        onClick={() => {
                          const isSelected = formData.assignees.includes(member.id)
                          setFormData({
                            ...formData,
                            assignees: isSelected
                              ? formData.assignees.filter(id => id !== member.id)
                              : [...formData.assignees, member.id]
                          })
                        }}
                        className={`px-2 py-1 text-[11px] rounded-full transition ${
                          formData.assignees.includes(member.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {member.name || member.email?.split('@')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 상태 */}
                <div>
                  <div className="text-[12px] text-gray-500 mb-2">📊 상태</div>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => (
                      <button
                        key={status}
                        onClick={() => setFormData({ ...formData, status })}
                        className={`px-2 py-1 text-[11px] rounded-full transition ${
                          formData.status === status
                            ? STATUS_CONFIG[status].color
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 등록/수정 정보 */}
                {editingProject && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    {editingProject.updated_at && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">최종 수정</span>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] text-gray-600">
                            {editingProject.updater?.name?.charAt(0) || members.find(m => m.id === editingProject.updated_by)?.name?.charAt(0) || '?'}
                          </div>
                          <span className="text-gray-500">
                            {editingProject.updater?.name || members.find(m => m.id === editingProject.updated_by)?.name || '알 수 없음'}
                          </span>
                          <span className="text-gray-400">
                            {new Date(editingProject.updated_at).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">등록</span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] text-gray-600">
                          {editingProject.creator?.name?.charAt(0) || members.find(m => m.id === editingProject.created_by)?.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-gray-500">
                          {editingProject.creator?.name || members.find(m => m.id === editingProject.created_by)?.name || '알 수 없음'}
                        </span>
                        <span className="text-gray-400">
                          {new Date(editingProject.created_at).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              {editingProject ? (
                <button
                  onClick={() => handleDeleteProject(editingProject.id)}
                  className="px-4 py-2 text-[14px] text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  삭제
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-[14px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  취소
                </button>
                <button
                  onClick={editingProject ? handleUpdateProject : handleCreateProject}
                  className="px-4 py-2 text-[14px] text-white rounded-lg hover:opacity-90 transition"
                  style={{ backgroundColor: '#5677b0' }}
                >
                  {editingProject ? '저장' : '생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
