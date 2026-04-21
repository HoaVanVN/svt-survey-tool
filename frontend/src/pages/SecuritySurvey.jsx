import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { security as api } from '../api'

const QUESTIONS = [
  { id: 1, topic: 'Bảo mật', question: 'Các biện pháp bảo mật hiện tại của bạn là gì?' },
  { id: 2, topic: 'Bảo mật', question: 'Tổ chức có đang tuân theo chiến lược bảo mật nào không?' },
  { id: 3, topic: 'Bảo mật', question: 'Bạn vận hành khối lượng công việc một cách an toàn như thế nào?' },
  { id: 4, topic: 'Bảo mật', question: 'Những workload nào cần được bảo vệ? Tiêu thụ qua phương thức nào (HTTPS, VPN)?' },
  { id: 5, topic: 'Bảo mật', question: 'Có từng gặp sự cố bảo mật hoặc cố gắng xâm nhập trong quá khứ chưa?' },
  { id: 6, topic: 'Firewall', question: 'Có tường lửa lớp 4 hoặc lớp 7 nào được sử dụng tại chỗ không?' },
  { id: 7, topic: 'Firewall', question: 'Ứng dụng đang được bảo vệ như thế nào? (WAF, bot protection – Cloudflare, Akamai, Imperva)' },
  { id: 8, topic: 'Tấn công', question: 'Có chiến lược nào ngăn chặn tấn công DDOS, XSS, SQL injection không?' },
  { id: 9, topic: 'Giám sát', question: 'Bạn phát hiện và điều tra các sự kiện bảo mật như thế nào?' },
  { id: 10, topic: 'Giám sát', question: 'Bạn phát hiện, liên kết và phản hồi vi phạm bảo mật trên môi trường on-premise/cloud?' },
  { id: 11, topic: 'Kiểm thử', question: 'Chi tiết về kiểm thử thâm nhập (Penetration Testing) nếu có?' },
  { id: 12, topic: 'Mã hóa', question: 'Có sử dụng dịch vụ quản lý khóa (KMS) để mã hóa không?' },
  { id: 13, topic: 'Công cụ', question: 'Thông tin về các công cụ bảo mật của bên thứ ba?' },
  { id: 14, topic: 'Tuân thủ', question: 'Có thực hiện kiểm tra bên ngoài để đáp ứng yêu cầu tuân thủ không?' },
  { id: 15, topic: 'Tuân thủ', question: 'Các yêu cầu tuân thủ cần đáp ứng? (HIPAA, GDPR, PCI-DSS, ISO 27001)' },
  { id: 16, topic: 'Định danh', question: 'Quy trình quản lý quyền lợi và cấp quyền truy cập người dùng mới?' },
  { id: 17, topic: 'Định danh', question: 'Người dùng được cung cấp, xác thực và ủy quyền như thế nào?' },
  { id: 18, topic: 'Định danh', question: 'IdP đang sử dụng là gì? (Active Directory, Azure AD, Okta, Ping Identity)' },
  { id: 19, topic: 'Định danh', question: 'Quy trình off-boarding đối với nhân viên cũ là gì?' },
  { id: 20, topic: 'Zero Trust', question: 'Có sáng kiến "zero trust" nào không? Các kết quả ưu tiên cao mong muốn?' },
]

const TOPIC_COLORS = {
  'Bảo mật': 'bg-blue-100 text-blue-700',
  'Firewall': 'bg-orange-100 text-orange-700',
  'Tấn công': 'bg-red-100 text-red-700',
  'Giám sát': 'bg-purple-100 text-purple-700',
  'Kiểm thử': 'bg-yellow-100 text-yellow-700',
  'Mã hóa': 'bg-green-100 text-green-700',
  'Công cụ': 'bg-indigo-100 text-indigo-700',
  'Tuân thủ': 'bg-pink-100 text-pink-700',
  'Định danh': 'bg-teal-100 text-teal-700',
  'Zero Trust': 'bg-gray-100 text-gray-700',
}

export default function SecuritySurvey() {
  const { id } = useParams()
  const [responses, setResponses] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(id).then(r => setResponses(r.data.responses || {})).catch(() => setResponses({}))
  }, [id])

  const set = (qid, v) => setResponses(p => ({ ...p, [qid]: v }))

  const save = async () => {
    setSaving(true)
    try { await api.save(id, { responses }); toast.success('Đã lưu Security Survey') }
    catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const answered = Object.values(responses).filter(v => v && v.trim()).length

  return (
    <div className="space-y-4">
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">{answered}/{QUESTIONS.length}</span> câu đã được trả lời
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(
              QUESTIONS.reduce((acc, q) => { if (!acc[q.topic]) acc[q.topic] = 0; if (responses[q.id]?.trim()) acc[q.topic]++; return acc }, {})
            ).map(([topic, count]) => (
              <span key={topic} className={`badge ${TOPIC_COLORS[topic] || 'bg-gray-100 text-gray-700'}`}>
                {topic}: {count}/{QUESTIONS.filter(q => q.topic === topic).length}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2 h-2 bg-blue-200 rounded-full">
          <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {QUESTIONS.map(q => (
          <div key={q.id} className="card">
            <div className="flex gap-3">
              <span className="text-gray-400 font-mono text-sm w-7 shrink-0 pt-0.5">{q.id}.</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${TOPIC_COLORS[q.topic] || 'bg-gray-100 text-gray-700'}`}>{q.topic}</span>
                  <p className="text-sm font-medium text-gray-800">{q.question}</p>
                </div>
                <textarea
                  rows={3}
                  className="form-input text-sm"
                  placeholder="Nhập phản hồi..."
                  value={responses[q.id] || ''}
                  onChange={e => set(q.id, e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Security Survey'}
        </button>
      </div>
    </div>
  )
}
