import request from './request'

export const subjectsAPI = {
  list() {
    return request.get('/subjects/').then(r => r.data)
  },
  create(name, description = '') {
    return request.post('/subjects/', { name, description }).then(r => r.data)
  },
  delete(id) {
    return request.delete(`/subjects/${id}`).then(r => r.data)
  },
}
