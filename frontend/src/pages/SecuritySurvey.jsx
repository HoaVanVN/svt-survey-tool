import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { security as api, customers as cApi } from '../api'

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
  'Bảo mật':   'bg-blue-100 text-blue-700',
  'Firewall':  'bg-orange-100 text-orange-700',
  'Tấn công':  'bg-red-100 text-red-700',
  'Giám sát':  'bg-purple-100 text-purple-700',
  'Kiểm thử':  'bg-yellow-100 text-yellow-700',
  'Mã hóa':    'bg-green-100 text-green-700',
  'Công cụ':   'bg-indigo-100 text-indigo-700',
  'Tuân thủ':  'bg-pink-100 text-pink-700',
  'Định danh': 'bg-teal-100 text-teal-700',
  'Zero Trust':'bg-gray-100 text-gray-700',
}

// Topic colors for the print output
const TOPIC_PRINT_COLORS = {
  'Bảo mật':   '#dbeafe',
  'Firewall':  '#fed7aa',
  'Tấn công':  '#fee2e2',
  'Giám sát':  '#f3e8ff',
  'Kiểm thử':  '#fef9c3',
  'Mã hóa':    '#dcfce7',
  'Công cụ':   '#e0e7ff',
  'Tuân thủ':  '#fce7f3',
  'Định danh': '#ccfbf1',
  'Zero Trust':'#f3f4f6',
}

export default function SecuritySurvey() {
  const { id } = useParams()
  const [responses, setResponses] = useState({})
  const [customer, setCustomer] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(id).then(r => setResponses(r.data.responses || {})).catch(() => setResponses({}))
    cApi.get(id).then(r => setCustomer(r.data)).catch(() => {})
  }, [id])

  const set = (qid, v) => setResponses(p => ({ ...p, [qid]: v }))

  const save = async () => {
    setSaving(true)
    try { await api.save(id, { responses }); toast.success('Đã lưu Security Survey') }
    catch { toast.error('Lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const exportPrint = () => {
    const customerName = customer?.name || `Customer #${id}`
    const surveyDate = customer?.survey_date || new Date().toLocaleDateString('vi-VN')
    const presales = customer?.presales || ''
    const answeredCount = QUESTIONS.filter(q => responses[q.id]?.trim()).length

    // Group questions by topic for the report
    const topicGroups = QUESTIONS.reduce((acc, q) => {
      if (!acc[q.topic]) acc[q.topic] = []
      acc[q.topic].push(q)
      return acc
    }, {})

    const topicSections = Object.entries(topicGroups).map(([topic, qs]) => {
      const color = TOPIC_PRINT_COLORS[topic] || '#f3f4f6'
      const rows = qs.map(q => {
        const ans = responses[q.id]?.trim() || ''
        return `
          <tr>
            <td style="width:30px;color:#9ca3af;font-size:11px;vertical-align:top;padding:6px 4px">${q.id}.</td>
            <td style="padding:6px 8px 6px 0;vertical-align:top">
              <div style="font-weight:600;color:#1f2937;margin-bottom:4px;font-size:12px">${q.question}</div>
              <div style="padding:6px 8px;background:${ans ? '#f9fafb' : '#fff'};border:1px solid ${ans ? '#d1d5db' : '#e5e7eb'};border-radius:4px;min-height:32px;color:${ans ? '#111827' : '#9ca3af'};font-size:11px;white-space:pre-wrap">${ans || 'Chưa có phản hồi'}</div>
            </td>
          </tr>`
      }).join('')
      return `
        <div style="margin-bottom:20px;page-break-inside:avoid">
          <div style="background:${color};padding:6px 12px;border-radius:4px 4px 0 0;font-weight:700;font-size:13px;color:#374151">
            🔒 ${topic}
          </div>
          <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 4px 4px">
            ${rows}
          </table>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Security Survey – ${customerName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; margin: 0; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; margin-bottom: 20px; }
    .progress-fill { height: 8px; background: #2563eb; border-radius: 4px; }
    @media print {
      body { padding: 12px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  <h1>🔒 Security Survey Report</h1>
  <div class="meta">
    Khách hàng: <strong>${customerName}</strong>
    ${presales ? ` &nbsp;·&nbsp; Presales: <strong>${presales}</strong>` : ''}
    &nbsp;·&nbsp; Ngày: ${surveyDate}
    &nbsp;·&nbsp; Đã trả lời: <strong>${answeredCount}/${QUESTIONS.length}</strong> câu hỏi
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width:${Math.round(answeredCount / QUESTIONS.length * 100)}%"></div>
  </div>
  ${topicSections}
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;text-align:center">
    SVT Survey Tool v2.1.3 — Generated ${new Date().toLocaleString('vi-VN')} — Author: Van Thanh Hoa
  </div>
</body>
</html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { toast.error('Vui lòng cho phép popup để xuất PDF'); return }
    w.document.write(html)
    w.document.close()
    // Brief delay to ensure styles are rendered before print dialog
    setTimeout(() => w.print(), 400)
  }

  const answered = QUESTIONS.filter(q => responses[q.id]?.trim()).length

  return (
    <div className="space-y-4">
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
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

      <div className="flex justify-end gap-3">
        <button
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors text-sm"
          onClick={exportPrint}
          title="Xuất báo cáo Security Survey ra PDF"
        >
          📄 Export PDF
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Security Survey'}
        </button>
      </div>
    </div>
  )
}
