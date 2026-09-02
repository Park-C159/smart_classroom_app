<template>
  <div class="msg-page">
    <StandaloneHeader title="消息" icon="fas fa-envelope" />
    <main class="msg-body">
      <!-- 左侧：会话列表 + 选择联系人 -->
      <aside class="left-panel">
        <div class="left-toolbar">
          <el-button type="primary" size="small" @click="openContacts">
            <el-icon><Plus /></el-icon> 选择联系人
          </el-button>
        </div>
        <el-input v-model="search" placeholder="搜索会话" clearable size="small" class="search-box">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <div class="conv-list" v-loading="loadingConvs">
          <div v-if="filteredConvs.length === 0" class="conv-empty">
            暂无会话，点击「选择联系人」发起私聊
          </div>
          <div
            v-for="c in filteredConvs"
            :key="c.user.id"
            :class="['conv-item', { active: c.user.id === activeId }]"
            @click="openChat(c.user.id)"
          >
            <div class="avatar">{{ (c.user.real_name || c.user.username || '?').charAt(0) }}</div>
            <div class="conv-main">
              <div class="conv-top">
                <span class="conv-name">{{ c.user.real_name || c.user.username }}</span>
                <el-tag size="small" :type="roleTag(c.user.role)">{{ roleLabel(c.user.role) }}</el-tag>
                <span class="conv-time">{{ formatTime(c.last_time) }}</span>
              </div>
              <div class="conv-preview">{{ c.last_message }}</div>
            </div>
            <el-badge v-if="c.unread > 0" :value="c.unread" :max="99" />
          </div>
        </div>
      </aside>

      <!-- 右侧：聊天窗口 -->
      <section class="right-panel">
        <template v-if="activeId">
          <header class="chat-header">
            <span class="chat-name">{{ other.real_name || other.username || '' }}</span>
            <el-tag v-if="other.role" size="small" :type="roleTag(other.role)">{{ roleLabel(other.role) }}</el-tag>
          </header>
          <div ref="listRef" class="chat-list" v-loading="loadingThread">
            <div v-for="m in messages" :key="m.id" :class="['msg-row', { mine: m.sender_id === myId }]">
              <div class="bubble" v-html="renderMath(m.content)"></div>
              <div class="msg-time">{{ formatMsgTime(m.created_at) }}</div>
            </div>
            <div v-if="messages.length === 0 && !loadingThread" class="chat-empty">开始对话吧</div>
          </div>
          <footer class="chat-input">
            <el-input
              v-model="content"
              type="textarea"
              :rows="2"
              placeholder="输入消息，支持 $LaTeX$..."
              @keydown.enter.exact.prevent="send"
            />
            <el-button type="primary" :loading="sending" @click="send">
              <el-icon><Promotion /></el-icon> 发送
            </el-button>
          </footer>
        </template>
        <div v-else class="chat-placeholder">
          <el-icon :size="48" color="#cbd5e1"><ChatDotRound /></el-icon>
          <p>选择联系人或会话开始私聊</p>
        </div>
      </section>
    </main>

    <!-- 选择联系人弹窗 -->
    <el-dialog v-model="contactsVisible" title="选择联系人" width="560px" :close-on-click-modal="true">
      <el-input v-model="contactSearch" placeholder="搜索姓名 / 用户名 / 学科 / 班级" clearable>
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <div class="contact-list" v-loading="loadingContacts">
        <div v-if="filteredContacts.length === 0" class="contact-empty">暂无可用联系人</div>
        <div v-for="ct in filteredContacts" :key="ct.id" class="contact-item" @click="chooseContact(ct)">
          <div class="avatar">{{ (ct.real_name || ct.username || '?').charAt(0) }}</div>
          <div class="contact-main">
            <div class="contact-top">
              <span class="contact-name">{{ ct.real_name || ct.username }}</span>
              <el-tag size="small" :type="roleTag(ct.role)">{{ roleLabel(ct.role) }}</el-tag>
            </div>
            <div class="contact-sub">
              <span v-if="ct.class_name">{{ ct.class_name }}</span>
              <span v-if="ct.subjects?.length">{{ ct.class_name ? ' · ' : '' }}{{ ct.subjects.join('、') }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import messagesAPI from '@/api/messages'
import { useAuthStore } from '@/stores/auth'
import StandaloneHeader from '@/components/StandaloneHeader.vue'
import { renderMath } from '@/utils/math'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const myId = authStore.user?.id

// ── 会话列表 ──
const conversations = ref([])
const loadingConvs = ref(false)
const search = ref('')

// ── 聊天 ──
const activeId = computed(() => (route.params.userId ? Number(route.params.userId) : null))
const other = ref({})
const messages = ref([])
const content = ref('')
const sending = ref(false)
const loadingThread = ref(false)
const listRef = ref(null)

// ── 联系人弹窗 ──
const contactsVisible = ref(false)
const contacts = ref([])
const loadingContacts = ref(false)
const contactSearch = ref('')

const filteredConvs = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return conversations.value
  return conversations.value.filter(c =>
    (c.user.real_name || c.user.username || '').toLowerCase().includes(kw)
  )
})

const filteredContacts = computed(() => {
  const kw = contactSearch.value.trim().toLowerCase()
  if (!kw) return contacts.value
  return contacts.value.filter(ct => {
    const name = (ct.real_name || ct.username || '').toLowerCase()
    const sub = (ct.subjects || []).join('、').toLowerCase()
    const cls = (ct.class_name || '').toLowerCase()
    return name.includes(kw) || sub.includes(kw) || cls.includes(kw)
  })
})

