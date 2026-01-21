'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Company {
  id: string
  name: string
  address: string | null
  ceo_name: string | null
  ceo_phone: string | null
  ceo_email: string | null
  business_type: string | null
  business_number: string | null
  info: string | null
  is_important: boolean
  created_at: string
  primary_contact?: CompanyContact | null
  business_license_url: string | null
  bankbook_url: string | null
}

interface CompanyContact {
  id: string
  company_id: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  memo: string | null
  sort_order: number
  created_at: string
}

interface PersonalContact {
  id: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  company_name: string | null
  info: string | null
  is_important: boolean
  created_at: string
}

interface Organization {
  id: string
  name: string
  address: string | null
  phone: string | null
  info: string | null
  is_important: boolean
  created_at: string
  primary_contact?: OrganizationContact | null
}

interface OrganizationContact {
  id: string
  organization_id: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  memo: string | null
  sort_order: number
  created_at: string
}

interface PartnershipPageProps {
  user: any
  profile: any
  subMenu: string
}

// 사업자등록번호 포맷팅 (000-00-00000)
const formatBusinessNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 10)
  if (numbers.length <= 3) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`
}

// 한글 입력 안전한 Input 컴포넌트
const SafeInput = ({ 
  value, 
  onChange, 
  className = '', 
  ...props 
}: { 
  value: string
  onChange: (value: string) => void
  className?: string
  [key: string]: any 
}) => {
  const [localValue, setLocalValue] = useState(value)
  const isComposing = useRef(false)

  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value)
    }
  }, [value])

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value)
        if (!isComposing.current) {
          onChange(e.target.value)
        }
      }}
      onCompositionStart={() => { isComposing.current = true }}
      onCompositionEnd={(e) => {
        isComposing.current = false
        onChange((e.target as HTMLInputElement).value)
      }}
      className={className}
    />
  )
}

// 한글 입력 안전한 Textarea 컴포넌트
const SafeTextarea = ({ 
  value, 
  onChange, 
  className = '', 
  ...props 
}: { 
  value: string
  onChange: (value: string) => void
  className?: string
  [key: string]: any 
}) => {
  const [localValue, setLocalValue] = useState(value)
  const isComposing = useRef(false)

  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value)
    }
  }, [value])

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value)
        if (!isComposing.current) {
          onChange(e.target.value)
        }
      }}
      onCompositionStart={() => { isComposing.current = true }}
      onCompositionEnd={(e) => {
        isComposing.current = false
        onChange((e.target as HTMLTextAreaElement).value)
      }}
      className={className}
    />
  )
}

// 파일 미리보기 모달 컴포넌트
const FilePreviewModal = ({
  url,
  fileName,
  onClose
}: {
  url: string
  fileName: string
  onClose: () => void
}) => {
  const [scale, setScale] = useState(1)
  const isPdf = url.toLowerCase().includes('.pdf')
  
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const resetZoom = () => setScale(1)

  const handleDownload = async () => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = fileName || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('다운로드 실패:', error)
      alert('다운로드에 실패했습니다.')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-bold text-gray-800">{fileName}</h3>
          <div className="flex items-center gap-2">
            {/* 확대/축소 컨트롤 (이미지만) */}
            {!isPdf && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="축소"
                >
                  ➖
                </button>
                <button
                  onClick={resetZoom}
                  className="px-2 h-8 flex items-center justify-center text-[12px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 min-w-[50px]"
                  title="원본 크기"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 3}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="확대"
                >
                  ➕
                </button>
              </div>
            )}
            
            {/* 다운로드 버튼 */}
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-[12px] text-white bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center gap-1"
            >
              <span>⬇️</span>
              <span>다운로드</span>
            </button>
            
            {/* 닫기 버튼 */}
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* 컨텐츠 */}
        <div className="flex-1 overflow-auto bg-gray-200 p-4">
          {isPdf ? (
            <iframe
              src={url}
              className="w-full h-[80vh] bg-white rounded-lg"
              title={fileName}
            />
          ) : (
            <div 
              className="flex items-center justify-center min-h-[60vh]"
              style={{ cursor: scale > 1 ? 'grab' : 'default' }}
            >
              <img
                src={url}
                alt={fileName}
                className="max-w-full transition-transform duration-200"
                style={{ 
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center'
                }}
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 테이블 컴포넌트
const DataTable = ({ 
  headers, 
  children,
  emptyMessage = '데이터가 없습니다'
}: { 
  headers: { key: string; label: string; width?: string; align?: string }[]
  children: React.ReactNode
  emptyMessage?: string
}) => {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {headers.map(h => (
              <th 
                key={h.key} 
                className={`px-3 py-2.5 text-[13px] font-medium text-gray-500 ${h.align === 'center' ? 'text-center' : 'text-left'}`}
                style={{ width: h.width }}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[13px]">
          {hasChildren ? children : (
            <tr>
              <td colSpan={headers.length} className="text-center py-8 text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// 페이지네이션 컴포넌트
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) => {
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center gap-1 text-[13px]">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-2 py-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ‹
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-2 py-1 rounded hover:bg-gray-100">1</button>
          {start > 2 && <span className="px-1 text-gray-400">...</span>}
        </>
      )}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-2 py-1 rounded ${p === currentPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="px-2 py-1 rounded hover:bg-gray-100">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-2 py-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  )
}

const ITEMS_PER_PAGE = 10

type ViewMode = 'list' | 'card'

// 뷰 모드 토글 버튼
const ViewModeToggle = ({ 
  viewMode, 
  setViewMode 
}: { 
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void 
}) => (
  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
    <button
      onClick={() => setViewMode('list')}
      className={`px-2.5 py-1 rounded-md text-[12px] transition ${
        viewMode === 'list' 
          ? 'bg-white text-blue-600 shadow-sm' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
      title="리스트 보기"
    >
      ☰
    </button>
    <button
      onClick={() => setViewMode('card')}
      className={`px-2.5 py-1 rounded-md text-[12px] transition ${
        viewMode === 'card' 
          ? 'bg-white text-blue-600 shadow-sm' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
      title="카드 보기"
    >
      ▦
    </button>
  </div>
)

// 기업 카드 컴포넌트
const CompanyCard = ({ 
  company, 
  onClick, 
  onToggleImportant 
}: { 
  company: Company
  onClick: () => void
  onToggleImportant: (e: React.MouseEvent) => void
}) => (
  <div 
    onClick={onClick}
    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition"
  >
    <div className="flex items-start justify-between mb-2">
      <h3 className="font-semibold text-gray-800 text-[14px]">{company.name}</h3>
      <button
        onClick={onToggleImportant}
        className={`text-base ${company.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
      >
        ⭐
      </button>
    </div>
    <div className="space-y-1 text-[12px]">
      <p className="text-gray-500">
        <span className="text-gray-400">대표:</span> {company.ceo_name || '-'}
      </p>
      <p className="text-gray-500">
        <span className="text-gray-400">업종:</span> {company.business_type || '-'}
      </p>
      <p className="text-gray-500 truncate">
        <span className="text-gray-400">주소:</span> {company.address || '-'}
      </p>
      {company.primary_contact && (
        <p className="text-blue-600 mt-2">
          <span className="text-gray-400">담당:</span> {company.primary_contact.name} {company.primary_contact.phone && `(${company.primary_contact.phone})`}
        </p>
      )}
    </div>
    {(company.business_license_url || company.bankbook_url) && (
      <div className="flex gap-1 mt-3 pt-2 border-t">
        {company.business_license_url && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded">📄 사업자등록증</span>}
        {company.bankbook_url && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">📄 통장사본</span>}
      </div>
    )}
  </div>
)

// 기관 카드 컴포넌트
const OrganizationCard = ({ 
  organization, 
  onClick, 
  onToggleImportant 
}: { 
  organization: Organization
  onClick: () => void
  onToggleImportant: (e: React.MouseEvent) => void
}) => (
  <div 
    onClick={onClick}
    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition"
  >
    <div className="flex items-start justify-between mb-2">
      <h3 className="font-semibold text-gray-800 text-[14px]">{organization.name}</h3>
      <button
        onClick={onToggleImportant}
        className={`text-base ${organization.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
      >
        ⭐
      </button>
    </div>
    <div className="space-y-1 text-[12px]">
      <p className="text-gray-500 truncate">
        <span className="text-gray-400">주소:</span> {organization.address || '-'}
      </p>
      <p className="text-gray-500">
        <span className="text-gray-400">전화:</span> {organization.phone || '-'}
      </p>
      {organization.primary_contact && (
        <p className="text-blue-600 mt-2">
          <span className="text-gray-400">담당:</span> {organization.primary_contact.name} {organization.primary_contact.phone && `(${organization.primary_contact.phone})`}
        </p>
      )}
    </div>
  </div>
)

// 개인 카드 컴포넌트
const PersonalCard = ({ 
  personal, 
  onClick, 
  onToggleImportant 
}: { 
  personal: PersonalContact
  onClick: () => void
  onToggleImportant: (e: React.MouseEvent) => void
}) => (
  <div 
    onClick={onClick}
    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition"
  >
    <div className="flex items-start justify-between mb-2">
      <div>
        <h3 className="font-semibold text-gray-800 text-[14px]">{personal.name}</h3>
        {personal.position && <p className="text-[11px] text-gray-400">{personal.position}</p>}
      </div>
      <button
        onClick={onToggleImportant}
        className={`text-base ${personal.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
      >
        ⭐
      </button>
    </div>
    <div className="space-y-1 text-[12px]">
      <p className="text-gray-500">
        <span className="text-gray-400">전화:</span> {personal.phone || '-'}
      </p>
      <p className="text-gray-500">
        <span className="text-gray-400">이메일:</span> {personal.email || '-'}
      </p>
      {personal.company_name && (
        <p className="text-blue-600 mt-2">
          <span className="text-gray-400">회사:</span> {personal.company_name}
        </p>
      )}
    </div>
  </div>
)

export default function PartnershipPage({ user, profile, subMenu }: PartnershipPageProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [personalContacts, setPersonalContacts] = useState<PersonalContact[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [companyContacts, setCompanyContacts] = useState<CompanyContact[]>([])
  const [organizationContacts, setOrganizationContacts] = useState<OrganizationContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // 모달 상태
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showOrganizationModal, setShowOrganizationModal] = useState(false)
  const [showPersonalModal, setShowPersonalModal] = useState(false)
  const [showCompanyDetailModal, setShowCompanyDetailModal] = useState(false)
  const [showOrganizationDetailModal, setShowOrganizationDetailModal] = useState(false)
  const [showPersonalDetailModal, setShowPersonalDetailModal] = useState(false)

  // 폼 상태
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)
  const [editingPersonal, setEditingPersonal] = useState<PersonalContact | null>(null)
  const [selectedPersonal, setSelectedPersonal] = useState<PersonalContact | null>(null)

  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    ceo_name: '',
    ceo_phone: '',
    ceo_email: '',
    business_type: '',
    business_number: '',
    info: '',
  })

  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    address: '',
    phone: '',
    info: '',
  })

  const [personalForm, setPersonalForm] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    company_name: '',
    info: '',
  })

  const [contactForm, setContactForm] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    memo: '',
  })
  const [editingContact, setEditingContact] = useState<CompanyContact | null>(null)

  const [orgContactForm, setOrgContactForm] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    memo: '',
  })
  const [editingOrgContact, setEditingOrgContact] = useState<OrganizationContact | null>(null)

  // 파일 업로드 상태
  const [uploadingFile, setUploadingFile] = useState<'business_license' | 'bankbook' | null>(null)
  const [showFilePreview, setShowFilePreview] = useState(false)
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string>('')
  const businessLicenseInputRef = useRef<HTMLInputElement>(null)
  const bankbookInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, subMenu])

  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyContacts(selectedCompany.id)
    }
  }, [selectedCompany])

  useEffect(() => {
    if (selectedOrganization) {
      fetchOrganizationContacts(selectedOrganization.id)
    }
  }, [selectedOrganization])

  const fetchData = async () => {
    setLoading(true)
    
    // 기업 데이터
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .order('is_important', { ascending: false })
      .order('name')
    
    // 기업 담당자 (첫번째만)
    const { data: companyContactsData } = await supabase
      .from('company_contacts')
      .select('*')
      .order('sort_order')
    
    // 기관 데이터
    const { data: organizationsData } = await supabase
      .from('organizations')
      .select('*')
      .order('is_important', { ascending: false })
      .order('name')
    
    // 기관 담당자 (첫번째만)
    const { data: orgContactsData } = await supabase
      .from('organization_contacts')
      .select('*')
      .order('sort_order')
    
    const { data: personalsData } = await supabase
      .from('personal_contacts')
      .select('*')
      .order('is_important', { ascending: false })
      .order('name')
    
    // 기업에 primary_contact 매핑
    if (companiesData) {
      const companiesWithContact = companiesData.map(company => ({
        ...company,
        primary_contact: companyContactsData?.find(c => c.company_id === company.id) || null
      }))
      setCompanies(companiesWithContact)
    }
    
    // 기관에 primary_contact 매핑
    if (organizationsData) {
      const orgsWithContact = organizationsData.map(org => ({
        ...org,
        primary_contact: orgContactsData?.find(c => c.organization_id === org.id) || null
      }))
      setOrganizations(orgsWithContact)
    }
    
    if (personalsData) setPersonalContacts(personalsData)
    
    setLoading(false)
  }

  const fetchCompanyContacts = async (companyId: string) => {
    const { data } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order')
    
    if (data) setCompanyContacts(data)
  }

  const fetchOrganizationContacts = async (organizationId: string) => {
    const { data } = await supabase
      .from('organization_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order')
    
    if (data) setOrganizationContacts(data)
  }

  // 파일 업로드 함수
  const handleFileUpload = async (file: File, type: 'business_license' | 'bankbook') => {
    if (!selectedCompany) return
    
    setUploadingFile(type)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedCompany.id}/${type}_${Date.now()}.${fileExt}`
      
      // 기존 파일 삭제
      const existingUrl = type === 'business_license' 
        ? selectedCompany.business_license_url 
        : selectedCompany.bankbook_url
      
      if (existingUrl) {
        // URL에서 파일 경로 추출
        const match = existingUrl.match(/company-docs\/(.+)\?/)
        if (match) {
          await supabase.storage.from('company-docs').remove([match[1]])
        }
      }
      
      // 새 파일 업로드
      const { error: uploadError } = await supabase.storage
        .from('company-docs')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError
      
      // Signed URL 생성 (1년 유효)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('company-docs')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365)
      
      if (signedError) throw signedError
      
      // DB 업데이트
      const updateData = type === 'business_license' 
        ? { business_license_url: signedData.signedUrl }
        : { bankbook_url: signedData.signedUrl }
      
      await supabase
        .from('companies')
        .update(updateData)
        .eq('id', selectedCompany.id)
      
      // 상태 업데이트
      setSelectedCompany({
        ...selectedCompany,
        ...updateData
      })
      
      // 리스트 갱신
      fetchData()
      
    } catch (error) {
      console.error('파일 업로드 실패:', error)
      alert('파일 업로드에 실패했습니다.')
    } finally {
      setUploadingFile(null)
    }
  }

  // 파일 삭제 함수
  const handleFileDelete = async (type: 'business_license' | 'bankbook') => {
    if (!selectedCompany) return
    if (!confirm('파일을 삭제하시겠습니까?')) return
    
    try {
      const url = type === 'business_license' 
        ? selectedCompany.business_license_url 
        : selectedCompany.bankbook_url
      
      if (url) {
        // Signed URL에서 파일 경로 추출
        const match = url.match(/company-docs\/(.+)\?/)
        if (match) {
          await supabase.storage.from('company-docs').remove([match[1]])
        }
      }
      
      const updateData = type === 'business_license'
        ? { business_license_url: null }
        : { bankbook_url: null }
      
      await supabase
        .from('companies')
        .update(updateData)
        .eq('id', selectedCompany.id)
      
      setSelectedCompany({
        ...selectedCompany,
        ...updateData
      })
      
      fetchData()
      
    } catch (error) {
      console.error('파일 삭제 실패:', error)
      alert('파일 삭제에 실패했습니다.')
    }
  }

  // 파일 미리보기 함수
  const openFilePreview = async (url: string, name: string) => {
    setPreviewFileName(name)
    setPreviewFileUrl(url)
    setShowFilePreview(true)
  }

  // 기업 CRUD
  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) return

    const saveData = {
      ...companyForm,
      business_number: formatBusinessNumber(companyForm.business_number)
    }

    if (editingCompany) {
      await supabase.from('companies').update(saveData).eq('id', editingCompany.id)
    } else {
      await supabase.from('companies').insert(saveData)
    }

    setShowCompanyModal(false)
    resetCompanyForm()
    fetchData()
  }

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`"${company.name}" 기업을 삭제하시겠습니까?\n담당자 정보도 함께 삭제됩니다.`)) return
    
    await supabase.from('company_contacts').delete().eq('company_id', company.id)
    await supabase.from('companies').delete().eq('id', company.id)
    if (selectedCompany?.id === company.id) {
      setSelectedCompany(null)
      setCompanyContacts([])
    }
    setShowCompanyDetailModal(false)
    fetchData()
  }

  const openEditCompany = (company: Company) => {
    setEditingCompany(company)
    setCompanyForm({
      name: company.name,
      address: company.address || '',
      ceo_name: company.ceo_name || '',
      ceo_phone: company.ceo_phone || '',
      ceo_email: company.ceo_email || '',
      business_type: company.business_type || '',
      business_number: company.business_number || '',
      info: company.info || '',
    })
    setShowCompanyDetailModal(false)
    setShowCompanyModal(true)
  }

  const openCompanyDetail = (company: Company) => {
    setSelectedCompany(company)
    setShowCompanyDetailModal(true)
  }

  const resetCompanyForm = () => {
    setEditingCompany(null)
    setCompanyForm({ name: '', address: '', ceo_name: '', ceo_phone: '', ceo_email: '', business_type: '', business_number: '', info: '' })
  }

  const toggleCompanyImportant = async (company: Company, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase
      .from('companies')
      .update({ is_important: !company.is_important })
      .eq('id', company.id)
    fetchData()
  }

  const togglePersonalImportant = async (personal: PersonalContact, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase
      .from('personal_contacts')
      .update({ is_important: !personal.is_important })
      .eq('id', personal.id)
    fetchData()
  }

  // 기관 CRUD
  const handleSaveOrganization = async () => {
    if (!organizationForm.name.trim()) return

    if (editingOrganization) {
      await supabase.from('organizations').update(organizationForm).eq('id', editingOrganization.id)
    } else {
      await supabase.from('organizations').insert(organizationForm)
    }

    setShowOrganizationModal(false)
    resetOrganizationForm()
    fetchData()
  }

  const handleDeleteOrganization = async (org: Organization) => {
    if (!confirm(`"${org.name}" 기관을 삭제하시겠습니까?`)) return
    
    await supabase.from('organizations').delete().eq('id', org.id)
    setShowOrganizationDetailModal(false)
    fetchData()
  }

  const openEditOrganization = (org: Organization) => {
    setEditingOrganization(org)
    setOrganizationForm({
      name: org.name,
      address: org.address || '',
      phone: org.phone || '',
      info: org.info || '',
    })
    setShowOrganizationDetailModal(false)
    setShowOrganizationModal(true)
  }

  const openOrganizationDetail = (org: Organization) => {
    setSelectedOrganization(org)
    setShowOrganizationDetailModal(true)
  }

  const resetOrganizationForm = () => {
    setEditingOrganization(null)
    setOrganizationForm({ name: '', address: '', phone: '', info: '' })
  }

  const toggleOrganizationImportant = async (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase
      .from('organizations')
      .update({ is_important: !org.is_important })
      .eq('id', org.id)
    fetchData()
  }

  // 담당자 CRUD
  const handleSaveContact = async () => {
    if (!contactForm.name.trim() || !selectedCompany) return

    if (editingContact) {
      await supabase.from('company_contacts').update(contactForm).eq('id', editingContact.id)
    } else {
      const maxOrder = companyContacts.length > 0 ? Math.max(...companyContacts.map(c => c.sort_order)) : 0
      await supabase.from('company_contacts').insert({
        ...contactForm,
        company_id: selectedCompany.id,
        sort_order: maxOrder + 1,
      })
    }

    resetContactForm()
    fetchCompanyContacts(selectedCompany.id)
  }

  const handleDeleteContact = async (contact: CompanyContact) => {
    if (!confirm(`"${contact.name}" 담당자를 삭제하시겠습니까?`)) return
    
    await supabase.from('company_contacts').delete().eq('id', contact.id)
    if (selectedCompany) fetchCompanyContacts(selectedCompany.id)
  }

  const openEditContact = (contact: CompanyContact) => {
    setEditingContact(contact)
    setContactForm({
      name: contact.name,
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
      memo: contact.memo || '',
    })
  }

  const resetContactForm = () => {
    setEditingContact(null)
    setContactForm({ name: '', position: '', phone: '', email: '', memo: '' })
  }

  const moveContact = async (contact: CompanyContact, direction: 'up' | 'down') => {
    const currentIndex = companyContacts.findIndex(c => c.id === contact.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex < 0 || targetIndex >= companyContacts.length) return
    
    const targetContact = companyContacts[targetIndex]
    
    await supabase.from('company_contacts').update({ sort_order: targetContact.sort_order }).eq('id', contact.id)
    await supabase.from('company_contacts').update({ sort_order: contact.sort_order }).eq('id', targetContact.id)
    
    if (selectedCompany) fetchCompanyContacts(selectedCompany.id)
  }

  // 기관 담당자 CRUD
  const handleSaveOrgContact = async () => {
    if (!orgContactForm.name.trim() || !selectedOrganization) return

    if (editingOrgContact) {
      await supabase.from('organization_contacts').update(orgContactForm).eq('id', editingOrgContact.id)
    } else {
      const maxOrder = organizationContacts.length > 0 ? Math.max(...organizationContacts.map(c => c.sort_order)) : 0
      await supabase.from('organization_contacts').insert({
        ...orgContactForm,
        organization_id: selectedOrganization.id,
        sort_order: maxOrder + 1,
      })
    }

    resetOrgContactForm()
    fetchOrganizationContacts(selectedOrganization.id)
    fetchData()
  }

  const handleDeleteOrgContact = async (contact: OrganizationContact) => {
    if (!confirm(`"${contact.name}" 담당자를 삭제하시겠습니까?`)) return
    
    await supabase.from('organization_contacts').delete().eq('id', contact.id)
    if (selectedOrganization) {
      fetchOrganizationContacts(selectedOrganization.id)
      fetchData()
    }
  }

  const openEditOrgContact = (contact: OrganizationContact) => {
    setEditingOrgContact(contact)
    setOrgContactForm({
      name: contact.name,
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
      memo: contact.memo || '',
    })
  }

  const resetOrgContactForm = () => {
    setEditingOrgContact(null)
    setOrgContactForm({ name: '', position: '', phone: '', email: '', memo: '' })
  }

  const moveOrgContact = async (contact: OrganizationContact, direction: 'up' | 'down') => {
    const currentIndex = organizationContacts.findIndex(c => c.id === contact.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex < 0 || targetIndex >= organizationContacts.length) return
    
    const targetContact = organizationContacts[targetIndex]
    
    await supabase.from('organization_contacts').update({ sort_order: targetContact.sort_order }).eq('id', contact.id)
    await supabase.from('organization_contacts').update({ sort_order: contact.sort_order }).eq('id', targetContact.id)
    
    if (selectedOrganization) fetchOrganizationContacts(selectedOrganization.id)
  }

  // 개인 CRUD
  const handleSavePersonal = async () => {
    if (!personalForm.name.trim()) return

    if (editingPersonal) {
      await supabase.from('personal_contacts').update(personalForm).eq('id', editingPersonal.id)
    } else {
      await supabase.from('personal_contacts').insert({ ...personalForm, created_by: user.id })
    }

    setShowPersonalModal(false)
    resetPersonalForm()
    fetchData()
  }

  const handleDeletePersonal = async (personal: PersonalContact) => {
    if (!confirm(`"${personal.name}" 연락처를 삭제하시겠습니까?`)) return
    
    await supabase.from('personal_contacts').delete().eq('id', personal.id)
    setShowPersonalDetailModal(false)
    setSelectedPersonal(null)
    fetchData()
  }

  const openEditPersonal = (personal: PersonalContact) => {
    setEditingPersonal(personal)
    setPersonalForm({
      name: personal.name,
      position: personal.position || '',
      phone: personal.phone || '',
      email: personal.email || '',
      company_name: personal.company_name || '',
      info: personal.info || '',
    })
    setShowPersonalModal(true)
    setShowPersonalDetailModal(false)
  }

  const resetPersonalForm = () => {
    setEditingPersonal(null)
    setPersonalForm({ name: '', position: '', phone: '', email: '', company_name: '', info: '' })
  }

  const openPersonalDetail = (personal: PersonalContact) => {
    setSelectedPersonal(personal)
    setShowPersonalDetailModal(true)
  }

  // 필터링
  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.ceo_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.business_type?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredOrganizations = organizations.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPersonals = personalContacts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 페이지네이션 계산
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const totalCompanyPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE)

  const paginatedOrganizations = filteredOrganizations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const totalOrganizationPages = Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE)
  
  const paginatedPersonals = filteredPersonals.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const totalPersonalPages = Math.ceil(filteredPersonals.length / ITEMS_PER_PAGE)

  // 입력 스타일
  const inputClass = "w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
  const inputClassLg = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // 기업 테이블 헤더
  const companyHeaders = [
    { key: 'star', label: '', width: '36px' },
    { key: 'name', label: '회사명' },
    { key: 'ceo', label: '대표' },
    { key: 'address', label: '주소' },
    { key: 'type', label: '업종' },
    { key: 'biznum', label: '사업자번호' },
    { key: 'contact_name', label: '담당자' },
    { key: 'contact_phone', label: '담당자 연락처' },
  ]

  // 기관 테이블 헤더
  const organizationHeaders = [
    { key: 'star', label: '', width: '36px' },
    { key: 'name', label: '기관명' },
    { key: 'address', label: '주소' },
    { key: 'phone', label: '전화번호' },
    { key: 'contact_name', label: '담당자' },
    { key: 'contact_phone', label: '담당자 연락처' },
  ]

  // 개인 테이블 헤더
  const personalHeaders = [
    { key: 'star', label: '', width: '36px' },
    { key: 'name', label: '이름' },
    { key: 'position', label: '직책' },
    { key: 'phone', label: '전화번호' },
    { key: 'email', label: '이메일' },
    { key: 'company', label: '회사명' },
  ]

  // 전체 보기
  if (subMenu === 'all') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">전체 파트너</h1>
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        <div className="mb-3">
          <SafeInput
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {/* 기업 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-gray-500">기업 ({filteredCompanies.length})</h2>
            </div>
            {viewMode === 'list' ? (
              <DataTable headers={companyHeaders} emptyMessage="등록된 기업이 없습니다">
                {filteredCompanies.slice(0, 5).map(company => (
                  <tr 
                    key={company.id} 
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => openCompanyDetail(company)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleCompanyImportant(company, e)}
                        className={`text-base ${company.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                      >
                        ⭐
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{company.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{company.ceo_name || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600 truncate max-w-[150px]">{company.address || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{company.business_type || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{company.business_number || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{company.primary_contact?.name || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{company.primary_contact?.phone || '-'}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredCompanies.slice(0, 8).map(company => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onClick={() => openCompanyDetail(company)}
                    onToggleImportant={(e) => toggleCompanyImportant(company, e)}
                  />
                ))}
                {filteredCompanies.length === 0 && (
                  <p className="col-span-full text-center text-gray-400 py-8 text-[13px]">등록된 기업이 없습니다</p>
                )}
              </div>
            )}
          </div>

          {/* 기관 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-gray-500">기관 ({filteredOrganizations.length})</h2>
            </div>
            {viewMode === 'list' ? (
              <DataTable headers={organizationHeaders} emptyMessage="등록된 기관이 없습니다">
                {filteredOrganizations.slice(0, 5).map(org => (
                  <tr 
                    key={org.id} 
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => openOrganizationDetail(org)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleOrganizationImportant(org, e)}
                        className={`text-base ${org.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                      >
                        ⭐
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{org.name}</td>
                    <td className="px-3 py-2.5 text-gray-600 truncate max-w-[150px]">{org.address || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{org.phone || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{org.primary_contact?.name || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{org.primary_contact?.phone || '-'}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredOrganizations.slice(0, 8).map(org => (
                  <OrganizationCard
                    key={org.id}
                    organization={org}
                    onClick={() => openOrganizationDetail(org)}
                    onToggleImportant={(e) => toggleOrganizationImportant(org, e)}
                  />
                ))}
                {filteredOrganizations.length === 0 && (
                  <p className="col-span-full text-center text-gray-400 py-8 text-[13px]">등록된 기관이 없습니다</p>
                )}
              </div>
            )}
          </div>

          {/* 개인 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-gray-500">개인 ({filteredPersonals.length})</h2>
            </div>
            {viewMode === 'list' ? (
              <DataTable headers={personalHeaders} emptyMessage="등록된 개인 연락처가 없습니다">
                {filteredPersonals.slice(0, 5).map(personal => (
                  <tr 
                    key={personal.id} 
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => openPersonalDetail(personal)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => togglePersonalImportant(personal, e)}
                        className={`text-base ${personal.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                      >
                        ⭐
                      </button>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{personal.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{personal.position || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{personal.phone || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{personal.email || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{personal.company_name || '-'}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredPersonals.slice(0, 8).map(personal => (
                  <PersonalCard
                    key={personal.id}
                    personal={personal}
                    onClick={() => openPersonalDetail(personal)}
                    onToggleImportant={(e) => togglePersonalImportant(personal, e)}
                  />
                ))}
                {filteredPersonals.length === 0 && (
                  <p className="col-span-full text-center text-gray-400 py-8 text-[13px]">등록된 개인 연락처가 없습니다</p>
                )}
              </div>
            )}
          </div>
        </div>

        {renderModals()}
      </div>
    )
  }

  // 기업 보기
  if (subMenu === 'company') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">기업</h1>
          <div className="flex items-center gap-3">
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            <Pagination currentPage={currentPage} totalPages={totalCompanyPages} onPageChange={setCurrentPage} />
            <button
              onClick={() => {
                resetCompanyForm()
                setShowCompanyModal(true)
              }}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-[13px]"
            >
              + 기업 추가
            </button>
          </div>
        </div>

        <div className="mb-3">
          <SafeInput
            type="text"
            placeholder="회사명, 대표명, 업종으로 검색..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex-1 overflow-auto">
          {viewMode === 'list' ? (
            <DataTable headers={companyHeaders} emptyMessage="등록된 기업이 없습니다">
              {paginatedCompanies.map(company => (
                <tr 
                  key={company.id} 
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openCompanyDetail(company)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleCompanyImportant(company, e)}
                      className={`text-base ${company.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                    >
                      ⭐
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{company.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{company.ceo_name || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600 truncate max-w-[150px]">{company.address || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{company.business_type || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{company.business_number || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{company.primary_contact?.name || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{company.primary_contact?.phone || '-'}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedCompanies.map(company => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onClick={() => openCompanyDetail(company)}
                  onToggleImportant={(e) => toggleCompanyImportant(company, e)}
                />
              ))}
              {paginatedCompanies.length === 0 && (
                <p className="col-span-full text-center text-gray-400 py-8 text-[13px]">등록된 기업이 없습니다</p>
              )}
            </div>
          )}
        </div>

        {renderModals()}
      </div>
    )
  }

  // 기관 보기
  if (subMenu === 'organization') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">기관</h1>
          <div className="flex items-center gap-3">
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            <Pagination currentPage={currentPage} totalPages={totalOrganizationPages} onPageChange={setCurrentPage} />
            <button
              onClick={() => {
                resetOrganizationForm()
                setShowOrganizationModal(true)
              }}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-[13px]"
            >
              + 기관 추가
            </button>
          </div>
        </div>

        <div className="mb-3">
          <SafeInput
            type="text"
            placeholder="기관명, 주소로 검색..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex-1 overflow-auto">
          {viewMode === 'list' ? (
            <DataTable headers={organizationHeaders} emptyMessage="등록된 기관이 없습니다">
              {paginatedOrganizations.map(org => (
                <tr 
                  key={org.id} 
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openOrganizationDetail(org)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleOrganizationImportant(org, e)}
                      className={`text-base ${org.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                    >
                      ⭐
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{org.name}</td>
                  <td className="px-3 py-2.5 text-gray-600 truncate max-w-[150px]">{org.address || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{org.phone || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{org.primary_contact?.name || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{org.primary_contact?.phone || '-'}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedOrganizations.map(org => (
                <OrganizationCard
                  key={org.id}
                  organization={org}
                  onClick={() => openOrganizationDetail(org)}
                  onToggleImportant={(e) => toggleOrganizationImportant(org, e)}
                />
              ))}
              {paginatedOrganizations.length === 0 && (
                <p className="col-span-full text-center text-gray-400 py-8 text-[13px]">등록된 기관이 없습니다</p>
              )}
            </div>
          )}
        </div>

        {renderModals()}
      </div>
    )
  }

  // 개인 보기
  if (subMenu === 'personal') {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">개인</h1>
          <div className="flex items-center gap-3">
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            <Pagination currentPage={currentPage} totalPages={totalPersonalPages} onPageChange={setCurrentPage} />
            <button
              onClick={() => {
                resetPersonalForm()
                setShowPersonalModal(true)
              }}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-[13px]"
            >
              + 개인 추가
            </button>
          </div>
        </div>

        <div className="mb-3">
          <SafeInput
            type="text"
            placeholder="이름, 회사명으로 검색..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex-1 overflow-auto">
          {viewMode === 'list' ? (
            <DataTable headers={personalHeaders} emptyMessage="등록된 개인 연락처가 없습니다">
              {paginatedPersonals.map(personal => (
                <tr 
                  key={personal.id} 
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openPersonalDetail(personal)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => togglePersonalImportant(personal, e)}
                      className={`text-base ${personal.is_important ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                    >
                      ⭐
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{personal.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{personal.position || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{personal.phone || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{personal.email || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{personal.company_name || '-'}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {paginatedPersonals.map(personal => (
                <PersonalCard
                  key={personal.id}
                  personal={personal}
                  onClick={() => openPersonalDetail(personal)}
                  onToggleImportant={(e) => togglePersonalImportant(personal, e)}
                />
              ))}
              {paginatedPersonals.length === 0 && (
                <p className="col-span-full text-center text-gray-400 py-8 text-[13px]">등록된 개인 연락처가 없습니다</p>
              )}
            </div>
          )}
        </div>

        {renderModals()}
      </div>
    )
  }

  // 모달들
  function renderModals() {
    return (
      <>
        {/* 기업 등록/수정 모달 */}
        {showCompanyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-gray-800 mb-4">
                {editingCompany ? '기업 수정' : '기업 추가'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">회사명 *</label>
                  <SafeInput
                    type="text"
                    value={companyForm.name}
                    onChange={(v) => setCompanyForm({ ...companyForm, name: v })}
                    className={inputClassLg}
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">주소</label>
                  <SafeInput
                    type="text"
                    value={companyForm.address}
                    onChange={(v) => setCompanyForm({ ...companyForm, address: v })}
                    className={inputClassLg}
                  />
                </div>
                <div className="border-t pt-3">
                  <p className="text-[13px] font-medium text-gray-700 mb-2">대표 정보</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">성명</label>
                      <SafeInput
                        type="text"
                        value={companyForm.ceo_name}
                        onChange={(v) => setCompanyForm({ ...companyForm, ceo_name: v })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">전화번호</label>
                      <SafeInput
                        type="text"
                        value={companyForm.ceo_phone}
                        onChange={(v) => setCompanyForm({ ...companyForm, ceo_phone: v })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">이메일</label>
                      <SafeInput
                        type="email"
                        value={companyForm.ceo_email}
                        onChange={(v) => setCompanyForm({ ...companyForm, ceo_email: v })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[13px] text-gray-600 mb-1">업종</label>
                    <SafeInput
                      type="text"
                      value={companyForm.business_type}
                      onChange={(v) => setCompanyForm({ ...companyForm, business_type: v })}
                      className={inputClassLg}
                      placeholder="예: 제조업, IT"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-gray-600 mb-1">사업자등록번호</label>
                    <SafeInput
                      type="text"
                      value={companyForm.business_number}
                      onChange={(v) => setCompanyForm({ ...companyForm, business_number: formatBusinessNumber(v) })}
                      className={inputClassLg}
                      placeholder="000-00-00000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">정보</label>
                  <SafeTextarea
                    value={companyForm.info}
                    onChange={(v) => setCompanyForm({ ...companyForm, info: v })}
                    className={inputClassLg}
                    rows={4}
                    placeholder="기업에 대한 메모를 입력하세요..."
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowCompanyModal(false)}
                  className="flex-1 py-2 text-[13px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveCompany}
                  disabled={!companyForm.name.trim()}
                  className="flex-1 py-2 text-[13px] text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 기업 상세 모달 */}
        {showCompanyDetailModal && selectedCompany && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">{selectedCompany.name}</h3>
                <button 
                  onClick={() => setShowCompanyDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              {/* 기업 정보 */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-[13px]">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">주소:</span> <span className="text-gray-800">{selectedCompany.address || '-'}</span></div>
                  <div><span className="text-gray-500">대표:</span> <span className="text-gray-800">{selectedCompany.ceo_name || '-'}</span></div>
                  <div><span className="text-gray-500">대표 연락처:</span> <span className="text-gray-800">{selectedCompany.ceo_phone || '-'}</span></div>
                  <div><span className="text-gray-500">대표 이메일:</span> <span className="text-gray-800">{selectedCompany.ceo_email || '-'}</span></div>
                  <div><span className="text-gray-500">업종:</span> <span className="text-gray-800">{selectedCompany.business_type || '-'}</span></div>
                  <div><span className="text-gray-500">사업자번호:</span> <span className="text-gray-800">{selectedCompany.business_number || '-'}</span></div>
                </div>
                {selectedCompany.info && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-[11px] text-gray-500 mb-1">정보</p>
                    <p className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded">{selectedCompany.info}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEditCompany(selectedCompany)} className="px-3 py-1.5 text-[11px] text-blue-600 bg-blue-50 rounded hover:bg-blue-100">수정</button>
                  <button onClick={() => handleDeleteCompany(selectedCompany)} className="px-3 py-1.5 text-[11px] text-red-600 bg-red-50 rounded hover:bg-red-100">삭제</button>
                </div>
              </div>

              {/* 담당자 */}
              <div>
                <h4 className="text-[13px] font-medium text-gray-700 mb-2">담당자</h4>
                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    <SafeInput placeholder="이름 *" value={contactForm.name} onChange={(v) => setContactForm({ ...contactForm, name: v })} className={inputClass} />
                    <SafeInput placeholder="직책" value={contactForm.position} onChange={(v) => setContactForm({ ...contactForm, position: v })} className={inputClass} />
                    <SafeInput placeholder="전화번호" value={contactForm.phone} onChange={(v) => setContactForm({ ...contactForm, phone: v })} className={inputClass} />
                    <SafeInput placeholder="이메일" value={contactForm.email} onChange={(v) => setContactForm({ ...contactForm, email: v })} className={inputClass} />
                    <SafeInput placeholder="비고" value={contactForm.memo} onChange={(v) => setContactForm({ ...contactForm, memo: v })} className={inputClass} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleSaveContact} disabled={!contactForm.name.trim()} className="px-2 py-1 text-[11px] text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50">
                      {editingContact ? '수정' : '추가'}
                    </button>
                    {editingContact && <button onClick={resetContactForm} className="px-2 py-1 text-[11px] text-gray-600 bg-gray-200 rounded hover:bg-gray-300">취소</button>}
                  </div>
                </div>

                {companyContacts.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-[13px]">등록된 담당자가 없습니다</p>
                ) : (
                  <div className="space-y-1">
                    {companyContacts.map((contact, index) => (
                      <div key={contact.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-[13px]">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveContact(contact, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[11px]">▲</button>
                          <button onClick={() => moveContact(contact, 'down')} disabled={index === companyContacts.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[11px]">▼</button>
                        </div>
                        <div className="flex-1 grid grid-cols-5 gap-1">
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-gray-600">{contact.position || '-'}</span>
                          <span className="text-gray-600">{contact.phone || '-'}</span>
                          <span className="text-gray-600">{contact.email || '-'}</span>
                          <span className="text-gray-400 truncate">{contact.memo || '-'}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditContact(contact)} className="px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50 rounded">수정</button>
                          <button onClick={() => handleDeleteContact(contact)} className="px-1.5 py-0.5 text-[11px] text-red-600 hover:bg-red-50 rounded">삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 첨부파일 */}
              <div className="mt-4">
                <h4 className="text-[13px] font-medium text-gray-700 mb-2">첨부파일</h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* 사업자등록증 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 mb-2">사업자등록증</p>
                    {selectedCompany.business_license_url ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openFilePreview(selectedCompany.business_license_url!, '사업자등록증')}
                          className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
                        >
                          <span className="text-lg">📄</span>
                          <span className="text-[12px] text-gray-700 truncate">사업자등록증 보기</span>
                        </button>
                        <button
                          onClick={() => handleFileDelete('business_license')}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={businessLicenseInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'business_license')
                            e.target.value = ''
                          }}
                        />
                        <button
                          onClick={() => businessLicenseInputRef.current?.click()}
                          disabled={uploadingFile === 'business_license'}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition disabled:opacity-50"
                        >
                          {uploadingFile === 'business_license' ? (
                            <span className="text-[12px]">업로드 중...</span>
                          ) : (
                            <>
                              <span>📤</span>
                              <span className="text-[12px]">파일 업로드</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* 통장사본 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 mb-2">통장사본</p>
                    {selectedCompany.bankbook_url ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openFilePreview(selectedCompany.bankbook_url!, '통장사본')}
                          className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
                        >
                          <span className="text-lg">📄</span>
                          <span className="text-[12px] text-gray-700 truncate">통장사본 보기</span>
                        </button>
                        <button
                          onClick={() => handleFileDelete('bankbook')}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={bankbookInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'bankbook')
                            e.target.value = ''
                          }}
                        />
                        <button
                          onClick={() => bankbookInputRef.current?.click()}
                          disabled={uploadingFile === 'bankbook'}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition disabled:opacity-50"
                        >
                          {uploadingFile === 'bankbook' ? (
                            <span className="text-[12px]">업로드 중...</span>
                          ) : (
                            <>
                              <span>📤</span>
                              <span className="text-[12px]">파일 업로드</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">* PDF, JPG, PNG 파일만 업로드 가능합니다.</p>
              </div>
            </div>
          </div>
        )}

        {/* 파일 미리보기 모달 */}
        {showFilePreview && previewFileUrl && (
          <FilePreviewModal
            url={previewFileUrl}
            fileName={previewFileName}
            onClose={() => setShowFilePreview(false)}
          />
        )}

        {/* 개인 등록/수정 모달 */}
        {showPersonalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-full max-w-md">
              <h3 className="text-base font-bold text-gray-800 mb-4">
                {editingPersonal ? '개인 수정' : '개인 추가'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">이름 *</label>
                  <SafeInput type="text" value={personalForm.name} onChange={(v) => setPersonalForm({ ...personalForm, name: v })} className={inputClassLg} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[13px] text-gray-600 mb-1">직책</label>
                    <SafeInput type="text" value={personalForm.position} onChange={(v) => setPersonalForm({ ...personalForm, position: v })} className={inputClassLg} />
                  </div>
                  <div>
                    <label className="block text-[13px] text-gray-600 mb-1">회사명</label>
                    <SafeInput type="text" value={personalForm.company_name} onChange={(v) => setPersonalForm({ ...personalForm, company_name: v })} className={inputClassLg} />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">전화번호</label>
                  <SafeInput type="text" value={personalForm.phone} onChange={(v) => setPersonalForm({ ...personalForm, phone: v })} className={inputClassLg} />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">이메일</label>
                  <SafeInput type="email" value={personalForm.email} onChange={(v) => setPersonalForm({ ...personalForm, email: v })} className={inputClassLg} />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">정보</label>
                  <SafeTextarea value={personalForm.info} onChange={(v) => setPersonalForm({ ...personalForm, info: v })} className={inputClassLg} rows={4} placeholder="메모를 입력하세요..." />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowPersonalModal(false)} className="flex-1 py-2 text-[13px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">취소</button>
                <button onClick={handleSavePersonal} disabled={!personalForm.name.trim()} className="flex-1 py-2 text-[13px] text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">저장</button>
              </div>
            </div>
          </div>
        )}

        {/* 개인 상세 모달 */}
        {showPersonalDetailModal && selectedPersonal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-full max-w-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">{selectedPersonal.name}</h3>
                <button onClick={() => setShowPersonalDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              <div className="space-y-2 text-[13px]">
                {selectedPersonal.position && <div><span className="text-gray-500">직책:</span> <span className="text-gray-800">{selectedPersonal.position}</span></div>}
                {selectedPersonal.company_name && <div><span className="text-gray-500">회사명:</span> <span className="text-gray-800">{selectedPersonal.company_name}</span></div>}
                {selectedPersonal.phone && <div><span className="text-gray-500">전화번호:</span> <span className="text-gray-800">{selectedPersonal.phone}</span></div>}
                {selectedPersonal.email && <div><span className="text-gray-500">이메일:</span> <span className="text-gray-800">{selectedPersonal.email}</span></div>}
                {selectedPersonal.info && (
                  <div className="pt-2 border-t">
                    <p className="text-[11px] text-gray-500 mb-1">정보</p>
                    <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-2 text-[13px]">{selectedPersonal.info}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => openEditPersonal(selectedPersonal)} className="flex-1 py-2 text-[13px] text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">수정</button>
                <button onClick={() => handleDeletePersonal(selectedPersonal)} className="flex-1 py-2 text-[13px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100">삭제</button>
              </div>
            </div>
          </div>
        )}

        {/* 기관 등록/수정 모달 */}
        {showOrganizationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-full max-w-md">
              <h3 className="text-base font-bold text-gray-800 mb-4">
                {editingOrganization ? '기관 수정' : '기관 추가'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">기관명 *</label>
                  <SafeInput type="text" value={organizationForm.name} onChange={(v) => setOrganizationForm({ ...organizationForm, name: v })} className={inputClassLg} />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">주소</label>
                  <SafeInput type="text" value={organizationForm.address} onChange={(v) => setOrganizationForm({ ...organizationForm, address: v })} className={inputClassLg} />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">전화번호</label>
                  <SafeInput type="text" value={organizationForm.phone} onChange={(v) => setOrganizationForm({ ...organizationForm, phone: v })} className={inputClassLg} />
                </div>
                <div>
                  <label className="block text-[13px] text-gray-600 mb-1">정보</label>
                  <SafeTextarea value={organizationForm.info} onChange={(v) => setOrganizationForm({ ...organizationForm, info: v })} className={inputClassLg} rows={4} placeholder="기관에 대한 메모를 입력하세요..." />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowOrganizationModal(false)} className="flex-1 py-2 text-[13px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">취소</button>
                <button onClick={handleSaveOrganization} disabled={!organizationForm.name.trim()} className="flex-1 py-2 text-[13px] text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">저장</button>
              </div>
            </div>
          </div>
        )}

        {/* 기관 상세 모달 */}
        {showOrganizationDetailModal && selectedOrganization && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">{selectedOrganization.name}</h3>
                <button onClick={() => setShowOrganizationDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              {/* 기관 정보 */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-[13px]">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">주소:</span> <span className="text-gray-800">{selectedOrganization.address || '-'}</span></div>
                  <div><span className="text-gray-500">전화번호:</span> <span className="text-gray-800">{selectedOrganization.phone || '-'}</span></div>
                </div>
                {selectedOrganization.info && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-[11px] text-gray-500 mb-1">정보</p>
                    <p className="text-gray-700 whitespace-pre-wrap bg-white p-2 rounded">{selectedOrganization.info}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEditOrganization(selectedOrganization)} className="px-3 py-1.5 text-[11px] text-blue-600 bg-blue-50 rounded hover:bg-blue-100">수정</button>
                  <button onClick={() => handleDeleteOrganization(selectedOrganization)} className="px-3 py-1.5 text-[11px] text-red-600 bg-red-50 rounded hover:bg-red-100">삭제</button>
                </div>
              </div>

              {/* 담당자 */}
              <div>
                <h4 className="text-[13px] font-medium text-gray-700 mb-2">담당자</h4>
                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    <SafeInput placeholder="이름 *" value={orgContactForm.name} onChange={(v) => setOrgContactForm({ ...orgContactForm, name: v })} className={inputClass} />
                    <SafeInput placeholder="직책" value={orgContactForm.position} onChange={(v) => setOrgContactForm({ ...orgContactForm, position: v })} className={inputClass} />
                    <SafeInput placeholder="전화번호" value={orgContactForm.phone} onChange={(v) => setOrgContactForm({ ...orgContactForm, phone: v })} className={inputClass} />
                    <SafeInput placeholder="이메일" value={orgContactForm.email} onChange={(v) => setOrgContactForm({ ...orgContactForm, email: v })} className={inputClass} />
                    <SafeInput placeholder="비고" value={orgContactForm.memo} onChange={(v) => setOrgContactForm({ ...orgContactForm, memo: v })} className={inputClass} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleSaveOrgContact} disabled={!orgContactForm.name.trim()} className="px-2 py-1 text-[11px] text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50">
                      {editingOrgContact ? '수정' : '추가'}
                    </button>
                    {editingOrgContact && <button onClick={resetOrgContactForm} className="px-2 py-1 text-[11px] text-gray-600 bg-gray-200 rounded hover:bg-gray-300">취소</button>}
                  </div>
                </div>

                {organizationContacts.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-[13px]">등록된 담당자가 없습니다</p>
                ) : (
                  <div className="space-y-1">
                    {organizationContacts.map((contact, index) => (
                      <div key={contact.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-[13px]">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveOrgContact(contact, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[11px]">▲</button>
                          <button onClick={() => moveOrgContact(contact, 'down')} disabled={index === organizationContacts.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[11px]">▼</button>
                        </div>
                        <div className="flex-1 grid grid-cols-5 gap-1">
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-gray-600">{contact.position || '-'}</span>
                          <span className="text-gray-600">{contact.phone || '-'}</span>
                          <span className="text-gray-600">{contact.email || '-'}</span>
                          <span className="text-gray-400 truncate">{contact.memo || '-'}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditOrgContact(contact)} className="px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50 rounded">수정</button>
                          <button onClick={() => handleDeleteOrgContact(contact)} className="px-1.5 py-0.5 text-[11px] text-red-600 hover:bg-red-50 rounded">삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return <div className="p-4">파트너쉽</div>
}
