'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // 승인 상태 확인
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', data.user.id)
        .single()

      if (profile?.approval_status === 'pending') {
        await supabase.auth.signOut()
        setError('가입 승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.')
        setLoading(false)
        return
      }

      if (profile?.approval_status === 'rejected') {
        await supabase.auth.signOut()
        setError('가입이 거절되었습니다. 관리자에게 문의하세요.')
        setLoading(false)
        return
      }
    }

    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // 프로필에 pending 상태 설정
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ approval_status: 'pending' })
        .eq('id', data.user.id)
      
      // 자동 로그인 방지 - 즉시 로그아웃
      await supabase.auth.signOut()
    }

    setMessage('회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.')
    setEmail('')
    setPassword('')
    setName('')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Nine Net</h1>
          <p className="text-gray-500 mt-1">사내 인트라넷</p>
        </div>

        {/* 탭 */}
        <div className="flex mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(''); setMessage('') }}
            className={`flex-1 py-2 text-center font-medium transition ${
              isLogin
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 border-b-2 border-transparent'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); setMessage('') }}
            className={`flex-1 py-2 text-center font-medium transition ${
              !isLogin
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 border-b-2 border-transparent'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 에러/메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
            {message}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={isLogin ? handleLogin : handleSignUp}>
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="홍길동"
                required={!isLogin}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="email@company.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        {/* 추가 정보 */}
        <p className="text-center text-gray-400 text-sm mt-6">
          © 2024 Nine Net. All rights reserved.
        </p>
      </div>
    </div>
  )
}
