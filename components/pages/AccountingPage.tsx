'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageContainer } from '@/components/common/PageLayout'

interface AccountingPageProps {
  user: any
  profile: any
  subMenu: string
}

export default function AccountingPage({ user, profile, subMenu }: AccountingPageProps) {
  const [loading, setLoading] = useState(false)

  const getPageTitle = () => {
    switch (subMenu) {
      case 'expense': return '지출 내역'
      case 'revenue': return '매출 현황'
      case 'budget': return '예산 관리'
      default: return '회계'
    }
  }

  const renderContent = () => {
    switch (subMenu) {
      case 'expense':
        return (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">💸</div>
            <p>지출 내역 페이지 준비 중</p>
          </div>
        )
      case 'revenue':
        return (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">💰</div>
            <p>매출 현황 페이지 준비 중</p>
          </div>
        )
      case 'budget':
        return (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">📊</div>
            <p>예산 관리 페이지 준비 중</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">{getPageTitle()}</h1>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
        {renderContent()}
      </div>
    </PageContainer>
  )
}
