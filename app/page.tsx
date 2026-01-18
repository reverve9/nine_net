'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)

  useEffect(() => {
    // 현재 세션 확인
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // 승인 상태 확인
        const { data: profile } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', session.user.id)
          .single()
        
        if (profile?.approval_status !== 'approved') {
          // 미승인 → 로그아웃
          await supabase.auth.signOut()
          setApprovalStatus(profile?.approval_status || 'pending')
          setUser(null)
        } else {
          setUser(session.user)
        }
      }
      
      setLoading(false)
    }

    checkSession()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('approval_status')
            .eq('id', session.user.id)
            .single()
          
          if (profile?.approval_status !== 'approved') {
            await supabase.auth.signOut()
            setApprovalStatus(profile?.approval_status || 'pending')
            setUser(null)
          } else {
            setApprovalStatus(null)
            setUser(session.user)
          }
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage initialMessage={
      approvalStatus === 'pending' ? '승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.' :
      approvalStatus === 'rejected' ? '가입이 거절되었습니다. 관리자에게 문의하세요.' : undefined
    } />
  }

  return <Dashboard user={user} />
}
