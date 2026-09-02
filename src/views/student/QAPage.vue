<template>
  <div class="qa-page">
    <!-- 消息区域 -->
    <div class="messages-area" ref="messagesRef">
      <div class="messages-center">
        <!-- 欢迎界面 -->
        <div v-if="!convStore.activeConversation || convStore.activeConversation.messages.length === 0" class="welcome-message">
          <div style="text-align:center;padding:60px 20px 30px;">
            <div style="font-size:48px;margin-bottom:16px;">📊</div>
            <h2 style="font-weight:600;color:#0b1e33;margin-bottom:8px;">工科高等代数 · 智能学伴</h2>
            <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">教材知识库驱动，精准检索 + AI 答疑</p>
            <div class="example-tags">
              <span class="example-tag" v-for="q in exampleQuestions" :key="q" @click="sendExample(q)">
                {{ q }}
              </span>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role, { selectable: !streaming }]"
             @mouseenter="hoveredMsg = i" @mouseleave="hoveredMsg = null">
          <div :class="['msg-check', { visible: hoveredMsg === i || convStore.selectedMsgIndices.has(i) }]"
               @click.stop="convStore.toggleSelect(i)">
            <i :class="convStore.selectedMsgIndices.has(i) ? 'fas fa-check-circle' : 'far fa-circle'"></i>
          </div>
          <div v-if="msg.role === 'user' && msg.files?.length" class="msg-files">
            <template v-for="(f, fi) in msg.files" :key="fi">
              <div class="msg-file-item">
                <img v-if="f.type === 'image'" :src="f.url" class="msg-image-thumb" />
                <div v-else class="msg-file-thumb">
                  <i class="fas fa-file"></i>
                  <span class="msg-file-ext">{{ fileExt(f.name) }}</span>
                </div>
                <span class="msg-file-name">{{ f.name }}</span>
              </div>
            </template>
          </div>
          <div class="message-bubble">
            <details v-if="msg.role === 'assistant' && msg.thinking" class="thinking-box">
              <summary class="thinking-toggle"><i class="fas fa-brain"></i> 思考过程</summary>
              <div class="thinking-content md-content" v-html="renderContent(msg.thinking)"></div>
            </details>
            <div class="md-content" v-html="renderContent(msg.content)"></div>
          </div>
          <!-- 引用来源 -->
          <div v-if="msg.role === 'assistant' && (msg.citations?.length || msg.webSources?.length)" class="sources-panel">
            <div style="font-weight:600;margin-bottom:6px;color:#475569;">
              <i class="fas fa-book-open"></i> 参考来源
            </div>
            <!-- 联网搜索来源 -->
            <div v-if="msg.webSources?.length" class="web-sources">
              <div class="source-item web-source-item" v-for="(w, wi) in msg.webSources" :key="'w' + wi">
                <a class="web-source-link" :href="w.url" target="_blank" rel="noopener noreferrer">
                  <i class="fas fa-globe"></i> {{ w.title }}
                </a>
                <div v-if="w.snippet" class="web-source-snippet">{{ w.snippet }}</div>
              </div>
            </div>
            <!-- 教材检索来源 -->
            <div class="source-item" v-for="(c, ci) in msg.citations" :key="ci">
              <div class="source-header">
                <a class="source-page-link" :href="'#pdf-page-' + c.page" @click.prevent="openPdfPage(c.page, c.doc_id || 1)">
                  P{{ c.page || '—' }}
                </a>
                <span v-if="c.chapter" class="source-doc">{{ c.chapter }}<span v-if="c.section"> → {{ c.section }}</span></span>
                <span class="source-type-tag">{{ c.chunk_type }}</span>
                <span class="source-toggle" @click="c._open = !c._open" style="cursor:pointer;margin-left:auto;font-size:11px;color:#94a3b8;user-select:none">{{ c._open ? '收起 ▲' : '展开 ▼' }}</span>
              </div>
              <div v-if="c._open" class="source-full" v-html="renderMath(c.full || c.excerpt || '')"></div>
            </div>
          </div>
        </div>

        <!-- 打字指示器 -->
        <div v-if="streaming" class="message assistant">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 多选引用浮条 -->
    <div :class="['selection-bar', { active: convStore.selectedMsgIndices.size > 0 }]">
      <span class="sel-count">☑ 已选 {{ convStore.selectedMsgIndices.size }} 条</span>
      <button class="sel-btn" @click="openQuoteModal"><i class="fas fa-quote-right"></i> 引用到讨论区</button>
      <button class="sel-btn cancel" @click="convStore.clearSelection()">取消</button>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="white-card">
        <div class="deepseek-input-container">
          <div class="input-row">
            <div class="input-editor-wrap">
              <textarea
                ref="editorRef"
                v-model="question"
                class="input-textarea"
                rows="1"
                placeholder="向答疑助手提问（支持 $LaTeX$ 公式、语音、图片，可粘贴图片/文件）"
                @input="onEditorInput"
                @keyup="onCursorChange"
                @click="onCursorChange"
                @keydown.enter.exact.prevent="send"
                @paste="handlePaste"
              ></textarea>
              <div class="mirror" ref="mirrorRef" aria-hidden="true"></div>
              <div v-if="activeFormula" class="formula-bubble" :style="bubbleStyle" v-html="activeFormulaHtml"></div>
            </div>
          </div>
          <!-- 上传文件预览 -->
          <div v-if="fileItems.length" class="file-preview-strip">
            <div v-for="(item, i) in fileItems" :key="i" class="file-preview-item" :class="{ clickable: item.isImage }" @click="item.isImage && openImageModal(i)">
              <img v-if="item.url" :src="item.url" class="file-preview-img" />
              <div v-else class="file-preview-doc">
                <i class="fas fa-file"></i>
                <span class="file-preview-ext">{{ fileExt(item.file.name) }}</span>
              </div>
              <span class="file-preview-name">{{ item.file.name }}</span>
              <span v-if="item.status === 'recognizing'" class="file-preview-status">识别中…</span>
              <span v-else-if="item.status === 'done'" class="file-preview-status ok">已识别</span>
              <span v-else-if="item.status === 'failed'" class="file-preview-status err">识别失败</span>
              <span class="file-preview-remove" @click.stop="removeFileAt(i)"><i class="fas fa-times"></i></span>
            </div>
          </div>
          <!-- 录音提示 -->
          <div v-if="recording" class="recording-hint">
            <span class="recording-dot"></span> 正在录音，点击麦克风结束
          </div>
          <div class="input-actions">
            <div class="action-left">
              <span :class="['ds-tag', { active: deepThink }]" @click="deepThink = !deepThink">
                <i class="fas fa-brain"></i> 深度思考
              </span>
              <span :class="['ds-tag', { active: smartSearch }]" @click="smartSearch = !smartSearch">
                <i class="fas fa-search"></i> 智能搜索
              </span>
            </div>
            <div class="action-right">
              <button class="action-btn" title="上传文件/图片" @click="$refs.fileInput.click()">
                <i class="fas fa-paperclip"></i>
              </button>
              <input type="file" ref="fileInput" style="display:none" multiple accept="image/*,.pdf,.doc,.docx,.txt,.md" @change="handleFileUpload" />
              <button class="action-btn" title="语音输入" @click="toggleVoice">
                <i :class="recording ? 'fas fa-stop' : 'fas fa-microphone'"></i>
              </button>
              <button v-if="convStore.streaming" class="send-btn stop" title="停止回复" @click="stopStreaming">
                <i class="fas fa-stop"></i>
              </button>
              <button v-else class="send-btn" @click="send" :disabled="recognizingImage || (!question.trim() && !hasNonImageFile && !hasImage)">
                <i class="fas fa-arrow-up"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="disclaimer-wrapper">
          <div class="disclaimer-text">内容由 AI 生成，请仔细甄别 · 服务由后端 LLM 提供</div>
        </div>
      </div>
    </div>

    <!-- 图片解析内容弹窗：点击缩略图查看 / 编辑识别内容 -->
    <div v-if="activeImageItem" class="img-modal-overlay" @click.self="closeImageModal">
      <div class="img-modal">
        <div class="img-modal-header">
          <span class="img-modal-title"><i class="fas fa-image"></i> {{ activeImageItem.file.name }}</span>
          <span v-if="activeImageItem.status === 'recognizing'" class="file-preview-status">识别中…</span>
          <span v-else-if="activeImageItem.status === 'failed'" class="file-preview-status err">识别失败</span>
          <span v-else class="file-preview-status ok">已识别</span>
          <button class="img-modal-close" @click="closeImageModal"><i class="fas fa-times"></i></button>
        </div>
        <div class="img-modal-body">
          <img v-if="activeImageItem.url" :src="activeImageItem.url" class="img-modal-img" alt="" />
          <div class="img-modal-label">识别内容（可编辑，支持 $LaTeX$ 公式）</div>
          <textarea v-model="imageDraft" class="img-modal-edit" placeholder="识别结果为空，可在此手动输入题目内容"></textarea>
          <div class="img-modal-label">渲染预览</div>
          <div class="img-modal-preview md-content" v-html="renderContent(imageDraft || '')"></div>
        </div>
        <div class="img-modal-footer">
          <button class="img-modal-cancel" @click="closeImageModal">取消</button>
          <button class="img-modal-save" @click="saveImageModal">保存</button>
        </div>
      </div>
    </div>

    <!-- 图片裁剪弹窗（手机拍照后裁剪） -->
    <ImageCropper v-if="cropSrc" :src="cropSrc" @close="onCloseCropper" @cropped="onCropped" />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import katex from 'katex'
