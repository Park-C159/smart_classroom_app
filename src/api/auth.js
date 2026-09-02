import request from './request'

export const authAPI = {
  login(username, password) {
    return request.post('/auth/login', { username, password }).then(r => r.data)
  },
  register(data) {
    return request.post('/auth/register', data).then(r => r.data)
  },
  refresh(refreshToken) {
    return request.post('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data)
  },
  logout() {
    return request.post('/auth/logout')
  },
  getMe() {
    return request.get('/auth/me').then(r => r.data)
  },
}
