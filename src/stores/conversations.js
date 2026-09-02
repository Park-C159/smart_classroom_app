import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'math_qa_conversations'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveToStorage(convs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs))
  } catch { /* quota exceeded, ignore */ }
}

export const useConversationsStore = defineStore('conversations', () => {
  const conversations = ref(loadFromStorage())
  const activeId = ref(conversations.value[0]?.id || null)

  // Auto-save on any change
  watch(conversations, (v) => saveToStorage(v), { deep: true })

  const activeConversation = computed(() =>
    conversations.value.find(c => c.id === activeId.value) || null
  )

  function newConversation() {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const conv = {
      id,
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString(),
    }
    conversations.value.unshift(conv)
    activeId.value = id
    return conv
  }

  function selectConversation(id) {
    activeId.value = id
  }

  function deleteConversation(id) {
    const idx = conversations.value.findIndex(c => c.id === id)
    if (idx === -1) return
    conversations.value.splice(idx, 1)
    if (activeId.value === id) {
      activeId.value = conversations.value[0]?.id || null
    }
  }

  function addMessage(convId, msg) {
    const conv = conversations.value.find(c => c.id === convId)
    if (!conv) return
    conv.messages.push(msg)
  }

  async function generateTopic(convId) {
    const conv = conversations.value.find(c => c.id === convId)
    if (!conv || conv.title !== '新对话') return
    if (conv.messages.length < 2) return
    const firstUser = conv.messages.find(m => m.role === 'user')
    const firstAsst = conv.messages.find(m => m.role === 'assistant')
    if (!firstUser || !firstAsst) return
    // 图片/文件上传时问题文本存在 full 字段（content 只存缩略图标识），提取主题要用 full；
    // 并去掉 【图片: xxx.png】 这类标记，避免文件名混进主题
    const firstUserText = (firstUser.full || firstUser.content || '')
      .replace(/【(图片|文件):[^】]*】/g, '')
      .trim()
    try {
      const { useAuthStore } = await import('@/stores/auth')
      const auth = useAuthStore()
      const fd = new FormData()
      fd.append('question', firstUserText)
      fd.append('answer', firstAsst.content.substring(0, 500))
      const resp = await fetch('/api/chat/generate-topic', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: fd,
      })
      const r = await resp.json()
      const topic = r.topic || firstUserText.slice(0, 20)
      conv.title = topic
    } catch {
      conv.title = firstUserText.slice(0, 20)
    }
  }

  function updateLastAssistant(convId, content, thinking) {
    const conv = conversations.value.find(c => c.id === convId)
    if (!conv) return
    const last = conv.messages[conv.messages.length - 1]
    if (last && last.role === 'assistant') {
      last.content = content
      if (thinking !== undefined) last.thinking = thinking
    }
  }

  function setCitations(convId, citations, webSources) {
    const conv = conversations.value.find(c => c.id === convId)
    if (!conv) return
    const last = conv.messages[conv.messages.length - 1]
    if (last && last.role === 'assistant') {
      last.citations = citations
      if (webSources !== undefined) last.webSources = webSources
    }
  }

  // Global streaming state (survives page navigation)
  const streaming = ref(false)
  function setStreaming(v) { streaming.value = v }

  // Ensure at least one conversation exists
  function ensureActive() {
    if (!activeId.value || !conversations.value.find(c => c.id === activeId.value)) {
      if (conversations.value.length > 0) {
        activeId.value = conversations.value[0].id
      } else {
        newConversation()
      }
    }
  }

  // ── 消息多选（用于引用到讨论区） ──
  const selectedMsgIndices = ref(new Set())

  function toggleSelect(index) {
    const s = new Set(selectedMsgIndices.value)
    if (s.has(index)) {
      s.delete(index)
    } else {
      s.add(index)
    }
    selectedMsgIndices.value = s
  }

  function clearSelection() {
    selectedMsgIndices.value = new Set()
  }

  function getSelectedMessages() {
    const conv = activeConversation.value
    if (!conv) return []
    return [...selectedMsgIndices.value]
      .sort((a, b) => a - b)
      .map(i => conv.messages[i])
      .filter(Boolean)
  }

  return {
    conversations, activeId, activeConversation,
    newConversation, selectConversation, deleteConversation,
    addMessage, updateLastAssistant, setCitations, ensureActive, generateTopic,
    streaming, setStreaming,
    selectedMsgIndices, toggleSelect, clearSelection, getSelectedMessages,
  }
})
