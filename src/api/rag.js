import { useAuthStore } from '@/stores/auth'

const BASE = '/api'

/**
 * Stream chat response via SSE.
 * Multiple concurrent streams are supported — each call is independent.
 * Streams survive page navigation (no AbortController tied to component lifecycle).
 */
export function streamChat({ question, docIds = [], files = [], topK = 5, hierarchical = true, history = [], deepThink = false, smartSearch = false }) {
  const auth = useAuthStore()
  const controller = new AbortController()
  // 防止后端流式响应卡死导致发送按钮永久置灰：3 分钟超时自动中止
  const streamTimer = setTimeout(() => controller.abort(), 180000)

  const formData = new FormData()
  if (question) formData.append('question', question)
  formData.append('top_k', String(topK))
  formData.append('hierarchical', String(hierarchical))
  formData.append('deep_think', String(deepThink))
  formData.append('smart_search', String(smartSearch))
  if (history.length > 0) {
    formData.append('history', JSON.stringify(history))
  }
  if (docIds.length > 0) {
    formData.append('selected_doc_ids', JSON.stringify(docIds))
  }
  for (const f of files) {
    formData.append('files', f)
  }

  const promise = fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
    body: formData,
    signal: controller.signal,
  })

  return {
    cancel: () => controller.abort(),
    /** Async generator yielding { type, content?, sources?, error? } */
    async *stream() {
      const response = await promise
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: '请求失败' }))
        clearTimeout(streamTimer)
        yield { type: 'error', content: err.detail || '请求失败' }
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          // Parse SSE-style lines (each JSON object on one line, separated by double newlines)
          const parts = buffer.split('\n\n')
          buffer = parts.pop() // keep incomplete last chunk
          for (const part of parts) {
            const trimmed = part.trim()
            if (!trimmed) continue
            try {
              const data = JSON.parse(trimmed)
              yield data
              if (data.type === 'done' || data.type === 'error') return
            } catch {
              // skip unparseable lines
            }
          }
        }
      } finally {
        clearTimeout(streamTimer)
        reader.releaseLock()
      }
    },
  }
}

/**
 * Transcribe audio file to text.
 */
export async function transcribeAudio(file) {
  const auth = useAuthStore()
  const formData = new FormData()
  formData.append('file', file)
  const resp = await fetch(`${BASE}/chat/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
    body: formData,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '语音识别失败' }))
    throw new Error(err.detail || '语音识别失败')
  }
  const data = await resp.json()
  return data.text
}

/**
 * Recognize an image → text + LaTeX (upload-time parsing).
 */
export async function recognizeImage(file) {
  const auth = useAuthStore()
  const controller = new AbortController()
  // 防止识别卡死导致缩略图一直"识别中"、发送按钮置灰：60s 超时
  const timer = setTimeout(() => controller.abort(), 60000)
  try {
    const formData = new FormData()
    formData.append('file', file)
    const resp = await fetch(`${BASE}/chat/recognize-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: formData,
      signal: controller.signal,
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: '图片识别失败' }))
      throw new Error(err.detail || '图片识别失败')
    }
    const data = await resp.json()
    return data.text
  } finally {
    clearTimeout(timer)
  }
}