import { ElMessage } from 'element-plus'
import { streamChat, transcribeAudio, recognizeImage } from '@/api/rag'
import { useConversationsStore } from '@/stores/conversations'
import ImageCropper from '@/components/ImageCropper.vue'

const router = useRouter()

const convStore = useConversationsStore()

// ── 状态 ──
const question = ref('')
const streaming = computed(() => convStore.streaming)
const hoveredMsg = ref(null)
const showQuoteModal = ref(false)
const deepThink = ref(false)
const smartSearch = ref(false)
const recording = ref(false)
const fileItems = ref([]) // [{ file, url, isImage, recognizedText, status }] — url 仅图片有值（用于预览）
const recognizingImage = computed(() => fileItems.value.some(i => i.status === 'recognizing'))
const hasNonImageFile = computed(() => fileItems.value.some(i => !i.isImage))
const hasImage = computed(() => fileItems.value.some(i => i.isImage))
const activeImageIdx = ref(-1)
const imageDraft = ref('')   // 弹窗里编辑的草稿，保存时写回识别内容
const activeImageItem = computed(() => {
  const idx = activeImageIdx.value
  return (idx >= 0 && idx < fileItems.value.length && fileItems.value[idx].isImage) ? fileItems.value[idx] : null
})
const messagesRef = ref(null)
const editorRef = ref(null)
const mirrorRef = ref(null)
const activeFormula = ref(null)   // { start, end, inner, display }
const bubbleStyle = ref({})
const fileInput = ref(null)
let mediaRecorder = null
let audioChunks = []
let currentStream = null
let liveTranscribeSeq = 0   // 实时转写序号，用于忽略过期结果
let recMime = 'audio/webm'  // 当前录音格式（iOS 不支持 webm，会退到 mp4）
let recExt = 'webm'

