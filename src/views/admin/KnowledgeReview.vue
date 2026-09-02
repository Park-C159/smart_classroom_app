<template>
  <div class="knowledge-review">
    <div class="page-header">
      <h2><el-icon><View /></el-icon> 知识点审核</h2>
      <div class="header-actions">
        <span class="badge">管理员</span>
        <el-button type="primary" size="small" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- Stats -->
    <div class="card" v-if="stats">
      <div class="stats-row">
        <span><strong>{{ stats.total }}</strong> 审核项</span>
        <span><strong>{{ stats.withSummary }}</strong> 有摘要</span>
        <span><strong>{{ stats.noSummary }}</strong> 缺摘要</span>
        <span><strong>{{ stats.totalEx }}</strong> 习题</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="filters">
        <el-select v-model="filterChapter" placeholder="按章节" clearable size="small" style="width:150px" @change="loadData">
          <el-option v-for="ch in chapters" :key="ch.id" :label="ch.id+' '+ch.title" :value="ch.id" />
        </el-select>
        <el-select v-model="filterSummary" placeholder="摘要状态" clearable size="small" style="width:120px" @change="loadData">
          <el-option label="有摘要" :value="true" />
          <el-option label="缺摘要" :value="false" />
        </el-select>
        <el-input v-model="searchText" placeholder="搜索知识点..." size="small" style="width:200px" clearable @input="doSearch" />
      </div>
    </div>

    <!-- KP list -->
    <div class="card">
      <div class="card-title">
        <i class="fas fa-list"></i> 知识点列表（{{ filteredItems.length }} 项）
      </div>

      <div v-if="filteredItems.length === 0" class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><Folder /></el-icon>
        <p>暂无数据</p>
      </div>

      <div v-else class="kp-list">
        <div v-for="item in pagedItems" :key="item.id" class="kp-item" :class="{ expanded: expanded.has(item.id) }">
          <!-- Header row -->
          <div class="kp-row" @click="toggleExpand(item.id)">
            <span class="kp-expand-icon">{{ expanded.has(item.id) ? '▼' : '▶' }}</span>
            <span class="kp-id">{{ item.id }}</span>
            <span class="kp-summary" v-html="renderMath(item.summary || '（无摘要）')"></span>
            <span class="kp-badges">
              <span class="badge-ok" v-if="item.summary">已摘要</span>
              <span class="badge-warn" v-else>缺摘要</span>
              <span class="badge-info">{{ item.chunk_count }}块</span>
              <span class="badge-info" v-if="item.exercise_count > 0">{{ item.exercise_count }}题</span>
            </span>
            <span class="kp-chapter">{{ item.chapter_path }}</span>
          </div>

          <!-- Expanded detail -->
          <div v-if="expanded.has(item.id)" class="kp-detail">
            <div class="detail-tabs">
              <button :class="['tab', { active: detailTab[item.id] === 'chunks' || !detailTab[item.id] }]" @click.stop="detailTab[item.id]='chunks'">📄 内容块 ({{ item.chunk_count }})</button>
              <button :class="['tab', { active: detailTab[item.id] === 'exercises' }]" @click.stop="loadExercises(item); detailTab[item.id]='exercises'">📝 本节习题 ({{ item.exercise_count }})</button>
              <button class="tab redo" @click.stop="resummarize(item.id)" :disabled="summarizingId === item.id">
                🔄 {{ summarizingId === item.id ? '生成中...' : '重生成摘要' }}
              </button>
            </div>

            <!-- Chunks view -->
            <div v-if="(!detailTab[item.id] || detailTab[item.id] === 'chunks') && chunkCache[item.id]" class="chunks-list">
              <div v-for="c in chunkCache[item.id]" :key="c.id" class="chunk-item">
                <div class="chunk-header">
                  <el-tag size="small" :type="chunkTagType(c.chunk_type)">{{ c.chunk_type }}</el-tag>
                  <span v-if="c.page_number" class="chunk-page">P{{ c.page_number }}</span>
                </div>
                <div class="chunk-content" v-html="renderMath(c.content.slice(0,300))"></div>
              </div>
            </div>

            <!-- Exercises view -->
            <div v-if="detailTab[item.id] === 'exercises' && sectionExercises[item.id]" class="chunks-list">
              <div v-if="sectionExercises[item.id].length === 0" class="empty-state" style="padding:16px">
                <p>该节暂无习题</p>
              </div>
              <div v-for="ex in sectionExercises[item.id]" :key="'ex'+ex.id" class="chunk-item ex-item-detail">
                <div class="chunk-header">
                  <el-tag size="small" type="warning">{{ typeLabel(ex.question_type) }}</el-tag>
                  <span>{{ '⭐'.repeat(ex.difficulty) }}</span>
                  <span v-if="ex.source_doc_title" class="chunk-page">{{ ex.source_doc_title }}</span>
                  <span v-if="ex.page_number" class="chunk-page">P{{ ex.page_number }}</span>
                  <span v-if="ex.answer_text" style="color:#22c55e;font-size:12px">✓ 有答案</span>
                  <span v-else style="color:#94a3b8;font-size:12px">— 无答案</span>
                </div>
                <div class="chunk-content" v-html="renderMath(ex.question_text)"></div>
                <div v-if="ex.answer_text" class="chunk-content answer" v-html="renderMath(ex.answer_text)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="filteredItems.length > pageSize"
        style="margin-top:16px;justify-content:center"
        layout="prev,next,total"
        :total="filteredItems.length"
        :page-size="pageSize"
        v-model:current-page="currentPage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import knowledgeAPI from '@/api/knowledge'
