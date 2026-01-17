-- =====================================================
-- 사내 인트라넷 앱 - Supabase 데이터베이스 스키마
-- =====================================================
-- 이 SQL을 Supabase 대시보드 > SQL Editor에서 실행하세요

-- 1. 프로필 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_group BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 게시판 테이블
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT '공지',
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 일정 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  attendees TEXT[] DEFAULT ARRAY['전원'],
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Row Level Security (RLS) 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 프로필: 모든 인증된 사용자가 읽기 가능, 본인만 수정 가능
CREATE POLICY "프로필 읽기" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "프로필 수정" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "프로필 생성" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 채팅방: 모든 인증된 사용자가 읽기/생성 가능
CREATE POLICY "채팅방 읽기" ON chat_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "채팅방 생성" ON chat_rooms FOR INSERT TO authenticated WITH CHECK (true);

-- 메시지: 모든 인증된 사용자가 읽기/생성 가능
CREATE POLICY "메시지 읽기" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "메시지 생성" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- 게시판: 모든 인증된 사용자가 읽기/생성 가능, 작성자만 삭제 가능
CREATE POLICY "게시글 읽기" ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "게시글 생성" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "게시글 삭제" ON posts FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "게시글 수정" ON posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- 일정: 모든 인증된 사용자가 읽기/생성 가능, 생성자만 삭제 가능
CREATE POLICY "일정 읽기" ON schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "일정 생성" ON schedules FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "일정 삭제" ON schedules FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- =====================================================
-- 실시간 구독 활성화
-- =====================================================

-- 메시지 테이블 실시간 활성화 (Supabase 대시보드에서도 설정 가능)
-- Database > Replication > supabase_realtime 에서 messages 테이블 활성화

-- =====================================================
-- 트리거: 회원가입 시 자동으로 프로필 생성
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있다면 삭제 후 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 기본 데이터 삽입 (선택사항)
-- =====================================================

-- 기본 팀 채팅방 생성
INSERT INTO chat_rooms (name, is_group) VALUES ('팀 채팅방', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 완료!
-- =====================================================
-- 이 스크립트 실행 후:
-- 1. Supabase > Database > Replication 에서 messages 테이블 실시간 활성화
-- 2. Supabase > Authentication > Providers 에서 Email 활성화 확인