async function loadConversations() {
  loadingConvs.value = true
  try {
    conversations.value = await messagesAPI.listConversations()
  } catch { /* 静默失败 */ } finally {
    loadingConvs.value = false
  }
}

async function loadThread() {
  const id = activeId.value
  if (!id) return
  loadingThread.value = true
  try {
    const r = await messagesAPI.getWithUser(id)
    other.value = r.other || {}
    messages.value = r.data || []
    await nextTick()
    scrollToBottom()
    loadConversations() // 刷新未读红点
  } catch (e) {
    ElMessage.error('加载消息失败')
  } finally {
    loadingThread.value = false
  }
}

async function send() {
  const text = content.value.trim()
  const id = activeId.value
  if (!text || !id) return
  sending.value = true
  try {
    await messagesAPI.send(id, text)
    content.value = ''
    await loadThread()
  } catch (e) {
    ElMessage.error('发送失败: ' + (e.response?.data?.detail || e.message))
  } finally {
    sending.value = false
  }
}

async function openContacts() {
  loadingContacts.value = true
  contactsVisible.value = true
  contactSearch.value = ''
  try {
    contacts.value = await messagesAPI.getContacts()
  } catch (e) {
    ElMessage.error('加载联系人失败')
  } finally {
    loadingContacts.value = false
  }
}

function openChat(id) {
  if (id !== activeId.value) router.push(`/messages/${id}`)
}

function chooseContact(ct) {
  contactsVisible.value = false
  router.push(`/messages/${ct.id}`)
}

function scrollToBottom() {
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
}

function roleLabel(r) { return { teacher: '教师', admin: '管理员', student: '学生' }[r] || '学生' }
function roleTag(r) { return { teacher: 'warning', admin: 'danger', student: 'info' }[r] || 'info' }

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return d.toLocaleDateString('zh-CN')
}

function formatMsgTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (now - d < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('zh-CN')
}

let convTimer = null
let threadTimer = null

watch(activeId, (id) => {
  messages.value = []
  other.value = {}
  if (id) loadThread()
})

onMounted(() => {
  loadConversations()
  if (activeId.value) loadThread()
  convTimer = setInterval(loadConversations, 15000)
  threadTimer = setInterval(() => { if (activeId.value) loadThread() }, 5000)
})

onUnmounted(() => {
  if (convTimer) clearInterval(convTimer)
  if (threadTimer) clearInterval(threadTimer)
})
</script>

<style scoped>
.msg-page { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; overflow: hidden; }
.msg-body { flex: 1; display: flex; min-height: 0; }

/* ── 左侧会话列表 ── */
.left-panel {
  width: 300px; flex-shrink: 0; border-right: 1px solid #e2e8f0;
  display: flex; flex-direction: column; background: #fff; min-height: 0;
}
.left-toolbar { padding: 12px 16px; border-bottom: 1px solid #eef2f6; }
.left-toolbar .el-button { width: 100%; }
.search-box { margin: 10px 16px; width: calc(100% - 32px); }
.conv-list { flex: 1; overflow-y: auto; padding: 0 8px 8px; }
.conv-empty { text-align: center; color: #94a3b8; font-size: 13px; padding: 32px 12px; }
.conv-item {
  display: flex; align-items: center; gap: 10px; padding: 12px;
  border-radius: 10px; cursor: pointer; transition: background 0.15s;
}
.conv-item:hover { background: #f1f5f9; }
.conv-item.active { background: #eef2ff; }
.avatar {
  width: 40px; height: 40px; background: #3b82f6; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 16px; color: #fff; flex-shrink: 0;
}
.conv-main { flex: 1; min-width: 0; }
.conv-top { display: flex; align-items: center; gap: 6px; }
.conv-name { font-weight: 600; color: #0b1e33; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-time { margin-left: auto; font-size: 11px; color: #94a3b8; flex-shrink: 0; }
.conv-preview { font-size: 12px; color: #64748b; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── 右侧聊天 ── */
.right-panel { flex: 1; display: flex; flex-direction: column; background: #fff; min-width: 0; }
.chat-header {
  padding: 14px 20px; border-bottom: 1px solid #eef2f6; display: flex; align-items: center; gap: 8px;
}
.chat-name { font-weight: 600; font-size: 16px; color: #0b1e33; }
.chat-list { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }
.msg-row { display: flex; flex-direction: column; max-width: 70%; }
.msg-row.mine { align-self: flex-end; align-items: flex-end; }
.bubble {
  background: #fff; border: 1px solid #eef2f6; border-radius: 12px; padding: 10px 14px;
  font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; word-break: break-word;
}
.msg-row.mine .bubble { background: #3b82f6; border-color: #3b82f6; color: #fff; }
.msg-time { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.chat-empty { text-align: center; color: #94a3b8; padding: 40px 0; }
.chat-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
.chat-placeholder p { margin-top: 12px; font-size: 14px; }
.chat-input { display: flex; gap: 10px; padding: 12px 16px; border-top: 1px solid #eef2f6; align-items: flex-end; }
.chat-input .el-textarea { flex: 1; }

/* ── 联系人弹窗 ── */
.contact-list { max-height: 420px; overflow-y: auto; margin-top: 12px; }
.contact-empty { text-align: center; color: #94a3b8; font-size: 13px; padding: 32px 0; }
.contact-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
.contact-item:hover { background: #f1f5f9; }
.contact-main { flex: 1; min-width: 0; }
.contact-top { display: flex; align-items: center; gap: 6px; }
.contact-name { font-weight: 600; color: #0b1e33; font-size: 14px; }
.contact-sub { font-size: 12px; color: #94a3b8; margin-top: 3px; }

@media (max-width: 768px) {
  .left-panel { width: 120px; }
  .msg-row { max-width: 90%; }
}
</style>
