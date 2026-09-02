import request from './request'

export const documentsAPI = {
  list(params) {
    return request.get('/documents/', { params }).then(r => r.data)
  },
  get(id) {
    return request.get(`/documents/${id}`).then(r => r.data)
  },
  upload(formData) {
    return request.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  getParsed(id) {
    return request.get(`/documents/${id}/parsed`).then(r => r.data)
  },
  getPage(docId, pageNum) {
    return request.get(`/documents/${docId}/page/${pageNum}`).then(r => r.data)
  },
  getLog(docId) {
    return request.get(`/documents/${docId}/log`).then(r => r.data)
  },
  delete(id) {
    return request.delete(`/documents/${id}`).then(r => r.data)
  },
  reparse(id) {
    return request.post(`/documents/${id}/reparse`).then(r => r.data)
  },
  getDocumentSubjects(id) {
    return request.get(`/documents/${id}/subjects`).then(r => r.data)
  },
  updateDocumentSubjects(id, subjectIds) {
    return request.put(`/documents/${id}/subjects`, { subject_ids: subjectIds }).then(r => r.data)
  },
  getExercises(params) {
    return request.get('/documents/exercises', { params }).then(r => r.data)
  },
  getExercise(id) {
    return request.get(`/documents/exercises/${id}`).then(r => r.data)
  },
  updateExercise(id, data) {
    return request.put(`/documents/exercises/${id}`, data).then(r => r.data)
  },
  getExerciseStats() {
    return request.get('/documents/exercises/stats').then(r => r.data)
  },
}
