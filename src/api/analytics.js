import request from './request'

export default {
  getMyMastery() {
    return request.get('/analytics/my-mastery').then(r => r.data)
  },
  getMyStats() {
    return request.get('/analytics/my-stats').then(r => r.data)
  },
  getDashboard() {
    return request.get('/analytics/dashboard').then(r => r.data)
  },
  getClassAnalytics(className) {
    return request.get(`/analytics/class/${encodeURIComponent(className)}`).then(r => r.data)
  },
  getKPStats(kpId) {
    return request.get(`/analytics/kp/${encodeURIComponent(kpId)}/stats`).then(r => r.data)
  },
}
