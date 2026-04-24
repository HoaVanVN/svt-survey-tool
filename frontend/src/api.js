import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const customers = {
  list: () => api.get('/customers/'),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
}

export const workload = {
  get: (cid) => api.get(`/customers/${cid}/workload`),
  save: (cid, data) => api.put(`/customers/${cid}/workload`, data),
  sizing: (cid) => api.get(`/customers/${cid}/workload/sizing`),
  refreshSizing: (cid, params = {}) => api.get(`/customers/${cid}/refresh-sizing`, { params }),
}

export const network = {
  get: (cid) => api.get(`/customers/${cid}/network`),
  save: (cid, data) => api.put(`/customers/${cid}/network`, data),
}

export const backup = {
  get: (cid) => api.get(`/customers/${cid}/backup`),
  save: (cid, data) => api.put(`/customers/${cid}/backup`, data),
  sizing: (cid) => api.get(`/customers/${cid}/backup/sizing`),
}

export const inventory = {
  getCategory: (cid, cat) => api.get(`/customers/${cid}/inventory/${cat}`),
  saveCategory: (cid, cat, items) => api.put(`/customers/${cid}/inventory/${cat}`, { items }),
  getApplications: (cid) => api.get(`/customers/${cid}/inventory/applications/list`),
  saveApplications: (cid, applications) => api.put(`/customers/${cid}/inventory/applications/list`, { applications }),
  getAll: (cid) => api.get(`/customers/${cid}/inventory/summary/all`),
}

export const security = {
  get: (cid) => api.get(`/customers/${cid}/security`),
  save: (cid, data) => api.put(`/customers/${cid}/security`, data),
  questions: () => api.get('/security-questions'),
}

export const ocp = {
  get: (cid) => api.get(`/customers/${cid}/ocp`),
  save: (cid, data) => api.put(`/customers/${cid}/ocp`, data),
  sizing: (cid) => api.get(`/customers/${cid}/ocp/sizing`),
  virtSizing: (cid) => api.get(`/customers/${cid}/ocp/virt-sizing`),
  saveVirtWorkloads: (cid, virt_workloads) => api.put(`/customers/${cid}/ocp/virt-workloads`, { virt_workloads }),
}

export const referenceApi = {
  getAll: () => api.get('/reference/all'),
  get: (refType) => api.get(`/reference/${refType}`),
  save: (refType, items) => api.put(`/reference/${refType}`, { items }),
  reset: (refType) => api.delete(`/reference/${refType}`),
}

export const rvtools = {
  get: (cid) => api.get(`/customers/${cid}/rvtools`),
  save: (cid, data) => api.put(`/customers/${cid}/rvtools`, data),
  delete: (cid) => api.delete(`/customers/${cid}/rvtools`),
}

export const diagrams = {
  list: (cid) => api.get(`/customers/${cid}/diagrams`),
  getData: (cid, did) => api.get(`/customers/${cid}/diagrams/${did}/data`),
  upload: (cid, formData) => api.post(`/customers/${cid}/diagrams`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateLabel: (cid, did, label) => api.put(`/customers/${cid}/diagrams/${did}/label`, { label }),
  remove: (cid, did) => api.delete(`/customers/${cid}/diagrams/${did}`),
}

export const exportApi = {
  excel: (cid, name) => {
    const a = document.createElement('a')
    a.href = `/api/customers/${cid}/export/excel`
    a.download = `SVT_Survey_${name || cid}.xlsx`
    a.click()
  },
  inventoryPdf: (cid, name, params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    const qs = new URLSearchParams(clean).toString()
    const a = document.createElement('a')
    a.href = `/api/customers/${cid}/export/inventory-pdf${qs ? '?' + qs : ''}`
    a.download = `SVT_Inventory_${name || cid}.pdf`
    a.click()
  },
  sizingPdf: (cid, name, params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    const qs = new URLSearchParams(clean).toString()
    const a = document.createElement('a')
    a.href = `/api/customers/${cid}/export/sizing-pdf${qs ? '?' + qs : ''}`
    a.download = `SVT_Sizing_${name || cid}.pdf`
    a.click()
  },
}
