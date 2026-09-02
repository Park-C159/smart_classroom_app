import request from './request'

export const usersAPI = {
  list(params) {
    return request.get('/users', { params }).then(r => r.data)
  },
  get(id) {
    return request.get(`/users/${id}`).then(r => r.data)
  },
  update(id, data) {
    return request.put(`/users/${id}`, data).then(r => r.data)
  },
  delete(id) {
    return request.delete(`/users/${id}`).then(r => r.data)
  },
  create(data) {
    return request.post('/users', data).then(r => r.data)
  },
  importExcel(formData) {
    return request.post('/users/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  getClasses() {
    return request.get('/users/classes').then(r => r.data)
  },
  getUserSubjects(id) {
    return request.get(`/users/${id}/subjects`).then(r => r.data)
  },
  updateUserSubjects(id, subjectIds) {
    return request.put(`/users/${id}/subjects`, { subject_ids: subjectIds }).then(r => r.data)
  },
  resetPassword(id) {
    return request.post(`/users/${id}/reset-password`).then(r => r.data)
  },
}
