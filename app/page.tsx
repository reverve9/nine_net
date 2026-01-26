'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'
import SetupPage from '@/components/SetupPage'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    let mounted = true

    const handleSession = async (session: any) => {
      if (!mounted) return
      
      try {
        // 초기 설정 확인
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        
        if (count === 0 || count === null) {
          setNeedsSetup(true)
          setLoading(false)
          return
        }

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
            setUser(session.user)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Session error:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          await handleSession(session)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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

  if (needsSetup) {
    return <SetupPage onComplete={() => setNeedsSetup(false)} />
  }

  if (!user) {
    return <LoginPage initialMessage={
      approvalStatus === 'pending' ? '승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.' :
      approvalStatus === 'rejected' ? '가입이 거절되었습니다. 관리자에게 문의하세요.' : undefined
    } />
  }

  return <Dashboard user={user} />
}