const messages = computed(() => convStore.activeConversation?.messages || [])
const activeId = computed(() => convStore.activeId)

// ── 公式预览气泡：光标在公式内时，在其上方显示渲染结果 ──
function findFormulaAtCursor(text, cursor) {
  if (!text || cursor == null) return null
  const re = /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g
  let m
  while ((m = re.exec(text)) !== null) {
    const start = m.index
    const end = m.index + m[0].length
    if (cursor >= start && cursor <= end) {
      return { start, end, inner: m[1] !== undefined ? m[1] : m[2], display: m[1] !== undefined }
    }
  }
  return null
}

const activeFormulaHtml = computed(() => {
  const f = activeFormula.value
  if (!f) return ''
  try {
    return katex.renderToString(f.inner.trim(), { displayMode: f.display, throwOnError: false })
  } catch {
    return escapeHtml(f.inner)
  }
})

function updateBubble() {
  const el = editorRef.value
  const mirror = mirrorRef.value
  const f = activeFormula.value
  if (!el || !mirror || !f) { bubbleStyle.value = {}; return }
  const text = question.value
  // 用隐藏 mirror（同字体同宽）测量公式的屏幕位置，气泡定位到公式正上方
  mirror.innerHTML = escapeHtml(text.slice(0, f.start)) +
    '<span class="formula-marker">' + escapeHtml(text.slice(f.start, f.end)) + '</span>' +
    escapeHtml(text.slice(f.end))
  const marker = mirror.querySelector('.formula-marker')
  const wrap = el.parentElement
  if (!marker || !wrap) return
  const mr = marker.getBoundingClientRect()
  const wr = wrap.getBoundingClientRect()
  bubbleStyle.value = {
    left: (mr.left - wr.left + mr.width / 2) + 'px',
    top: (mr.top - wr.top) + 'px',
  }
}

function onCursorChange() {
  const el = editorRef.value
  if (!el) return
  const f = findFormulaAtCursor(question.value, el.selectionStart)
  activeFormula.value = f
  if (f) nextTick(() => updateBubble())
  else bubbleStyle.value = {}
}

function onEditorInput(e) {
  // 自动增高 + 刷新气泡
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  onCursorChange()
}

// 外部改 question（语音/示例/发送清空）时也刷新气泡
watch(question, () => onCursorChange())

const exampleQuestions = [
  '什么是矩阵的秩？如何求秩？',
  '线性方程组有解的充要条件是什么？',
  '如何判断一个二次型是否正定？',
  '特征值和特征向量怎么求？',
]

// ── LaTeX / Markdown rendering ──
function renderMath(text) {
  if (!text) return ''
  let html = text
  // Normalize \( → $, \[ → $$
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => `$${f.trim()}$`)
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => `$$\n${f.trim()}\n$$`)
  // Render display math $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }) } catch { return _ }
  })
  // Render inline math $...$
  html = html.replace(/\$([^$]+?)\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }) } catch { return _ }
  })
  return html
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fileExt(name) {
  const m = (name || '').match(/\.([^.]+)$/)
  return m ? m[1].toUpperCase() : 'FILE'
}

