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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        // INITIAL_SESSION: 앱 시작 시 세션 복구 완료
        if (event === 'INITIAL_SESSION') {
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
            }
          } catch (error) {
            console.error('Initialize error:', error)
          } finally {
            setLoading(false)
          }
          return
        }
        
        if (isProcessing.current) return
        
        if (event === 'SIGNED_IN' && session?.user) {
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
        } else if (event === 'SIGNED_OUT') {
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