import { documentsAPI } from '@/api/documents'
import katex from 'katex'

const stats = ref({ total: 0, withSummary: 0, noSummary: 0, totalEx: 0 })
const chapters = ref([])
const allItems = ref([])
const filterChapter = ref('')
const filterSummary = ref(null)
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

const expanded = ref(new Set())
const detailTab = reactive({})
const chunkCache = reactive({})
const sectionExercises = reactive({})
const summarizingId = ref(null)

const filteredItems = computed(() => {
  let items = allItems.value
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    items = items.filter(i =>
      i.id.toLowerCase().includes(q) ||
      (i.summary || '').toLowerCase().includes(q) ||
      (i.title || '').toLowerCase().includes(q)
    )
  }
  return items
})

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

onMounted(() => loadData())

async function loadData() {
  try {
    const params = {}
    if (filterChapter.value) params.chapter = filterChapter.value.replace('KP-', '')
    if (filterSummary.value !== null) params.has_summary = filterSummary.value
    const r = await knowledgeAPI.getReview(params)
    allItems.value = r.data || []
    stats.value = {
      total: r.total,
      withSummary: allItems.value.filter(i => i.summary).length,
      noSummary: allItems.value.filter(i => !i.summary).length,
      totalEx: allItems.value.reduce((s, i) => s + i.exercise_count, 0),
    }
    // Load chapter list
    const tree = await knowledgeAPI.getTree()
    chapters.value = (tree.data || []).map(ch => ({ id: ch.id, title: ch.title }))
  } catch (e) {
    ElMessage.error('加载失败')
  }
}

function doSearch() {
  currentPage.value = 1
}

function toggleExpand(id) {
  const s = new Set(expanded.value)
  if (s.has(id)) {
    s.delete(id)
  } else {
    s.add(id)
    // Load chunks if not cached
    if (!chunkCache[id]) {
      knowledgeAPI.getChunks(id).then(r => { chunkCache[id] = r.data || [] }).catch(() => {})
    }
  }
  expanded.value = s
}

async function loadExercises(item) {
  if (sectionExercises[item.id]) return
  // Use the section-level exercises already in the review data
  sectionExercises[item.id] = item.section_exercises || []
}

async function resummarize(kpId) {
  summarizingId.value = kpId
  try {
    const r = await knowledgeAPI.summarizeSingle(kpId)
    ElMessage.success(`摘要已更新：${r.summary}`)
    // Update local data
    const item = allItems.value.find(i => i.id === kpId)
    if (item) item.summary = r.summary
    stats.value.withSummary++
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '生成失败')
  } finally {
    summarizingId.value = null
  }
}

// Helpers
function chunkTagType(t) {
  const m = { definition: '', theorem: 'warning', example: 'success', proof: 'info', remark: 'danger' }
  return m[t] || ''
}
function typeLabel(t) {
  const m = { choice: '选择', fill: '填空', calculation: '计算', proof: '证明' }
  return m[t] || t
}
function renderMath(text) {
  if (!text) return ''
  let html = text
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => `$${f.trim()}$`)
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => `$$\n${f.trim()}\n$$`)
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }) } catch { return _ }
  })
  html = html.replace(/\$([^$]+?)\$/g, (_, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }) } catch { return _ }
  })
  return html
}
</script>

<style scoped>
.knowledge-review { padding: 24px; height: 100%; overflow-y: auto; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.stats-row { display: flex; gap: 32px; font-size: 14px; color: #475569; }
.stats-row strong { color: #3b82f6; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.empty-state { text-align: center; padding: 40px 0; color: #94a3b8; }
.empty-state p { margin-top: 12px; font-size: 14px; }

.kp-list { }
.kp-item { border: 1px solid #eef2f6; border-radius: 8px; margin-bottom: 6px; background: #fff; }
.kp-item.expanded { border-color: #3b82f6; }
.kp-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; }
.kp-row:hover { background: #f8fafc; }
.kp-expand-icon { font-size: 10px; color: #94a3b8; width: 14px; flex-shrink: 0; }
.kp-id { font-weight: 600; color: #3b82f6; font-size: 12px; min-width: 75px; flex-shrink: 0; }
.kp-summary { flex: 1; font-size: 13px; color: #0b1e33; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kp-badges { display: flex; gap: 4px; flex-shrink: 0; }
.badge-ok { font-size: 10px; background: #dcfce7; color: #16a34a; padding: 1px 6px; border-radius: 8px; }
.badge-warn { font-size: 10px; background: #fef3c7; color: #d97706; padding: 1px 6px; border-radius: 8px; }
.badge-info { font-size: 10px; background: #dbeafe; color: #3b82f6; padding: 1px 6px; border-radius: 8px; }
.kp-chapter { font-size: 11px; color: #94a3b8; flex-shrink: 0; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.kp-detail { border-top: 1px solid #eef2f6; padding: 12px; }
.detail-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.tab { padding: 4px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; font-size: 12px; color: #64748b; }
.tab:hover { background: #f1f5f9; }
.tab.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.tab.redo { margin-left: auto; color: #f59e0b; border-color: #fcd34d; }
.tab.redo:hover { background: #fffbeb; }

.chunks-list { max-height: 500px; overflow-y: auto; }
.chunk-item { background: #f8fafc; border-radius: 6px; padding: 10px; margin-bottom: 6px; }
.chunk-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.chunk-page { font-size: 11px; color: #94a3b8; }
.chunk-content { font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
.chunk-content.answer { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; color: #64748b; }
</style>
