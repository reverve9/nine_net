'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SetupPageProps {
  onComplete: () => void
}

export default function SetupPage({ onComplete }: SetupPageProps) {
  // 회사 정보
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [ceoName, setCeoName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  
  // 대표 계정
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (adminPassword.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      // 1. 회사 정보 저장
      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          business_number: businessNumber || null,
          ceo_name: ceoName,
          phone: companyPhone || null,
          address: companyAddress || null,
          is_our_company: true,
        })

      if (companyError) throw companyError

      // 2. 대표 계정 생성
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            name: ceoName,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            role: 'super_admin', 
            approval_status: 'approved',
            name: ceoName,
          })
          .eq('id', data.user.id)

        if (updateError) throw updateError

        alert('초기 설정이 완료되었습니다!\n이메일 인증 후 로그인해주세요.')
        await supabase.auth.signOut()
        onComplete()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-8">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Nine Net</h1>
          <p className="text-gray-500 mt-1">초기 설정</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 회사 정보 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">회사 정보</h3>
            
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">회사명 *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="우리회사"
                required
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">사업자등록번호</label>
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="000-00-00000"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">대표자명 *</label>
              <input
                type="text"
                value={ceoName}
                onChange={(e) => setCeoName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="홍길동"
                required
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">전화번호</label>
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="02-0000-0000"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">주소</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="서울시 강남구..."
              />
            </div>
          </div>

          {/* 대표 계정 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">대표 관리자 계정</h3>
            
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">이메일 *</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="admin@company.com"
                required
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">비밀번호 *</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="6자 이상"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '설정 중...' : '초기 설정 완료'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          © 2024 Nine Net. All rights reserved.
        </p>
      </div>
    </div>
  )
}
