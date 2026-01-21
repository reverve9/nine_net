'use client'

import { useState, useRef, useEffect } from 'react'

// ============================================
// 타입 정의
// ============================================
export type ViewMode = 'list' | 'card'

export interface TableHeader {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

// ============================================
// 뷰 모드 토글 버튼
// ============================================
export const ViewModeToggle = ({ 
  viewMode, 
  setViewMode 
}: { 
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void 
}) => (
  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
    <button
      onClick={() => setViewMode('list')}
      className={`px-2.5 py-1 rounded-md text-[13px] transition ${
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
      className={`px-2.5 py-1 rounded-md text-[13px] transition ${
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

// ============================================
// 페이지네이션
// ============================================
export const Pagination = ({
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
    <div className="flex items-center gap-1 text-[14px]">
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

// ============================================
// 데이터 테이블
// ============================================
export const DataTable = ({ 
  headers, 
  children,
  emptyMessage = '데이터가 없습니다'
}: { 
  headers: TableHeader[]
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
                className={`px-3 py-2.5 text-[14px] font-medium text-gray-500 ${
                  h.align === 'center' ? 'text-center' : h.align === 'right' ? 'text-right' : 'text-left'
                }`}
                style={{ width: h.width }}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[14px]">
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

// ============================================
// 카드 그리드 컨테이너
// ============================================
export const CardGrid = ({ 
  children,
  emptyMessage = '데이터가 없습니다'
}: { 
  children: React.ReactNode
  emptyMessage?: string
}) => {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {hasChildren ? children : (
        <p className="col-span-full text-center text-gray-400 py-8 text-[14px]">{emptyMessage}</p>
      )}
    </div>
  )
}

// ============================================
// 한글 입력 안전 Input
// ============================================
export const SafeInput = ({ 
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

// ============================================
// 한글 입력 안전 Textarea
// ============================================
export const SafeTextarea = ({ 
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

// ============================================
// 검색 입력창
// ============================================
export const SearchInput = ({
  value,
  onChange,
  placeholder = '검색...'
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) => (
  <SafeInput
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="w-full max-w-xs px-3 py-1.5 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
  />
)

// ============================================
// 페이지 헤더
// ============================================
export const PageHeader = ({
  title,
  children
}: {
  title: string
  children?: React.ReactNode
}) => (
  <div className="flex items-center justify-between mb-3">
    <h1 className="text-xl font-bold text-gray-800">{title}</h1>
    {children && (
      <div className="flex items-center gap-3">
        {children}
      </div>
    )}
  </div>
)

// ============================================
// 추가 버튼
// ============================================
export const AddButton = ({
  label,
  onClick
}: {
  label: string
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-[14px]"
  >
    + {label}
  </button>
)

// ============================================
// 페이지 레이아웃 컨테이너
// ============================================
export const PageContainer = ({
  children
}: {
  children: React.ReactNode
}) => (
  <div className="p-4 h-full flex flex-col">
    {children}
  </div>
)

// ============================================
// 컨텐츠 영역
// ============================================
export const ContentArea = ({
  children
}: {
  children: React.ReactNode
}) => (
  <div className="flex-1 overflow-auto">
    {children}
  </div>
)

// ============================================
// 파일 미리보기 모달
// ============================================
export const FilePreviewModal = ({
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
          <h3 className="text-[15px] font-bold text-gray-800">{fileName}</h3>
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
                  className="px-2 h-8 flex items-center justify-center text-[13px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 min-w-[50px]"
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
              className="px-3 py-1.5 text-[13px] text-white bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center gap-1"
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

// ============================================
// 모달 래퍼
// ============================================
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg'
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl p-5 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-gray-800">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ============================================
// 확인 모달
// ============================================
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmColor = 'blue'
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'blue' | 'red'
}) => {
  if (!isOpen) return null

  const colorClass = confirmColor === 'red' 
    ? 'bg-red-500 hover:bg-red-600' 
    : 'bg-blue-500 hover:bg-blue-600'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-sm">
        <h3 className="text-[16px] font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-[14px] text-gray-600 mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-[14px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 py-2 text-[14px] text-white ${colorClass} rounded-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 스타일 상수
// ============================================
export const inputClass = "w-full px-2 py-1.5 text-[14px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
export const inputClassLg = "w-full px-3 py-2 text-[15px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
