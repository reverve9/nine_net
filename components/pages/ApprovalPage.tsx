'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================
// 타입 정의
// ============================================
interface ApprovalPageProps {
  user: any
  profile: any
  subMenu: string
}

interface Approval {
  id: string
  title: string
  form_id: string
  form_type?: string
  content: any
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn'
  drafter_id: string
  drafter_name?: string
  is_temp: boolean
  created_at: string
  submitted_at: string | null
  completed_at: string | null
}

interface ApprovalForm {
  id: string
  name: string
  description: string | null
  icon: string
  category: string | null
}

// ============================================
// 상수
// ============================================
const PRIMARY_COLOR = '#5677b0'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '작성중', color: '#747474' },
  pending: { label: '결재중', color: '#5677b0' },
  approved: { label: '승인', color: '#a8ca54' },
  rejected: { label: '반려', color: '#c4334b' },
  withdrawn: { label: '회수', color: '#eeac42' },
}

// 기안함 탭
const DRAFT_TABS = [
  { id: 'all', label: '전체' },
  { id: 'completed', label: '종결' },
  { id: 'withdrawn', label: '회수' },
  { id: 'temp', label: '임시 저장' },
]

// 결재함 탭
const INBOX_TABS = [
  { id: 'pending', label: '미결' },
  { id: 'completed', label: '종결' },
]

// 양식 목록
const FORM_TEMPLATES: ApprovalForm[] = [
  { id: 'report', name: '업무보고', description: null, icon: '', category: '보고' },
  { id: 'expense', name: '지출결의서', description: null, icon: '', category: '재무' },
  { id: 'meeting-internal', name: '회의록(내부)', description: null, icon: '', category: '회의' },
  { id: 'meeting-external', name: '회의록(외부)', description: null, icon: '', category: '회의' },
  { id: 'daily', name: '업무일지', description: null, icon: '', category: '보고' },
  { id: 'vacation', name: '연차신청서', description: null, icon: '', category: '인사' },
]

