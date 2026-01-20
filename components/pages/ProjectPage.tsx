'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ProjectPageProps {
  user: any
  profile: any
}

export default function ProjectPage({ user, profile }: ProjectPageProps) {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">프로젝트</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
          + 새 프로젝트
        </button>
      </div>

      {/* 칸반 보드 영역 - 추후 구현 */}
      <div className="flex-1 flex gap-4 overflow-x-auto">
        {/* 대기 컬럼 */}
        <div className="w-72 bg-gray-100 rounded-xl p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">📋 대기</h3>
            <span className="text-sm text-gray-400">0</span>
          </div>
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-sm py-8">항목이 없습니다</p>
          </div>
        </div>

        {/* 진행중 컬럼 */}
        <div className="w-72 bg-gray-100 rounded-xl p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">🔄 진행중</h3>
            <span className="text-sm text-gray-400">0</span>
          </div>
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-sm py-8">항목이 없습니다</p>
          </div>
        </div>

        {/* 검토 컬럼 */}
        <div className="w-72 bg-gray-100 rounded-xl p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">👀 검토</h3>
            <span className="text-sm text-gray-400">0</span>
          </div>
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-sm py-8">항목이 없습니다</p>
          </div>
        </div>

        {/* 완료 컬럼 */}
        <div className="w-72 bg-gray-100 rounded-xl p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">✅ 완료</h3>
            <span className="text-sm text-gray-400">0</span>
          </div>
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-sm py-8">항목이 없습니다</p>
          </div>
        </div>
      </div>
    </div>
  )
}
