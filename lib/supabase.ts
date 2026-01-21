import { createClient } from '@supabase/supabase-js'

// 환경변수 또는 하드코딩 fallback (Electron 빌드용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjgmuxfmkrklqjzmwarl.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZ211eGZta3JrbHFqem13YXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzIwMTAsImV4cCI6MjA4NDI0ODAxMH0.5itBTNTO7I3vjVZn0OXoLnGt69L7YFEuunhfsqT3llY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 디버깅용 전역 노출
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase
}

// 타입 정의
export type User = {
  id: string
  email: string
  name: string
  role: string
  avatar_url?: string
  status: 'online' | 'away' | 'offline'
  created_at: string
}

export type Message = {
  id: string
  content: string
  sender_id: string
  room_id: string
  created_at: string
  sender?: User
}

export type Post = {
  id: string
  title: string
  content: string
  category: string
  author_id: string
  created_at: string
  author?: User
}

export type Schedule = {
  id: string
  title: string
  description?: string
  date: string
  time: string
  attendees: string[]
  created_by: string
  created_at: string
}

export type ChatRoom = {
  id: string
  name: string
  is_group: boolean
  created_at: string
}
