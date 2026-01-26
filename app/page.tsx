'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'
import SetupPage from '@/components/SetupPage'

const SUPABASE_URL = 'https://tjgmuxfmkrklqjzmwarl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZ211eGZta3JrbHFqem13YXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzIwMTAsImV4cCI6MjA4NDI0ODAxMH0.5itBTNTO7I3vjVZn0OXoLnGt69L7YFEuunhfsqT3llY'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        if (!initialized && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          setInitialized(true)
          
          try {
            // 직접 fetch로 프로필 개수 확인
            const countRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`, {
              headers: { 'apikey': SUPABASE_KEY }
            })
            const profiles = await countRes.json()
            
            if (!profiles || profiles.length === 0) {
              setNeedsSetup(true)
              setLoading(false)
              return
            }

            if (session?.user) {
              // 직접 fetch로 승인 상태 확인
              const profileRes = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=approval_status`,
                { headers: { 'apikey': SUPABASE_KEY } }
              )
              const profileData = await profileRes.json()
              const profile = profileData?.[0]
              
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

        if (initialized && event === 'SIGNED_IN' && session?.user) {
          setLoading(true)
          try {
            const profileRes = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=approval_status`,
              { headers: { 'apikey': SUPABASE_KEY } }
            )
            const profileData = await profileRes.json()
            const profile = profileData?.[0]
            
            if (profile?.approval_status !== 'approved') {
              await supabase.auth.signOut()
              setApprovalStatus(profile?.approval_status || 'pending')
              setUser(null)
            } else {
              setApprovalStatus(null)
              setUser(session.user)
            }
          } catch (error) {
            console.error('Auth error:', error)
          } finally {
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [initialized])

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
