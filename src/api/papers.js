import request from './request'

export default {
  generate(data) {
    return request.post('/papers/generate', data).then(r => r.data)
  },
  list(params = {}) {
    return request.get('/papers/', { params }).then(r => r.data)
  },
  get(id) {
    return request.get(`/papers/${id}`).then(r => r.data)
  },
  publish(id) {
    return request.post(`/papers/${id}/publish`).then(r => r.data)
  },
  start(id) {
    return request.post(`/papers/${id}/start`).then(r => r.data)
  },
  save(submissionId, answers) {
    return request.post(`/papers/submissions/${submissionId}/save`, { answers }).then(r => r.data)
  },
  submit(submissionId, answers) {
    return request.post(`/papers/submissions/${submissionId}/submit`, { answers }).then(r => r.data)
  },
  getSubmission(submissionId) {
    return request.get(`/papers/submissions/${submissionId}`).then(r => r.data)
  },
  listSubmissions(paperId) {
    return request.get(`/papers/${paperId}/submissions`).then(r => r.data)
  },
  regrade(submissionId, answers) {
    return request.post(`/papers/submissions/${submissionId}/regrade`, { answers }).then(r => r.data)
  },
}
