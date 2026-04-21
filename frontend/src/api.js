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
  get: (cid) => api.get(`/customers/${cid}/inventory`),
  save: (cid, data) => api.put(`/customers/${cid}/inventory`, data),
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
}

export const exportApi = {
  excel: (cid, name) => {
    const a = document.createElement('a')
    a.href = `/api/customers/${cid}/export/excel`
    a.download = `SVT_Survey_${name || cid}.xlsx`
    a.click()
  }
}
