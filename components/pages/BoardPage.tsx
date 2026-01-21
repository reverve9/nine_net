'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface BoardPageProps {
  user: any
}

interface Post {
  id: string
  title: string
  content: string
  category: string
  author_id: string
  created_at: string
  author?: {
    name: string
  }
}

export default function BoardPage({ user }: BoardPageProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isWriting, setIsWriting] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '', category: '공지' })
  const [loading, setLoading] = useState(true)

  const categories = ['공지', '자유', '질문', '프로젝트']

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!author_id(name)
      `)
      .order('created_at', { ascending: false })
    
    if (data) setPosts(data)
    setLoading(false)
  }

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return

    const { error } = await supabase.from('posts').insert({
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      author_id: user.id,
    })

    if (!error) {
      setNewPost({ title: '', content: '', category: '공지' })
      setIsWriting(false)
      fetchPosts()
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (!error) {
      setSelectedPost(null)
      fetchPosts()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  // 글 작성 모드
  if (isWriting) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">✏️ 새 글 작성</h1>
            <button
              onClick={() => setIsWriting(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              취소
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카테고리
              </label>
              <select
                value={newPost.category}
                onChange={(e) =>
                  setNewPost({ ...newPost, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목
              </label>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) =>
                  setNewPost({ ...newPost, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="제목을 입력하세요"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <textarea
                value={newPost.content}
                onChange={(e) =>
                  setNewPost({ ...newPost, content: e.target.value })
                }
                rows={10}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                placeholder="내용을 입력하세요"
              />
            </div>

            <button
              onClick={handleCreatePost}
              className="w-full py-3 text-white rounded-lg font-medium hover:opacity-90 transition"
              style={{ backgroundColor: '#5677b0' }}
            >
              게시하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 글 상세 보기
  if (selectedPost) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <button
              onClick={() => setSelectedPost(null)}
              className="text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
            >
              ← 목록으로
            </button>
            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded mb-3">
              {selectedPost.category}
            </span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {selectedPost.title}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {selectedPost.author?.name || '알 수 없음'} ·{' '}
              {formatDate(selectedPost.created_at)}
            </p>
            <div className="prose text-gray-600 whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            {selectedPost.author_id === user.id && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleDeletePost(selectedPost.id)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  삭제하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 글 목록
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📋 게시판</h1>
        <button
          onClick={() => setIsWriting(true)}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
          style={{ backgroundColor: '#5677b0' }}
        >
          <span>+</span> 새 글 작성
        </button>
      </div>

      {posts.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded mr-2">
                    {post.category}
                  </span>
                  <span className="font-medium text-gray-800">{post.title}</span>
                </div>
                <span className="text-sm text-gray-400">
                  {formatDate(post.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 ml-0">
                {post.author?.name || '알 수 없음'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          아직 게시글이 없습니다. 첫 글을 작성해보세요!
        </div>
      )}
    </div>
  )
}
