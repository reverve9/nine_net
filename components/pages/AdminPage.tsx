'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  name: string
  role: string
  approval_status: string
  created_at: string
  avatar_url?: string
}

interface AdminPageProps {
  user: any
  profile: any
}

export default function AdminPage({ user, profile }: AdminPageProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
    setLoading(false)
  }

  const updateUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
    console.log('updateUserStatus called:', userId, status)
    
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: status })
      .eq('id', userId)
    
    if (error) {
      console.error('Update error:', error)
      alert('상태 변경 실패: ' + error.message)
    } else {
      console.log('Update success')
      fetchUsers()
    }
  }

  const updateUserRole = async (userId: string, role: string) => {
    if (userId === user.id) {
      alert('자신의 권한은 변경할 수 없습니다.')
      return
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    
    if (error) {
      alert('권한 변경 실패: ' + error.message)
    } else {
      fetchUsers()
    }
  }

  const filteredUsers = users.filter(u => {
    if (filter === 'all') return true
    return u.approval_status === filter
  })

  const pendingCount = users.filter(u => u.approval_status === 'pending').length

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return '대표'
      case 'fin_admin': return '회계담당자'
      case 'user': return '일반 직원'
      case 'guest': return '외부 스탭'
      default: return role
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">승인됨</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">대기중</span>
      case 'rejected':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">거절됨</span>
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{status}</span>
    }
  }

  // 권한 체크
  if (profile?.role !== 'super_admin') {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          접근 권한이 없습니다. 대표 관리자만 접근 가능합니다.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">사용자 관리</h1>
        <p className="text-gray-500 mt-1">회원가입 승인 및 권한 관리</p>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체 ({users.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          승인 대기 ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          승인됨
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          거절됨
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">권한</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">👤</div>
                    )}
                    <span className="font-medium text-gray-800">{u.name || '이름 없음'}</span>
                    {u.id === user.id && <span className="text-xs text-blue-500">(나)</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  {u.id === user.id ? (
                    <span className="text-sm text-gray-600">{getRoleName(u.role)}</span>
                  ) : (
                    <select
                      value={u.role || 'user'}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="super_admin">대표</option>
                      <option value="fin_admin">회계담당자</option>
                      <option value="user">일반 직원</option>
                      <option value="guest">외부 스탭</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">{getStatusBadge(u.approval_status)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3">
                  {u.id !== user.id && u.approval_status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateUserStatus(u.id, 'approved')}
                        className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => updateUserStatus(u.id, 'rejected')}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        거절
                      </button>
                    </div>
                  )}
                  {u.id !== user.id && u.approval_status === 'rejected' && (
                    <button
                      onClick={() => updateUserStatus(u.id, 'approved')}
                      className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      승인으로 변경
                    </button>
                  )}
                  {u.id !== user.id && u.approval_status === 'approved' && (
                    <button
                      onClick={() => updateUserStatus(u.id, 'rejected')}
                      className="px-3 py-1 text-xs bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                    >
                      비활성화
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            해당 조건의 사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
