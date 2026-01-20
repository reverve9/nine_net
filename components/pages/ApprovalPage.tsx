'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ApprovalPageProps {
  user: any
  profile: any
}

export default function ApprovalPage({ user, profile }: ApprovalPageProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'my'>('pending')

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">결재</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
          + 결재 요청
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          대기중
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'approved' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          승인됨
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'rejected' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          반려됨
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'my' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          내 요청
        </button>
      </div>

      {/* 결재 목록 - 추후 구현 */}
      <div className="flex-1 bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-center h-full text-gray-400">
          결재 문서가 없습니다
        </div>
      </div>
    </div>
  )
}
