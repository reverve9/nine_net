'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SettingsPageProps {
  user: any
  profile: any
  setProfile: (profile: any) => void
}

export default function SettingsPage({ user, profile, setProfile }: SettingsPageProps) {
  const [name, setName] = useState(profile?.name || '')
  const [role, setRole] = useState(profile?.role || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name,
        role,
        email: user.email,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      setMessage('저장 중 오류가 발생했습니다.')
    } else {
      setMessage('저장되었습니다!')
      setProfile(data)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ 설정</h1>

      <div className="space-y-6 max-w-2xl">
        {/* 프로필 설정 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">프로필</h3>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {profile?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="이름을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                직책/역할
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="예: 개발팀 대리"
              />
            </div>
          </div>

          {message && (
            <p
              className={`mt-4 text-sm ${
                message.includes('오류') ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {message}
            </p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>

        {/* 알림 설정 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">알림 설정</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-600">메시지 알림</span>
              <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-600">일정 알림</span>
              <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-600">게시판 알림</span>
              <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            * 알림 기능은 추후 업데이트 예정입니다
          </p>
        </div>

        {/* 계정 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">계정</h3>
          <p className="text-sm text-gray-500 mb-4">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
