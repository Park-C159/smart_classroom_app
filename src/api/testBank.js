import request from './request'

export default {
  list(params = {}) {
    return request.get('/test-bank/', { params }).then(r => r.data)
  },
  create(data) {
    return request.post('/test-bank/', data).then(r => r.data)
  },
  update(id, data) {
    return request.put(`/test-bank/${id}`, data).then(r => r.data)
  },
  remove(id) {
    return request.delete(`/test-bank/${id}`).then(r => r.data)
  },
  importExcel(file) {
    const fd = new FormData()
    fd.append('file', file)
    return request.post('/upload/import-exercises', fd).then(r => r.data)
  },
}