function renderContent(text) {
  if (!text) return ''
  // 归一化 \[...\] / \(...\) 为 $$...$$ / $...$，必须在 markdown 之前，
  // 否则 marked 会把 \[ 的反斜杠吃掉，导致 LaTeX 无法渲染
  text = text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => `$$\n${f.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => `$${f.trim()}$`)
  // Protect LaTeX from markdown parser: replace $...$ and $$...$$ with placeholders
  const latexBlocks = []
  let protected_ = text
    // Protect display math $$...$$
    .replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
      latexBlocks.push({ display: true, formula: f.trim() })
      return `⟨LATEX${latexBlocks.length - 1}⟩`
    })
    // Protect inline math $...$
    .replace(/\$([^$]+?)\$/g, (m, f) => {
      latexBlocks.push({ display: false, formula: f.trim() })
      return `⟨LATEX${latexBlocks.length - 1}⟩`
    })
  // Run markdown on protected text
  let html = marked.parse(protected_)
  html = DOMPurify.sanitize(html)
  // Restore LaTeX placeholders with rendered KaTeX
  html = html.replace(/⟨LATEX(\d+)⟩/g, (_, idx) => {
    const blk = latexBlocks[parseInt(idx)]
    if (!blk) return ''
    try {
      return katex.renderToString(blk.formula, { displayMode: blk.display, throwOnError: false })
    } catch { return blk.formula }
  })
  // Also render any remaining \\(...\\) and \\[...\\]
  return renderMath(html)
}

// ── Safe truncation (don't cut through LaTeX formulas) ──
function truncateSafe(text, maxLen = 120) {
  if (!text || text.length <= maxLen) return text
  let cut = text.slice(0, maxLen)
  // If within an unclosed $$, extend to closing $$
  const openDbl = cut.lastIndexOf('\$\$')
  const closeDbl = cut.indexOf('\$\$', openDbl + 2)
  if (openDbl !== -1 && closeDbl === -1) {
    const end = text.indexOf('\$\$', openDbl + 2)
    if (end !== -1 && end - openDbl < 200) cut = text.slice(0, end + 2)
  }
  // If within unclosed $, extend to closing $
  const openSgl = cut.lastIndexOf('$')
  if (openSgl !== -1 && openSgl > cut.lastIndexOf('\$\$')) {
    const close = text.indexOf('$', openSgl + 1)
    if (close !== -1 && close - openSgl < 100) cut = text.slice(0, close + 1)
  }
  // Prefer breaking at sentence boundary near maxLen
  const lastPeriod = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('\n'))
  if (lastPeriod > maxLen * 0.6) cut = cut.slice(0, lastPeriod + 1)
  return cut + (cut.length < text.length ? '…' : '')
}

// ── Page reference handling ──
function openPdfPage(pageNum, docId = 1) {
  if (!pageNum || pageNum === '—') return
  const pdfUrl = `http://localhost:8001/api/documents/${docId}/pdf?page=${pageNum}`
  window.open(pdfUrl, '_blank')
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

function sendExample(q) {
  question.value = q
  send()
}

async function send() {
  const q = question.value.trim()
  // 图片在上传时已解析为文字（存 item.recognizedText，可在弹窗中编辑）；
  // 这里把识别文本合并进 finalQuestion 发给 LLM，非图片文件作为附件发送。
  const recognizing = fileItems.value.some(i => i.status === 'recognizing')
  const nonImageFiles = fileItems.value.filter(i => !i.isImage).map(i => i.file)
  const images = fileItems.value.filter(i => i.isImage && i.status === 'done' && i.recognizedText)
  const hasInput = q.length > 0 || nonImageFiles.length > 0 || images.length > 0
  if (!hasInput || recognizing || convStore.streaming) return
  if (!convStore.activeId) convStore.newConversation()
  const convId = convStore.activeId

  // 合并：输入框问题 + 各图片识别内容（编辑后）
  let finalQuestion = q
  if (images.length) {
    const imgParts = images.map(i => `【图片: ${i.file.name}】\n${i.recognizedText.trim()}`)
    finalQuestion = [q, ...imgParts].filter(Boolean).join('\n\n')
  }
  console.log('[send] convId:', convId, 'images:', images.length, 'files:', nonImageFiles.length)
  console.log('[send] full question:', finalQuestion)

  // 附件缩略图：图片用原图，其他文件用文件图标；object URL 交由消息持有，暂不 revoke
  const attachments = [
    ...images.map(i => ({ type: 'image', url: i.url, name: i.file.name })),
    ...nonImageFiles.map(f => ({ type: 'file', url: null, name: f.name })),
  ]
  question.value = ''
  clearFileItems(attachments.filter(a => a.url).map(a => a.url))
  // 用户消息显示：问题文本 + 附件缩略图（不再显示文件名标识）
  const display = q
  convStore.addMessage(convId, { role: 'user', content: display, files: attachments, full: finalQuestion })
  convStore.addMessage(convId, { role: 'assistant', content: '', citations: [] })
  convStore.setStreaming(true)
  scrollToBottom()
  console.log('[send] messages after add:', convStore.activeConversation?.messages.length)

  try {
    // Build history from previous messages in this conversation
    const conv = convStore.activeConversation
    // 传最近 10 轮对话给后端 Agent，由 Agent 判断是否需要历史
    const history = conv ? conv.messages.slice(0, -2).filter(m => m.full || m.content).slice(-20).map(m => ({
      role: m.role, content: (m.full || m.content).slice(0, 1500)
    })) : []

    const { stream, cancel } = streamChat({
      question: finalQuestion, files: nonImageFiles, history,
      deepThink: deepThink.value, smartSearch: smartSearch.value,
    })
    currentStream = { cancel }

    let fullContent = ''
    let thinkingContent = ''
    for await (const data of stream()) {
      if (data.type === 'references') {
        // Hierarchical references with chapter/section info
        convStore.setCitations(convId, (data.references || []).map(r => ({
          page: r.page_number || '—',
          excerpt: r.content_preview || '',
          full: r.content_full || r.content_preview || '',
          doc_title: r.chapter || '',
          doc_id: r.doc_id || 1,
          chunk_type: r.chunk_type || '',
          chapter: r.chapter || '',
          section: r.section || '',
          adjacent_prev: r.adjacent_prev || null,
          adjacent_next: r.adjacent_next || null,
        })))
      } else if (data.type === 'sources') {
        convStore.setCitations(
          convId,
          (data.sources || []).map(s => ({
            page: s.page || '—',
            excerpt: s.excerpt || '',
            full: s.content_full || s.excerpt || '',
            doc_title: s.doc_title || '',
            doc_id: s.doc_id || 1,
            kp_id: s.kp_id || '',
            chunk_type: s.chunk_type || '',
            chapter: s.chapter || '',
            section: s.section || '',
          })),
          (data.web_sources || []).map(w => ({
            title: w.title || '',
            url: w.url || '',
            snippet: w.snippet || '',
          })),
        )
      } else if (data.type === 'content') {
        fullContent += data.content
        convStore.updateLastAssistant(convId, fullContent, thinkingContent)
        scrollToBottom()
      } else if (data.type === 'thinking') {
        thinkingContent += data.content
        convStore.updateLastAssistant(convId, fullContent, thinkingContent)
      } else if (data.type === 'done') {
        console.log('[stream] done, content length:', fullContent.length)
        break
      } else if (data.type === 'error') {
        console.log('[stream] error:', data.content)
        if (!fullContent) fullContent = '抱歉，请求失败: ' + data.content
        convStore.updateLastAssistant(convId, fullContent)
        break
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      const errorMsg = '抱歉，服务暂时不可用: ' + (e.message || '网络错误')
      convStore.updateLastAssistant(convId, errorMsg)
    }
  } finally {
    convStore.setStreaming(false)
    currentStream = null
    scrollToBottom()
    // Generate topic after first complete exchange
    const conv = convStore.activeConversation
    if (conv && conv.title === '新对话') {
      convStore.generateTopic(convId).catch(() => {})
    }
  }
}

// ── 停止回复：中止当前流式请求并复位 streaming，避免按钮永久置灰 ──
function stopStreaming() {
  if (currentStream?.cancel) {
    try { currentStream.cancel() } catch {}
  }
  convStore.setStreaming(false)
  currentStream = null
}

// ── 引用到讨论区 ──
function openQuoteModal() {
  const selected = convStore.getSelectedMessages()
  if (!selected.length) return
  // Prepare qa_refs from selected messages (group user+assistant pairs)
  const refs = []
  for (let i = 0; i < selected.length; i++) {
    const msg = selected[i]
    refs.push({
      role: msg.role,
      content: msg.content,
      citations: msg.citations || null,
    })
  }
  showQuoteModal.value = true
  // Navigate to discussion page with refs via query params (limited size)
  const refsJson = JSON.stringify(refs)
  if (refsJson.length < 3000) {
    router.push({ path: '/discussion', query: { qa_refs: refsJson } })
  } else {
    // Too large, store in sessionStorage
    sessionStorage.setItem('pending_qa_refs', refsJson)
    router.push({ path: '/discussion', query: { qa_refs_stored: '1' } })
  }
  convStore.clearSelection()
}

// ── 文件上传（支持图片裁剪/预览）──
const cropSrc = ref('')
let pendingImages = []

// 上传：刚拍摄的照片裁剪，相册/文件直接添加
function handleFileUpload(e) {
  const files = Array.from(e.target.files || [])
  if (fileInput.value) fileInput.value.value = ''
  if (!files.length) return
  for (const f of files) {
    if (f.type.startsWith('image/') && isJustCaptured(f)) {
      pendingImages.push(f)   // 刚拍摄的照片 → 裁剪
    } else {
      addFileItem(f)          // 相册/文件 → 直接添加
    }
  }
  if (!cropSrc.value) cropNextImage()
}

// 判断是否为「刚拍摄」的照片：lastModified 在 2 分钟内（相册里的旧照片不会触发）
function isJustCaptured(file) {
  const lastModified = file.lastModified || 0
  if (!lastModified) return false
  return Date.now() - lastModified < 2 * 60 * 1000
}

function cropNextImage() {
  if (!pendingImages.length) return
  const f = pendingImages.shift()
  cropSrc.value = URL.createObjectURL(f)
}

// 裁剪取消：跳过这张，继续下一张
function onCloseCropper() {
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  cropSrc.value = ''
  cropNextImage()
}

// 裁剪完成：把裁剪后的 JPEG 作为文件加入并识别
function onCropped(blob) {
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  cropSrc.value = ''
  const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
  addFileItem(file)
  cropNextImage()
}

function addFileItem(f) {
  const isImage = f.type.startsWith('image/')
  const item = { file: f, url: isImage ? URL.createObjectURL(f) : null, isImage, recognizedText: '', status: isImage ? 'recognizing' : 'file' }
  fileItems.value.push(item)
  const idx = fileItems.value.length - 1
  // 图片：上传即解析，识别结果存进 item.recognizedText（不合并进输入框），
  // 点击缩略图在弹窗中查看/编辑，发送时再合并给 LLM。
  // 注意：必须通过 fileItems.value[idx]（响应式代理）改状态，否则 Vue 不会
  // 触发重渲染，按钮和缩略图状态会一直停留在"识别中"。
  if (isImage) {
    recognizeImage(f)
      .then(text => {
        const it = fileItems.value[idx]
        it.recognizedText = text
        it.status = 'done'
      })
      .catch(() => {
        const it = fileItems.value[idx]
        if (it) it.status = 'failed'
      })
  }
}

// ── 剪切板粘贴上传（图片/文件，不裁剪，直接添加）──
function handlePaste(e) {
  const files = Array.from(e.clipboardData?.files || [])
  if (!files.length) return  // 纯文本粘贴，走默认行为
  e.preventDefault()
  files.forEach(f => addFileItem(f))
}

function removeFileAt(idx) {
  const item = fileItems.value[idx]
  if (item?.url) URL.revokeObjectURL(item.url)
  fileItems.value.splice(idx, 1)
  if (activeImageIdx.value === idx) activeImageIdx.value = -1
  else if (activeImageIdx.value > idx) activeImageIdx.value -= 1
}

function clearFileItems(preserveUrls = []) {
  const keep = new Set(preserveUrls)
  fileItems.value.forEach(item => {
    if (item.url && !keep.has(item.url)) URL.revokeObjectURL(item.url)
  })
  fileItems.value = []
  activeImageIdx.value = -1
}

function openImageModal(i) {
  if (i < 0 || i >= fileItems.value.length || !fileItems.value[i].isImage) return
  activeImageIdx.value = i
  imageDraft.value = fileItems.value[i].recognizedText || ''
}

function closeImageModal() {
  activeImageIdx.value = -1
}

function saveImageModal() {
  const idx = activeImageIdx.value
  if (idx >= 0 && idx < fileItems.value.length) {
    fileItems.value[idx].recognizedText = imageDraft.value
  }
  closeImageModal()
}

// ── 语音输入 ──
async function toggleVoice() {
  if (recording.value) {
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    recording.value = false
    return
  }

  // Start recording
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      ElMessage.error('当前浏览器不支持录音')
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // 自适应录音格式：iOS/Safari 不支持 webm，退到 mp4
    recMime = ''; recExt = 'webm'
    for (const [m, ext] of [['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/mp4', 'm4a']]) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
        recMime = m; recExt = ext; break
      }
    }
    mediaRecorder = new MediaRecorder(stream, recMime ? { mimeType: recMime } : {})
    audioChunks = []
    const baseText = question.value.trim()   // 录音前输入框里已有的文字
    liveTranscribeSeq = 0
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data)
        // 实时转写：每收到一段就转写当前累积的音频，结果直接写入输入框
        const blob = new Blob([...audioChunks], { type: recMime || 'audio/webm' })
        transcribeLive(blob, baseText)
      }
    }
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      if (audioChunks.length === 0) return
      // 最终转写：补上最后一段，用完整结果替换输入框里的实时结果
      const blob = new Blob(audioChunks, { type: recMime || 'audio/webm' })
      try {
        const text = await transcribeAudio(new File([blob], `recording.${recExt}`))
        if (text) {
          question.value = (baseText ? baseText + ' ' : '') + text
        }
      } catch (e) {
        console.error('语音识别失败:', e)
      }
    }
    mediaRecorder.start(3000)  // 每 3 秒产生一段，用于实时识别
    recording.value = true
  } catch (e) {
    console.error('麦克风不可用:', e)
    recording.value = false
    if (e?.name === 'NotAllowedError') {
      ElMessage.error('麦克风权限被拒绝，请在浏览器设置里允许')
    } else if (e?.name === 'SecurityError' || (e?.message || '').includes('secure')) {
      ElMessage.error('语音需要 HTTPS 或 localhost 环境（请给内网穿透开 HTTPS）')
    } else {
      ElMessage.error('麦克风不可用：' + (e?.message || e))
    }
  }
}

