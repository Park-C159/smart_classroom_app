import request from './request'

export default {
  getTree() {
    return request.get('/knowledge/tree').then(r => r.data)
  },
  getKP(kpId) {
    return request.get(`/knowledge/kp/${encodeURIComponent(kpId)}`).then(r => r.data)
  },
  createKP(data) {
    return request.post('/knowledge/kp', data).then(r => r.data)
  },
  updateKP(kpId, data) {
    return request.put(`/knowledge/kp/${encodeURIComponent(kpId)}`, data).then(r => r.data)
  },
  deleteKP(kpId) {
    return request.delete(`/knowledge/kp/${encodeURIComponent(kpId)}`).then(r => r.data)
  },
  reorderKPs(orders) {
    return request.put('/knowledge/reorder', orders).then(r => r.data)
  },
  getChunks(kpId) {
    return request.get(`/knowledge/chunks/${encodeURIComponent(kpId)}`).then(r => r.data)
  },
  createChunk(data) {
    return request.post('/knowledge/chunks', data).then(r => r.data)
  },
  updateChunk(id, data) {
    return request.put(`/knowledge/chunks/${id}`, data).then(r => r.data)
  },
  deleteChunk(id) {
    return request.delete(`/knowledge/chunks/${id}`).then(r => r.data)
  },
  buildFromDoc(docId) {
    return request.post(`/knowledge/build-from-doc/${docId}`).then(r => r.data)
  },
  previewDoc(docId) {
    return request.get(`/knowledge/preview/${docId}`).then(r => r.data)
  },
  getStats() {
    return request.get('/knowledge/stats').then(r => r.data)
  },
  getReview(params) {
    return request.get('/knowledge/review', { params }).then(r => r.data)
  },
  summarizeSingle(kpId) {
    return request.post(`/knowledge/summarize/${encodeURIComponent(kpId)}`).then(r => r.data)
  },
}
