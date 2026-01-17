# 🏢 우리회사 인트라넷

소규모 기업용 사내 커뮤니케이션 플랫폼

## ✨ 기능

- 🔐 회원가입/로그인 (Supabase Auth)
- 💬 실시간 메신저 (Supabase Realtime)
- 📋 게시판 (공지사항, 자유게시판)
- 📅 일정 관리
- ⚙️ 프로필 설정

## 🛠 기술 스택

- **프론트엔드:** Next.js 14, React 18, TypeScript
- **스타일링:** Tailwind CSS
- **백엔드:** Supabase (PostgreSQL, Auth, Realtime)
- **배포:** Vercel

---

## 📦 설치 및 실행

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 가입
2. New Project 생성 (Region: Seoul 추천)
3. **SQL Editor**에서 `supabase-schema.sql` 전체 실행
4. **Settings > API**에서 `Project URL`과 `anon key` 복사

### 2. 실시간 기능 활성화

Supabase 대시보드에서:
1. **Database > Replication** 이동
2. `supabase_realtime` 섹션에서 `messages` 테이블 활성화

### 3. 로컬 개발

```bash
# 저장소 클론 후 폴더 이동
cd company-intranet

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일 열어서 Supabase URL과 Key 입력

# 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 확인

### 4. Vercel 배포

**방법 1: GitHub 연동 (추천)**

1. 이 프로젝트를 GitHub에 푸시
2. [Vercel](https://vercel.com) 로그인
3. "Add New Project" > GitHub 저장소 선택
4. **Environment Variables** 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`: 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key
5. Deploy!

**방법 2: Vercel CLI**

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경변수는 Vercel 대시보드에서 설정
```

---

## 📁 프로젝트 구조

```
company-intranet/
├── app/
│   ├── layout.tsx      # 루트 레이아웃
│   ├── page.tsx        # 메인 페이지
│   └── globals.css     # 전역 스타일
├── components/
│   ├── Dashboard.tsx   # 대시보드 메인
│   ├── LoginPage.tsx   # 로그인 페이지
│   ├── Sidebar.tsx     # 사이드바
│   └── pages/          # 각 페이지 컴포넌트
│       ├── HomePage.tsx
│       ├── MessengerPage.tsx
│       ├── BoardPage.tsx
│       ├── SchedulePage.tsx
│       └── SettingsPage.tsx
├── lib/
│   └── supabase.ts     # Supabase 클라이언트
├── public/
│   └── manifest.json   # PWA 설정
└── supabase-schema.sql # DB 스키마
```

---

## 🔧 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxx
```

---

## 📱 PWA (모바일 앱처럼 사용)

배포 후 모바일에서:
- **iOS:** Safari > 공유 > 홈 화면에 추가
- **Android:** Chrome > 메뉴 > 홈 화면에 추가

---

## 🚀 향후 추가 기능

- [ ] 파일 업로드/공유
- [ ] 푸시 알림
- [ ] 다크모드
- [ ] 1:1 채팅방
- [ ] 캘린더 뷰

---

## 📄 라이선스

MIT
