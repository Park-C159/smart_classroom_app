import request from './request'

export default {
  generate(data) {
    return request.post('/exam/generate', data).then(r => r.data)
  },
  getMyExams(page = 1, pageSize = 20) {
    return request.get('/exam/my-exams', { params: { page, page_size: pageSize } }).then(r => r.data)
  },
  listExams(params = {}) {
    return request.get('/exam/', { params }).then(r => r.data)
  },
  getExam(id) {
    return request.get(`/exam/${id}`).then(r => r.data)
  },
  submitExam(id, answers) {
    return request.post(`/exam/${id}/submit`, { answers }).then(r => r.data)
  },
  deleteExam(id) {
    return request.delete(`/exam/${id}`).then(r => r.data)
  },
}
