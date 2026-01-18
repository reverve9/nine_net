'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ProfileModalProps {
  user: any
  profile: any
  onClose: () => void
  onUpdate: (profile: any) => void
}

export default function ProfileModal({ user, profile, onClose, onUpdate }: ProfileModalProps) {
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [department, setDepartment] = useState(profile?.department || '')
  const [position, setPosition] = useState(profile?.position || '')
  const [statusMessage, setStatusMessage] = useState(profile?.status_message || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 비밀번호 변경
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    
    setUploading(true)
    
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      setAvatarUrl(publicUrl)
    } catch (error: any) {
      alert('프로필 사진 업로드 실패: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        phone,
        department,
        position,
        status_message: statusMessage,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id)
    
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      onUpdate({
        ...profile,
        name,
        phone,
        department,
        position,
        status_message: statusMessage,
        avatar_url: avatarUrl,
      })
      onClose()
    }
    
    setSaving(false)
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      setPasswordError('비밀번호 변경 실패: ' + error.message)
    } else {
      alert('비밀번호가 변경되었습니다.')
      setShowPasswordChange(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">프로필 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 프로필 사진 */}
          <div className="flex flex-col items-center">
            <label className="relative cursor-pointer group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="프로필" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-4xl">👤</div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-white text-sm">변경</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {uploading && <p className="text-xs text-gray-400 mt-2">업로드 중...</p>}
          </div>

          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="이름"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="010-1234-5678"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="경영지원팀"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직책</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="대리"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태 메시지</label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="예: 1/15-18 휴가중"
              />
            </div>
          </div>

          {/* 비밀번호 변경 */}
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              {showPasswordChange ? '비밀번호 변경 취소' : '비밀번호 변경'}
            </button>
            
            {showPasswordChange && (
              <div className="mt-4 space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="새 비밀번호"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="새 비밀번호 확인"
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
                <button
                  onClick={handlePasswordChange}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                >
                  비밀번호 변경
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
