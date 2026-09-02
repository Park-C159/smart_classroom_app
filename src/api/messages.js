import request from './request'

export default {
  getContacts() {
    return request.get('/messages/contacts').then(r => r.data)
  },
  listConversations() {
    return request.get('/messages/conversations').then(r => r.data)
  },
  getWithUser(userId, page = 1, pageSize = 50) {
    return request.get(`/messages/with/${userId}`, { params: { page, page_size: pageSize } }).then(r => r.data)
  },
  send(recipientId, content) {
    return request.post('/messages/', { recipient_id: recipientId, content }).then(r => r.data)
  },
  unreadCount() {
    return request.get('/messages/unread-count').then(r => r.data)
  },
}