// form_type ID를 한글명으로 변환
const getFormTypeName = (formType: string) => {
  const form = FORM_TEMPLATES.find(f => f.id === formType)
  return form?.name || formType
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function ApprovalPage({ user, profile, subMenu }: ApprovalPageProps) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  
  // 내부 탭 상태
  const [draftTab, setDraftTab] = useState('all')
  const [inboxTab, setInboxTab] = useState('pending')
  
  // 모달 상태
  const [selectedForm, setSelectedForm] = useState<ApprovalForm | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)

  // ============================================
  // 데이터 로드
  // ============================================
  useEffect(() => {
    loadApprovals()
  }, [subMenu, draftTab, inboxTab])

  const loadApprovals = async () => {
    setLoading(true)
    
    try {
      let query = supabase
        .from('approvals')
        .select('*')
        .order('created_at', { ascending: false })

      // 기안함: 내가 작성한 문서
      if (subMenu === 'draft') {
        query = query.eq('drafter_id', user.id)
        
        if (draftTab === 'completed') {
          query = query.in('status', ['approved', 'rejected'])
        } else if (draftTab === 'withdrawn') {
          query = query.eq('status', 'withdrawn')
        } else if (draftTab === 'temp') {
          query = query.eq('is_temp', true)
        } else {
          query = query.eq('is_temp', false)
        }
      }
      
      // 결재함: 내가 결재해야 할 문서
      if (subMenu === 'inbox') {
        // TODO: approval_lines 조인해서 내가 결재자인 문서만
        if (inboxTab === 'completed') {
          query = query.in('status', ['approved', 'rejected'])
        } else {
          query = query.eq('status', 'pending')
        }
      }

      const { data, error } = await query.limit(50)
      
      if (!error && data) {
        setApprovals(data)
      }
    } catch (err) {
      console.error('Error loading approvals:', err)
    }
    
    setLoading(false)
  }

  // ============================================
  // 양식 선택
  // ============================================
  const handleSelectForm = (form: ApprovalForm) => {
    setSelectedForm(form)
    setShowFormModal(true)
  }

  // ============================================
  // 페이지 정보
  // ============================================
  const getPageInfo = () => {
    switch (subMenu) {
      case 'draft':
        return { title: '기안함' }
      case 'inbox':
        return { title: '결재함' }
      case 'reference':
        return { title: '열람/공람' }
      case 'certificate':
        return { title: '증명서 신청' }
      default:
        return { title: '결재' }
    }
  }

  // ============================================
  // 탭 관련
  // ============================================
  const getCurrentTabs = () => {
    if (subMenu === 'draft') return DRAFT_TABS
    if (subMenu === 'inbox') return INBOX_TABS
    return []
  }

  const getCurrentTab = () => {
    if (subMenu === 'draft') return draftTab
    if (subMenu === 'inbox') return inboxTab
    return ''
  }

  const setCurrentTab = (tab: string) => {
    if (subMenu === 'draft') setDraftTab(tab)
    if (subMenu === 'inbox') setInboxTab(tab)
  }

  // ============================================
  // 테이블 헤더
  // ============================================
  const getTableHeaders = () => {
    if (subMenu === 'inbox') {
      return ['양식명', '제목', '기안자', '기안일', '상태']
    }
    return ['양식명', '제목', '기안일', '상태', '결재일']
  }

  // ============================================
  // 로딩
  // ============================================
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const pageInfo = getPageInfo()
  const tabs = getCurrentTabs()
  const currentTab = getCurrentTab()

  // ============================================
  // 메인 렌더링
  // ============================================
  return (
    <div className="p-4 h-full flex flex-col overflow-auto">
      {/* 헤더 */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-800">{pageInfo.title}</h1>
      </div>

      {/* 기안함: 양식 선택 영역 */}
      {subMenu === 'draft' && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
          <h3 className="text-[13px] font-medium text-gray-600 mb-3">양식 선택</h3>
          <div className="grid grid-cols-6 gap-3">
            {FORM_TEMPLATES.map(form => (
              <button
                key={form.id}
                onClick={() => handleSelectForm(form)}
                className="py-2.5 px-3 text-[13px] font-medium text-gray-700 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
              >
                {form.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 내부 탭 */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-4 py-2 text-[13px] rounded-lg transition ${
                currentTab === tab.id
                  ? 'text-white'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
              style={currentTab === tab.id ? { backgroundColor: PRIMARY_COLOR } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 필터/검색 영역 */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-3">
          {subMenu === 'draft' && draftTab === 'all' && (
            <>
              <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                결재중
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                승인
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                반려
              </label>
            </>
          )}
          
          {subMenu === 'inbox' && (
            <>
              <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                결재
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                합의
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                수신
              </label>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300">
            <option>전체</option>
            <option>제목</option>
            <option>양식명</option>
          </select>
          <input
            type="text"
            placeholder="검색어 입력"
            className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 w-48"
          />
          <button 
            className="px-2 py-1.5 text-[13px] text-gray-500 hover:text-gray-700"
          >
            검색
          </button>
          
          <select className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300">
            <option>10개</option>
            <option>20개</option>
            <option>50개</option>
          </select>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
              </th>
              {getTableHeaders().map((header, idx) => (
                <th key={idx} className="p-3 text-left text-[13px] font-medium text-gray-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={getTableHeaders().length + 1} className="p-12 text-center text-gray-400">
                  문서가 없습니다
                </td>
              </tr>
            ) : (
              approvals.map((approval) => (
                <tr key={approval.id} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="p-3">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="p-3 text-[13px] text-gray-700">{getFormTypeName(approval.form_type || '')}</td>
                  <td className="p-3 text-[13px] text-gray-700">{approval.title}</td>
                  <td className="p-3 text-[13px] text-gray-500">
                    {new Date(approval.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="p-3">
                    <span 
                      className="px-2 py-1 text-[11px] text-white rounded"
                      style={{ backgroundColor: STATUS_CONFIG[approval.status]?.color || '#747474' }}
                    >
                      {STATUS_CONFIG[approval.status]?.label || approval.status}
                    </span>
                  </td>
                  <td className="p-3 text-[13px] text-gray-500">
                    {approval.completed_at 
                      ? new Date(approval.completed_at).toLocaleDateString('ko-KR') 
                      : '-'
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 양식 작성 모달 */}
      {showFormModal && selectedForm && (
        <FormModal
          form={selectedForm}
          user={user}
          profile={profile}
          onClose={() => {
            setShowFormModal(false)
            setSelectedForm(null)
          }}
          onSubmit={() => {
            setShowFormModal(false)
            setSelectedForm(null)
            loadApprovals()
          }}
        />
      )}
    </div>
  )
}

// ============================================
// 양식 작성 모달 컴포넌트
// ============================================
interface FormModalProps {
  form: ApprovalForm
  user: any
  profile: any
  onClose: () => void
  onSubmit: () => void
}

interface ApproverItem {
  id: string
  name: string
  position?: string
  type: 'approve' | 'agree' | 'receive' // 결재/합의/수신
}

function FormModal({ form, user, profile, onClose, onSubmit }: FormModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<any>({})
  const [saving, setSaving] = useState(false)
  
  // 결재선 상태
  const [approvers, setApprovers] = useState<ApproverItem[]>([])
  const [references, setReferences] = useState<ApproverItem[]>([]) // 열람/공람
  const [showUserModal, setShowUserModal] = useState(false)
  const [userModalType, setUserModalType] = useState<'approver' | 'reference'>('approver')
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // 사용자 목록 로드
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, position')
        .neq('id', user.id)
        .order('name')
      
      if (!error && data) {
        setUsers(data)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
    setLoadingUsers(false)
  }

  // 사용자 선택 모달 열기
  const openUserModal = (type: 'approver' | 'reference') => {
    setUserModalType(type)
    loadUsers()
    setShowUserModal(true)
  }

  // 결재자 추가
  const addApprover = (selectedUser: any) => {
    if (approvers.find(a => a.id === selectedUser.id)) return
    
    setApprovers([...approvers, {
      id: selectedUser.id,
      name: selectedUser.name,
      position: selectedUser.position,
      type: 'approve'
    }])
    setShowUserModal(false)
  }

  // 열람자 추가
  const addReference = (selectedUser: any) => {
    if (references.find(r => r.id === selectedUser.id)) return
    
    setReferences([...references, {
      id: selectedUser.id,
      name: selectedUser.name,
      position: selectedUser.position,
      type: 'receive'
    }])
    setShowUserModal(false)
  }

  // 결재자 제거
  const removeApprover = (id: string) => {
    setApprovers(approvers.filter(a => a.id !== id))
  }

  // 열람자 제거
  const removeReference = (id: string) => {
    setReferences(references.filter(r => r.id !== id))
  }

  // 결재자 타입 변경
  const changeApproverType = (id: string, type: 'approve' | 'agree' | 'receive') => {
    setApprovers(approvers.map(a => a.id === id ? { ...a, type } : a))
  }

  // 양식별 필드 렌더링
  const renderFormFields = () => {
    switch (form.id) {
      case 'report':
        return (
          <>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">내용</label>
              <textarea
                value={content.body || ''}
                onChange={(e) => setContent({ ...content, body: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[200px]"
                placeholder="업무 보고 내용을 입력하세요"
              />
            </div>
          </>
        )
      
      case 'expense':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">금액</label>
                <input
                  type="number"
                  value={content.amount || ''}
                  onChange={(e) => setContent({ ...content, amount: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">지출일</label>
                <input
                  type="date"
                  value={content.expense_date || ''}
                  onChange={(e) => setContent({ ...content, expense_date: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">용도</label>
              <textarea
                value={content.purpose || ''}
                onChange={(e) => setContent({ ...content, purpose: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[100px]"
                placeholder="지출 용도를 입력하세요"
              />
            </div>
          </>
        )

      case 'meeting-internal':
      case 'meeting-external':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">회의 일시</label>
                <input
                  type="datetime-local"
                  value={content.meeting_date || ''}
                  onChange={(e) => setContent({ ...content, meeting_date: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">참석자</label>
                <input
                  type="text"
                  value={content.attendees || ''}
                  onChange={(e) => setContent({ ...content, attendees: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                  placeholder="참석자 (쉼표로 구분)"
                />
              </div>
            </div>
            {form.id === 'meeting-external' && (
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">업체명</label>
                <input
                  type="text"
                  value={content.company_name || ''}
                  onChange={(e) => setContent({ ...content, company_name: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                  placeholder="미팅 업체명"
                />
              </div>
            )}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">회의 내용</label>
              <textarea
                value={content.body || ''}
                onChange={(e) => setContent({ ...content, body: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[120px]"
                placeholder="회의 내용"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">결정사항</label>
              <textarea
                value={content.decisions || ''}
                onChange={(e) => setContent({ ...content, decisions: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[80px]"
                placeholder="결정사항"
              />
            </div>
          </>
        )

      case 'daily':
        return (
          <>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">날짜</label>
              <input
                type="date"
                value={content.work_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setContent({ ...content, work_date: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">오늘 한 일</label>
              <textarea
                value={content.today_work || ''}
                onChange={(e) => setContent({ ...content, today_work: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[100px]"
                placeholder="오늘 수행한 업무"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">내일 할 일</label>
              <textarea
                value={content.tomorrow_work || ''}
                onChange={(e) => setContent({ ...content, tomorrow_work: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[100px]"
                placeholder="내일 예정 업무"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">특이사항</label>
              <textarea
                value={content.notes || ''}
                onChange={(e) => setContent({ ...content, notes: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[60px]"
                placeholder="특이사항 (선택)"
              />
            </div>
          </>
        )

      case 'vacation':
        return (
          <>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">휴가 종류</label>
              <select
                value={content.vacation_type || ''}
                onChange={(e) => setContent({ ...content, vacation_type: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">선택하세요</option>
                <option value="annual">연차</option>
                <option value="half-am">반차 (오전)</option>
                <option value="half-pm">반차 (오후)</option>
                <option value="sick">병가</option>
                <option value="special">경조사</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={content.start_date || ''}
                  onChange={(e) => setContent({ ...content, start_date: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  value={content.end_date || ''}
                  onChange={(e) => setContent({ ...content, end_date: e.target.value })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">사유</label>
              <textarea
                value={content.reason || ''}
                onChange={(e) => setContent({ ...content, reason: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[80px]"
                placeholder="휴가 사유"
              />
            </div>
          </>
        )

      default:
        return (
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">내용</label>
            <textarea
              value={content.body || ''}
              onChange={(e) => setContent({ ...content, body: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[200px]"
            />
          </div>
        )
    }
  }

  // 저장
  const handleSave = async (isTemp: boolean) => {
    if (!title.trim()) {
      alert('제목을 입력해주세요')
      return
    }
    
    if (!isTemp && approvers.length === 0) {
      alert('결재자를 추가해주세요')
      return
    }

    setSaving(true)

    try {
      // 1. 결재 문서 저장
      const { data: approvalData, error: approvalError } = await supabase
        .from('approvals')
        .insert({
          form_type: form.id,
          title: title,
          content: content,
          status: isTemp ? 'draft' : 'pending',
          drafter_id: user.id,
          is_temp: isTemp,
          submitted_at: isTemp ? null : new Date().toISOString(),
        })
        .select()
        .single()

      if (approvalError) throw approvalError

      // 2. 결재선 저장 (임시저장이 아닐 때)
      if (!isTemp && approvalData && approvers.length > 0) {
        const approvalLines = approvers.map((approver, idx) => ({
          approval_id: approvalData.id,
          approver_id: approver.id,
          step_order: idx + 1,
          type: approver.type,
          status: 'pending',
        }))

        const { error: lineError } = await supabase
          .from('approval_lines')
          .insert(approvalLines)

        if (lineError) throw lineError
      }

      // 3. 열람/공람자 저장
      if (!isTemp && approvalData && references.length > 0) {
        const refData = references.map(ref => ({
          approval_id: approvalData.id,
          user_id: ref.id,
        }))

        const { error: refError } = await supabase
          .from('approval_references')
          .insert(refData)

        if (refError) throw refError
      }

      onSubmit()
    } catch (err) {
      console.error('Error saving approval:', err)
      alert('저장에 실패했습니다')
    }

    setSaving(false)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-[16px] font-semibold text-gray-800">{form.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="문서 제목을 입력하세요"
            />
          </div>

          {/* 양식별 필드 */}
          {renderFormFields()}

          {/* TODO: 결재선 지정 */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[13px] font-medium text-gray-700">결재선</label>
              <button
                type="button"
                onClick={() => openUserModal('approver')}
                className="text-[12px] text-gray-500 hover:text-gray-700"
              >
                + 결재자 추가
              </button>
            </div>
            
            {approvers.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-400 text-[13px]">
                결재자를 추가해주세요
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {/* 기안자 */}
                <div className="flex flex-col items-center p-2 bg-gray-100 rounded-lg min-w-[70px]">
                  <span className="text-[10px] text-gray-400 mb-1">기안</span>
                  <span className="text-[13px] font-medium text-gray-700">{profile?.name}</span>
                  {profile?.position && (
                    <span className="text-[11px] text-gray-400">{profile.position}</span>
                  )}
                </div>
                
                {approvers.map((approver, idx) => (
                  <div key={approver.id} className="flex items-center gap-2">
                    <span className="text-gray-300">→</span>
                    <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg min-w-[70px] relative group">
                      <select
                        value={approver.type}
                        onChange={(e) => changeApproverType(approver.id, e.target.value as any)}
                        className="text-[10px] text-blue-500 mb-1 bg-transparent border-none p-0 cursor-pointer focus:outline-none"
                      >
                        <option value="approve">결재</option>
                        <option value="agree">합의</option>
                        <option value="receive">수신</option>
                      </select>
                      <span className="text-[13px] font-medium text-gray-700">{approver.name}</span>
                      {approver.position && (
                        <span className="text-[11px] text-gray-400">{approver.position}</span>
                      )}
                      <button
                        onClick={() => removeApprover(approver.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 열람/공람 */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[13px] font-medium text-gray-700">열람/공람</label>
              <button
                type="button"
                onClick={() => openUserModal('reference')}
                className="text-[12px] text-gray-500 hover:text-gray-700"
              >
                + 추가
              </button>
            </div>
            
            {references.length === 0 ? (
              <div className="text-[13px] text-gray-400">-</div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {references.map(ref => (
                  <span 
                    key={ref.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[13px] text-gray-600 group"
                  >
                    {ref.name}
                    <button
                      onClick={() => removeReference(ref.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            취소
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            임시 저장
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || approvers.length === 0}
            className="px-4 py-2 text-[14px] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#5677b0' }}
          >
            결재 상신
          </button>
        </div>
      </div>

      {/* 사용자 선택 모달 */}
      {showUserModal && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]"
          onClick={() => setShowUserModal(false)}
        >
          <div 
            className="bg-white rounded-xl w-80 max-h-[400px] overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-[14px] font-medium text-gray-700">
                {userModalType === 'approver' ? '결재자 선택' : '열람자 선택'}
              </span>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {loadingUsers ? (
                <div className="p-4 text-center text-gray-400">로딩중...</div>
              ) : users.length === 0 ? (
                <div className="p-4 text-center text-gray-400">사용자가 없습니다</div>
              ) : (
                users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => userModalType === 'approver' ? addApprover(u) : addReference(u)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-[13px] font-medium text-gray-700">{u.name}</div>
                    {u.position && (
                      <div className="text-[11px] text-gray-400">{u.position}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
