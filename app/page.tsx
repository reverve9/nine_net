'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'
import SetupPage from '@/components/SetupPage'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const isProcessing = useRef(false)

  const checkSetup = async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    return count === 0 || count === null
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. 초기 설정 필요한지 확인
        const setupNeeded = await checkSetup()
        if (setupNeeded) {
          setNeedsSetup(true)
          setLoading(false)
          return
        }

        // 2. 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // 토큰 갱신 실패 시 로그아웃 처리
        if (error) {
          console.error('Session error:', error)
          await supabase.auth.signOut()
          setUser(null)
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
        }
      } catch (error) {
        console.error('Initialize error:', error)
        // 에러 발생 시 로그아웃 처리
        await supabase.auth.signOut()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initialize()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (isProcessing.current) return
        
        // 토큰 갱신 실패 시 로그아웃
        if (_event === 'TOKEN_REFRESHED' && !session) {
          setUser(null)
          setLoading(false)
          return
        }
        
        if (_event === 'SIGNED_IN' && session?.user) {
          isProcessing.current = true
          setLoading(true)
          
          try {
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
          } catch (error) {
            console.error('Auth change error:', error)
          } finally {
            setLoading(false)
            isProcessing.current = false
          }
        } else if (_event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
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

  if (needsSetup) {
    return <SetupPage onComplete={() => {
      setNeedsSetup(false)
    }} />
  }

  if (!user) {
    return <LoginPage initialMessage={
      approvalStatus === 'pending' ? '승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.' :
      approvalStatus === 'rejected' ? '가입이 거절되었습니다. 관리자에게 문의하세요.' : undefined
    } />
  }

  return <Dashboard user={user} />
}
