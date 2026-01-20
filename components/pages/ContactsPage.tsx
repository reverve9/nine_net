'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Company {
  id: string
  name: string
  business_number: string | null
  ceo_name: string | null
  phone: string | null
  fax: string | null
  email: string | null
  address: string | null
  logo_url: string | null
  is_our_company: boolean
  memo: string | null
  created_at: string
}

interface Contact {
  id: string
  company_id: string
  name: string
  phone: string | null
  email: string | null
  position: string | null
  memo: string | null
  created_at: string
}

interface ContactsPageProps {
  user: any
  profile: any
}

export default function ContactsPage({ user, profile }: ContactsPageProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 폼 상태
  const [companyForm, setCompanyForm] = useState({
    name: '',
    business_number: '',
    ceo_name: '',
    phone: '',
    fax: '',
    email: '',
    address: '',
    memo: '',
  })

  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    position: '',
    memo: '',
  })

  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      fetchContacts(selectedCompany.id)
    }
  }, [selectedCompany])

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('is_our_company', false)
      .order('name')
    
    if (data) setCompanies(data)
    setLoading(false)
  }

  const fetchContacts = async (companyId: string) => {
    const { data } = await supabase
      .from('company_contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    
    if (data) setContacts(data)
  }

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) return

    if (editingCompany) {
      await supabase
        .from('companies')
        .update(companyForm)
        .eq('id', editingCompany.id)
    } else {
      await supabase
        .from('companies')
        .insert({ ...companyForm, is_our_company: false })
    }

    setShowCompanyModal(false)
    setEditingCompany(null)
    setCompanyForm({ name: '', business_number: '', ceo_name: '', phone: '', fax: '', email: '', address: '', memo: '' })
    fetchCompanies()
  }

  const handleSaveContact = async () => {
    if (!contactForm.name.trim() || !selectedCompany) return

    if (editingContact) {
      await supabase
        .from('company_contacts')
        .update(contactForm)
        .eq('id', editingContact.id)
    } else {
      await supabase
        .from('company_contacts')
        .insert({ ...contactForm, company_id: selectedCompany.id })
    }

    setShowContactModal(false)
    setEditingContact(null)
    setContactForm({ name: '', phone: '', email: '', position: '', memo: '' })
    fetchContacts(selectedCompany.id)
  }

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`"${company.name}" 거래처를 삭제하시겠습니까?`)) return
    
    await supabase.from('companies').delete().eq('id', company.id)
    if (selectedCompany?.id === company.id) {
      setSelectedCompany(null)
      setContacts([])
    }
    fetchCompanies()
  }

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm(`"${contact.name}" 담당자를 삭제하시겠습니까?`)) return
    
    await supabase.from('company_contacts').delete().eq('id', contact.id)
    if (selectedCompany) fetchContacts(selectedCompany.id)
  }

  const openEditCompany = (company: Company) => {
    setEditingCompany(company)
    setCompanyForm({
      name: company.name,
      business_number: company.business_number || '',
      ceo_name: company.ceo_name || '',
      phone: company.phone || '',
      fax: company.fax || '',
      email: company.email || '',
      address: company.address || '',
      memo: company.memo || '',
    })
    setShowCompanyModal(true)
  }

  const openEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setContactForm({
      name: contact.name,
      phone: contact.phone || '',
      email: contact.email || '',
      position: contact.position || '',
      memo: contact.memo || '',
    })
    setShowContactModal(true)
  }

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.ceo_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">연락처</h1>
        <button
          onClick={() => {
            setEditingCompany(null)
            setCompanyForm({ name: '', business_number: '', ceo_name: '', phone: '', fax: '', email: '', address: '', memo: '' })
            setShowCompanyModal(true)
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          + 거래처 추가
        </button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* 거래처 목록 */}
        <div className="w-80 bg-white rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="거래처 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCompanies.length === 0 ? (
              <p className="text-center text-gray-400 py-8">거래처가 없습니다</p>
            ) : (
              filteredCompanies.map(company => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                    selectedCompany?.id === company.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <p className="font-medium text-gray-800">{company.name}</p>
                  {company.ceo_name && (
                    <p className="text-sm text-gray-500">대표: {company.ceo_name}</p>
                  )}
                  {company.phone && (
                    <p className="text-sm text-gray-400">{company.phone}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col">
          {selectedCompany ? (
            <>
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedCompany.name}</h2>
                    {selectedCompany.business_number && (
                      <p className="text-sm text-gray-500">사업자번호: {selectedCompany.business_number}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditCompany(selectedCompany)}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(selectedCompany)}
                      className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {selectedCompany.ceo_name && (
                    <div>
                      <p className="text-xs text-gray-400">대표자</p>
                      <p className="text-gray-700">{selectedCompany.ceo_name}</p>
                    </div>
                  )}
                  {selectedCompany.phone && (
                    <div>
                      <p className="text-xs text-gray-400">전화번호</p>
                      <p className="text-gray-700">{selectedCompany.phone}</p>
                    </div>
                  )}
                  {selectedCompany.fax && (
                    <div>
                      <p className="text-xs text-gray-400">팩스</p>
                      <p className="text-gray-700">{selectedCompany.fax}</p>
                    </div>
                  )}
                  {selectedCompany.email && (
                    <div>
                      <p className="text-xs text-gray-400">이메일</p>
                      <p className="text-gray-700">{selectedCompany.email}</p>
                    </div>
                  )}
                  {selectedCompany.address && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400">주소</p>
                      <p className="text-gray-700">{selectedCompany.address}</p>
                    </div>
                  )}
                  {selectedCompany.memo && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400">메모</p>
                      <p className="text-gray-700">{selectedCompany.memo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 담당자 목록 */}
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">담당자</h3>
                  <button
                    onClick={() => {
                      setEditingContact(null)
                      setContactForm({ name: '', phone: '', email: '', position: '', memo: '' })
                      setShowContactModal(true)
                    }}
                    className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    + 담당자 추가
                  </button>
                </div>
                
                {contacts.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">등록된 담당자가 없습니다</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map(contact => (
                      <div key={contact.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-800">
                              {contact.name}
                              {contact.position && (
                                <span className="ml-2 text-sm text-gray-500">{contact.position}</span>
                              )}
                            </p>
                            {contact.phone && (
                              <p className="text-sm text-gray-600">📞 {contact.phone}</p>
                            )}
                            {contact.email && (
                              <p className="text-sm text-gray-600">✉️ {contact.email}</p>
                            )}
                            {contact.memo && (
                              <p className="text-sm text-gray-400 mt-1">{contact.memo}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditContact(contact)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              거래처를 선택해주세요
            </div>
          )}
        </div>
      </div>

      {/* 거래처 모달 */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingCompany ? '거래처 수정' : '거래처 추가'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">회사명 *</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">사업자등록번호</label>
                  <input
                    type="text"
                    value={companyForm.business_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, business_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">대표자명</label>
                  <input
                    type="text"
                    value={companyForm.ceo_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, ceo_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">전화번호</label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">팩스</label>
                  <input
                    type="text"
                    value={companyForm.fax}
                    onChange={(e) => setCompanyForm({ ...companyForm, fax: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">이메일</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">주소</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">메모</label>
                <textarea
                  value={companyForm.memo}
                  onChange={(e) => setCompanyForm({ ...companyForm, memo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCompanyModal(false)}
                className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSaveCompany}
                disabled={!companyForm.name.trim()}
                className="flex-1 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 담당자 모달 */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingContact ? '담당자 수정' : '담당자 추가'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">이름 *</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">직책</label>
                <input
                  type="text"
                  value={contactForm.position}
                  onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">전화번호</label>
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">이메일</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">메모</label>
                <textarea
                  value={contactForm.memo}
                  onChange={(e) => setContactForm({ ...contactForm, memo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSaveContact}
                disabled={!contactForm.name.trim()}
                className="flex-1 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