// 实时转写：只采纳最新一次的结果，避免旧结果覆盖新结果；结果直接写入输入框
async function transcribeLive(blob, baseText) {
  const seq = ++liveTranscribeSeq
  try {
    const text = await transcribeAudio(new File([blob], `recording.${recExt}`))
    if (seq === liveTranscribeSeq && text) {
      question.value = (baseText ? baseText + ' ' : '') + text
    }
  } catch (e) {
    // 忽略实时转写错误，停止时还会做最终转写
  }
}

onMounted(() => {
  convStore.ensureActive()
  scrollToBottom()
})

onUnmounted(() => {})

watch(messages, scrollToBottom, { deep: true })
</script>

<style scoped>
.qa-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  position: relative;
}

/* ── 消息区域 ── */
.messages-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 0 200px;
  background: #ffffff;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}
.messages-area::-webkit-scrollbar { width: 8px; }
.messages-area::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
.messages-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.messages-area::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.messages-center { max-width: 900px; margin: 0 auto; padding: 0 20px; }

/* ── 欢迎界面 ── */
.welcome-message { text-align: center; }
.example-tags { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.example-tag {
  padding: 8px 18px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}
.example-tag:hover { background: #eef2ff; border-color: #3b82f6; color: #1e40af; }

/* ── 消息气泡 ── */
.message { margin-bottom: 24px; display: flex; flex-direction: column; }
.message.user { align-items: flex-end; }
.message.assistant { align-items: flex-start; }

.message-bubble {
  max-width: 85%;
  width: fit-content;
  min-width: 60px;
  padding: 12px 18px;
  border-radius: 20px;
  line-height: 1.5;
  font-size: 15px;
  position: relative;
  word-break: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
}
.message.user .message-bubble {
  max-width: 85%;
  background: #3b82f6;
  color: white;
}
.message.assistant .message-bubble {
  max-width: 100%;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #1e293b;
}

/* 气泡内 markdown */
.message-bubble :deep(.katex-display) { margin: 0.6em 0; overflow-x: auto; }
.message-bubble :deep(.katex) { font-size: 1.1em; }
.message-bubble :deep(p) { margin: 0 0 0.15em 0; line-height: 1.5; }
.message-bubble :deep(p:last-child) { margin-bottom: 0; }
.message-bubble :deep(pre) { background: #e2e8f0; padding: 12px; border-radius: 12px; overflow-x: auto; margin: 0.2em 0; }
.message-bubble :deep(code) { font-family: monospace; background: #cbd5e1; padding: 2px 6px; border-radius: 6px; }
.message-bubble :deep(ul), .message-bubble :deep(ol) { margin: 0.5em 0; padding-left: 1.5em; }
.message-bubble :deep(table) { border-collapse: collapse; width: 100%; margin: 0.2em 0; font-size: 14px; display: block; overflow-x: auto; }
.message-bubble :deep(th), .message-bubble :deep(td) { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
.message-bubble :deep(th) { background: #f1f5f9; font-weight: 600; }
.message-bubble :deep(a) { color: #3b82f6; text-decoration: underline; }

.user .message-bubble :deep(code) { background: rgba(255,255,255,0.2); color: white; }
.user .message-bubble :deep(pre) { background: rgba(0,0,0,0.2); color: white; }

/* ── 来源面板 ── */
.sources-panel {
  margin-top: 12px;
  font-size: 12px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 8px 12px;
  border-left: 3px solid #3b82f6;
  color: #334155;
  max-width: 100%;
  width: fit-content;
  box-sizing: border-box;
}
.source-item {
  margin: 8px 0;
}
.source-page-link {
  flex-shrink: 0;
  background: #dbeafe;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 12px;
  color: #1e40af;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}
.source-page-link:hover { background: #bfdbfe; text-decoration: none; }
.source-doc {
  flex-shrink: 0;
  font-size: 11px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}
.source-header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
}
.source-type-tag {
  font-size: 10px; color: #64748b; background: #f1f5f9;
  padding: 1px 5px; border-radius: 3px;
}
.source-header {
  display: flex; align-items: center; gap: 6px; padding: 2px 0;
}
.source-full {
  color: #334155; font-size: 13px; line-height: 1.7;
  white-space: pre-wrap; word-break: break-word;
  padding: 8px 0 4px 0;
  margin: 0;
  border-top: 1px solid #e2e8f0;
  clear: both;
  max-height: none;
  overflow: visible;
}

/* ── 联网搜索来源 ── */
.web-sources {
  margin: 4px 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e2e8f0;
}
.web-source-item { margin: 6px 0; }
.web-source-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  word-break: break-all;
}
.web-source-link:hover { text-decoration: underline; }
.web-source-snippet {
  margin-top: 2px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── 打字指示器 ── */
.typing-indicator { display: flex; gap: 4px; padding: 12px 18px; }
.typing-indicator span {
  width: 8px; height: 8px;
  background: #94a3b8;
  border-radius: 50%;
  animation: blink 1.4s infinite;
}
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 60%, 100% { opacity: 0.4; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

/* ── 输入区域 ── */
.input-area {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width, 280px);
  right: 0;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  transition: left 0.2s ease;
  pointer-events: none;
}
.white-card {
  width: 100%;
  max-width: 900px;
  pointer-events: auto;
}
.deepseek-input-container {
  width: 100%;
  background: #ffffff;
  border-radius: 28px;
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  margin-bottom: 0;
}
.input-editor-wrap {
  position: relative;
  width: 100%;
}
.input-textarea {
  width: 100%;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: #0f172a;
  resize: none;
  outline: none;
  min-height: 60px;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.input-textarea::placeholder {
  color: #94a3b8;
}
.mirror {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  visibility: hidden;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  padding: 0;
  border: none;
  pointer-events: none;
}
.formula-bubble {
  position: absolute;
  z-index: 20;
  transform: translate(-50%, -100%);
  margin-top: -10px;
  background: #1e293b;
  color: #fff;
  padding: 8px 14px;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  pointer-events: none;
  white-space: nowrap;
}
.formula-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1e293b;
}
.formula-bubble :deep(.katex) { font-size: 1.1em; color: #fff; }
.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.action-left { display: flex; gap: 12px; }
.ds-tag {
  background: #f1f5f9;
  padding: 0 12px;
  height: 34px;
  line-height: 34px;
  border-radius: 20px;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
  vertical-align: middle;
  user-select: none;
}
.ds-tag:hover { background: #e2e8f0; }
.ds-tag.active { background: #3b82f6; color: white; }
.action-right { display: flex; gap: 12px; align-items: center; }

.action-btn, .send-btn {
  background: #f1f5f9;
  border: none;
  width: 34px; height: 34px;
  border-radius: 50%;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}
.action-btn:hover { background: #e2e8f0; color: #0f172a; }
.send-btn { background: #3b82f6; color: white; }
.send-btn:hover { background: #2563eb; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.send-btn.stop { background: #ef4444; }
.send-btn.stop:hover { background: #dc2626; }

/* ── 文件预览 ── */
.file-preview-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.file-preview-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px 10px;
}
.file-preview-img { width: 48px; height: 48px; object-fit: cover; border-radius: 8px; }
.file-preview-doc {
  width: 48px; height: 48px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  background: #eef2ff; color: #3b82f6; border-radius: 8px;
}
.file-preview-doc i { font-size: 18px; }
.file-preview-ext { font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
.file-preview-name {
  font-size: 12px; color: #475569;
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.file-preview-status {
  font-size: 11px; color: #94a3b8; white-space: nowrap;
}
.file-preview-status.ok { color: #16a34a; }
.file-preview-status.err { color: #dc2626; }
.file-preview-remove {
  width: 18px; height: 18px; border-radius: 50%;
  background: #e2e8f0; color: #64748b;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 10px; transition: all 0.15s;
}
.file-preview-remove:hover { background: #ef4444; color: white; }

/* ── 录音提示 ── */
.recording-hint {
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px; font-size: 12px; color: #dc2626;
}
.recording-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #ef4444; animation: rec-pulse 1s infinite;
}
@keyframes rec-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.disclaimer-wrapper {
  width: 100%;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  padding: 8px 16px 2px;
}

/* ── 消息多选 checkbox ── */
.message.selectable { position: relative; }
.msg-check {
  position: absolute;
  left: -28px;
  top: 12px;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 10;
  user-select: none;
}
.msg-check.visible { opacity: 1; }
.msg-check:hover { color: #3b82f6; }
.msg-check .fa-check-circle { color: #3b82f6; }

/* ── 多选引用浮条 ── */
.selection-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: #1e293b;
  color: white;
  padding: 10px 20px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 200;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  transition: transform 0.3s ease;
}
.selection-bar.active { transform: translateX(-50%) translateY(0); }
.sel-count { font-size: 13px; color: #cbd5e1; white-space: nowrap; }
.sel-btn {
  background: #3b82f6;
  border: none;
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
  transition: background 0.2s;
}
.sel-btn:hover { background: #2563eb; }
.sel-btn.cancel { background: transparent; color: #94a3b8; }
.sel-btn.cancel:hover { background: rgba(255,255,255,0.1); color: white; }

/* ── 图片识别内容弹窗 ── */
.file-preview-item.clickable { cursor: pointer; }
.file-preview-item.clickable:hover { border-color: #93c5fd; background: #eff6ff; }
.img-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.img-modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.28);
}
.img-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.img-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.img-modal-close {
  margin-left: auto;
  border: none;
  background: #f1f5f9;
  color: #475569;
  width: 30px; height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.img-modal-close:hover { background: #ef4444; color: white; }
.img-modal-body {
  padding: 16px 18px;
  overflow-y: auto;
}
.img-modal-img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 10px;
  background: #f8fafc;
  margin-bottom: 14px;
  border: 1px solid #e2e8f0;
}
.img-modal-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin: 12px 0 6px;
}
.img-modal-label:first-of-type { margin-top: 0; }
.img-modal-edit {
  width: 100%;
  min-height: 140px;
  max-height: 260px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  font-family: 'Inter', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #0f172a;
  resize: vertical;
  outline: none;
  background: #fbfdff;
}
.img-modal-edit:focus { border-color: #3b82f6; background: #fff; }
.img-modal-preview {
  min-height: 48px;
  border: 1px dashed #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  font-size: 14px;
  line-height: 1.7;
  color: #1e293b;
  word-break: break-word;
}
.img-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.img-modal-cancel {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.img-modal-cancel:hover { background: #f1f5f9; }
.img-modal-save {
  border: none;
  background: #3b82f6;
  color: white;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}
.img-modal-save:hover { background: #2563eb; }

/* ── 用户消息内的附件缩略图（与输入框预览一致的圆角卡片）── */
.msg-files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.msg-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px 10px;
}
.msg-image-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  background: #f8fafc;
}
.msg-file-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #eef2ff;
  color: #3b82f6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.msg-file-thumb i { font-size: 18px; color: #3b82f6; }
.msg-file-ext { font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
.msg-file-name {
  font-size: 12px;
  color: #475569;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 深度思考（思考过程折叠块）── */
.thinking-box {
  margin-bottom: 10px;
  border-left: 3px solid #cbd5e1;
  padding-left: 10px;
}
.thinking-toggle {
  cursor: pointer;
  font-size: 12px;
  color: #94a3b8;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.thinking-toggle::-webkit-details-marker { display: none; }
.thinking-toggle .fa-brain { color: #8b5cf6; }
.thinking-content {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  word-break: break-word;
}
.thinking-content :deep(.katex) { font-size: 0.95em; color: #475569; }

/* ── 移动端适配 ── */
@media (max-width: 768px) {
  .messages-center { padding: 0 12px; }
  .messages-area { padding: 12px 0 180px; }
  .input-area { padding: 0 12px; }
  .deepseek-input-container { border-radius: 20px; padding: 10px 12px; }
  .input-actions { gap: 6px; }
  .action-left { gap: 8px; flex-wrap: wrap; }
  .ds-tag { height: 30px; line-height: 30px; padding: 0 10px; font-size: 11px; }
  .action-right { gap: 8px; }
  .message-bubble { max-width: 92%; }
  .welcome-message h2 { font-size: 20px; }
  .formula-bubble { display: none; }
}
</style>
