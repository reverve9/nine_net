'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface DraggableModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  width?: string
  showHeader?: boolean
  headerContent?: ReactNode
  footerContent?: ReactNode
}

export default function DraggableModal({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-3xl',
  showHeader = true,
  headerContent,
  footerContent,
}: DraggableModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  // 모달 열릴 때 위치 초기화
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  const handleMouseDown = (e: React.MouseEvent) => {
    // 헤더 영역에서만 드래그 시작
    if ((e.target as HTMLElement).closest('.modal-header')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 모달 바깥 마우스 이벤트 처리
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, dragStart])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-2xl w-full ${width} max-h-[90vh] overflow-hidden shadow-xl flex flex-col`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        {/* 헤더 - 드래그 핸들 */}
        {showHeader && (
          <div className="modal-header flex items-center justify-between p-4 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none">
            {headerContent || (
              <h2 className="text-[16px] font-semibold text-gray-800">{title}</h2>
            )}
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        )}

        {/* 바디 */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* 푸터 */}
        {footerContent && (
          <div className="p-4 border-t border-gray-200">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  )
}
