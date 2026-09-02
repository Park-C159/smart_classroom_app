<template>
  <div class="qb-admin-page">
    <div class="qb-header">
      <h2><el-icon><Collection /></el-icon> 题库管理 <span v-if="subjectName">— {{ subjectName }}</span></h2>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="loadData"><el-icon><Refresh /></el-icon> 刷新</el-button>
        <el-button type="success" size="small" @click="openCreate"><el-icon><Plus /></el-icon> 新增题目</el-button>
        <el-button type="warning" size="small" @click="rebuildIndex" :loading="rebuilding">
          <el-icon><Cpu /></el-icon> 重建题库索引
        </el-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="qb-filters">
      <el-select v-model="filterChapter" placeholder="按章筛选" clearable size="small" style="width:200px" @change="loadData">
        <el-option v-for="ch in chapters" :key="ch" :label="ch" :value="ch" />
      </el-select>
      <el-select v-model="filterDoc" placeholder="来源文档" clearable size="small" style="width:180px" @change="loadData">
        <el-option v-for="d in docList" :key="d.id" :label="d.title" :value="d.id" />
      </el-select>
      <el-select v-model="filterType" placeholder="题目类型" clearable size="small" style="width:110px" @change="loadData">
        <el-option label="教材例题" value="example" />
        <el-option label="参考习题" value="reference" />
      </el-select>
      <el-input v-model="searchText" placeholder="搜索题目..." size="small" style="width:200px" clearable @input="doSearch" />
      <span class="stats-text">{{ filteredItems.length }} / {{ questions.length }} 题</span>
    </div>

    <!-- Scrollable question list -->
    <div class="qb-scroll" v-loading="loading">
      <div v-if="loading" class="empty-state"><el-icon :size="40" class="is-loading"><Loading /></el-icon><p>加载中...</p></div>
      <div v-else-if="filteredItems.length === 0" class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><Collection /></el-icon>
        <p>暂无题目</p>
      </div>

      <div v-else class="qb-list">
        <div v-for="q in pagedItems" :key="q.id" class="qb-item" :class="{ expanded: expandedId === q.id }">
          <div class="qb-row" @click="toggleExpand(q.id)">
            <span class="expand-icon">{{ expandedId === q.id ? '▼' : '▶' }}</span>
            <el-tag size="small" :type="typeTag(q.question_type)">{{ typeLabel(q.question_type) }}</el-tag>
            <span class="qb-page" v-if="q.page_number">P{{ q.page_number }}</span>
            <span class="qb-chapter">{{ q.chapter?.replace('第','').replace('章','') || '' }}</span>
            <span class="qb-preview" v-html="renderMath((q.question_text || '').substring(0, 120))"></span>
          </div>
          <div v-if="expandedId === q.id" class="qb-detail">
            <div class="qb-section">
              <div class="qb-label">📝 内容</div>
              <div class="qb-content" v-html="renderMath(q.question_text || '')"></div>
            </div>
            <div class="qb-meta">
              <span>章: {{ q.chapter }}</span>
              <span v-if="q.page_number">页码: {{ q.page_number }}</span>
            </div>
            <div class="qb-actions">
              <el-button size="small" type="primary" @click="openEdit(q)">编辑</el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="filteredItems.length > pageSize">
        <el-pagination small layout="prev, pager, next" :total="filteredItems.length" :page-size="pageSize" v-model:current-page="currentPage" />
      </div>
    </div>

    <!-- Edit dialog -->
    <el-dialog v-model="editVisible" title="编辑题目" width="800px">
      <el-form :model="editForm" label-width="80px" size="small">
        <el-form-item label="类型">
          <el-select v-model="editForm.question_type">
            <el-option label="教材例题" value="example" />
            <el-option label="参考习题" value="reference" />
          </el-select>
        </el-form-item>
        <el-form-item label="章节">
          <el-input v-model="editForm.chapter" />
        </el-form-item>
        <el-form-item label="页码">
          <el-input-number v-model="editForm.page_number" :min="0" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="editForm.question_text" type="textarea" :rows="15" />
          <div class="preview-box" v-html="renderMath(editForm.question_text)"></div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- Create dialog -->
    <el-dialog v-model="createVisible" title="新增题目" width="800px">
      <el-form :model="createForm" label-width="80px" size="small">
        <el-form-item label="类型">
          <el-select v-model="createForm.question_type">
            <el-option label="教材例题" value="example" />
            <el-option label="参考习题" value="reference" />
          </el-select>
        </el-form-item>
        <el-form-item label="章节">
          <el-select v-model="createForm.chapter" placeholder="选择章节" filterable style="width:100%">
            <el-option v-for="ch in chapters" :key="ch" :label="ch" :value="ch" />
          </el-select>
        </el-form-item>
        <el-form-item label="页码">
          <el-input-number v-model="createForm.page_number" :min="0" />
        </el-form-item>
        <el-form-item label="题目">
          <el-input v-model="createForm.question_text" type="textarea" :rows="12" placeholder="支持 $LaTeX$ 公式" />
          <div class="preview-box" v-html="renderMath(createForm.question_text)"></div>
        </el-form-item>
        <el-form-item label="答案">
          <el-input v-model="createForm.answer_text" type="textarea" :rows="6" placeholder="可选，支持 $LaTeX$ 公式" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCreate" :loading="saving">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Collection, Refresh, Cpu, Plus } from '@element-plus/icons-vue'
import request from '@/api/request'
import { renderMath } from '@/utils/math'

const route = useRoute()
const subjectId = computed(() => parseInt(route.query.subject_id) || 1)
const subjectName = ref('')

const loading = ref(false)
const rebuilding = ref(false)
const questions = ref([])
const chapters = ref([])
const docList = ref([])
const filterChapter = ref('')
const filterDoc = ref('')
const filterType = ref('')
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(500)
const expandedId = ref(null)
const editVisible = ref(false)
const saving = ref(false)
const editForm = ref({ id: null, question_text: '', question_type: 'reference', chapter: '', page_number: 0 })
const createVisible = ref(false)
const createForm = ref({ question_text: '', answer_text: '', question_type: 'reference', chapter: '', page_number: 0 })

const filteredItems = computed(() => {
  let result = questions.value
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    result = result.filter(item => (item.question_text || '').toLowerCase().includes(q))
  }
  return result
})

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

function typeTag(t) {
  const map = { example: 'primary', reference: 'warning' }
  return map[t] || ''
}
function typeLabel(t) {
  const map = { example: '例题', reference: '参考' }
  return map[t] || t
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

async function loadData() {
  loading.value = true
  try {
    const params = { subject_id: subjectId.value, page_size: 2000 }
    if (filterChapter.value) params.chapter = filterChapter.value
    if (filterDoc.value) params.source_doc_id = filterDoc.value
    if (filterType.value) params.question_type = filterType.value
    const res = await request.get('/knowledge/question-bank', { params })
    questions.value = res.data || []
    const chNum = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10 }
    chapters.value = [...new Set(questions.value.map(q => q.chapter).filter(Boolean))]
      .sort((a, b) => {
        const na = chNum[a.replace(/^第([一二三四五六七八九十]+)章.*$/, '$1')] || 99
        const nb = chNum[b.replace(/^第([一二三四五六七八九十]+)章.*$/, '$1')] || 99
        return na - nb
      })
    currentPage.value = 1
  } catch (e) {
    ElMessage.error('加载题库失败')
  } finally {
    loading.value = false
  }
}

async function rebuildIndex() {
  try {
    await ElMessageBox.confirm('重建题库向量索引？', '确认', { type: 'warning' })
  } catch { return }
  rebuilding.value = true
  try {
    await request.post('/knowledge/question-bank/rebuild-index?subject_id=' + subjectId.value)
    ElMessage.success('题库索引已重建')
  } catch (e) {
    ElMessage.error('重建失败')
  } finally {
    rebuilding.value = false
  }
}

function doSearch() { currentPage.value = 1 }

async function loadSubjectName() {
  try {
    const res = await request.get('/subjects/')
    const subs = res.data || []
    const s = subs.find(s => s.id === subjectId.value)
    subjectName.value = s?.name || ''
  } catch {}
}

async function loadDocs() {
  try {
    const res = await request.get('/documents/')
    docList.value = (res.data || []).map(d => ({ id: d.id, title: d.filename || d.title || `文档${d.id}` }))
  } catch {}
}

function openEdit(q) {
  editForm.value = {
    id: q.id, question_text: q.question_text || '',
    question_type: q.question_type || 'reference',
    chapter: q.chapter || '',
    page_number: q.page_number || 0,
  }
  editVisible.value = true
}

function openCreate() {
  createForm.value = { question_text: '', answer_text: '', question_type: 'reference', chapter: '', page_number: 0 }
  createVisible.value = true
}

async function saveCreate() {
  if (!createForm.value.question_text.trim()) {
    ElMessage.warning('请输入题目内容')
    return
  }
  saving.value = true
  try {
    await request.post('/knowledge/question-bank', {
      question_text: createForm.value.question_text,
      answer_text: createForm.value.answer_text,
      question_type: createForm.value.question_type,
      chapter: createForm.value.chapter,
      page_number: createForm.value.page_number,
      subject_id: subjectId.value,
    })
    ElMessage.success('已添加，重建索引后即可用于检索')
    createVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('添加失败')
  } finally {
    saving.value = false
  }
}

async function saveEdit() {
  saving.value = true
  try {
    await request.put(`/knowledge/question-bank/${editForm.value.id}`, {
      question_text: editForm.value.question_text,
      question_type: editForm.value.question_type,
      chapter: editForm.value.chapter,
      page_number: editForm.value.page_number,
    })
    ElMessage.success('已更新')
    editVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSubjectName()
  loadDocs()
  loadData()
})
</script>

<style scoped>
.qb-admin-page { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; }
.qb-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.qb-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #1e293b; margin: 0; }
.qb-filters { display: flex; gap: 10px; align-items: center; padding: 12px 24px; background: #fff; border-bottom: 1px solid #eef2f6; flex-shrink: 0; flex-wrap: wrap; }
.stats-text { color: #64748b; font-size: 13px; margin-left: auto; }
.qb-scroll { flex: 1; overflow-y: auto; padding: 16px 24px; }
.empty-state { text-align: center; padding: 60px 0; color: #94a3b8; }

.qb-item { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px; overflow: hidden; background: #fff; }
.qb-item.expanded { border-color: #3b82f6; }
.qb-row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; cursor: pointer; }
.qb-row:hover { background: #f8fafc; }
.expand-icon { font-size: 10px; color: #94a3b8; width: 12px; flex-shrink: 0; }
.qb-page { color: #64748b; font-size: 12px; font-weight: 600; font-family: monospace; }
.qb-chapter { color: #94a3b8; font-size: 11px; margin-left: auto; }
.qb-preview { flex: 1; font-size: 13px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

.qb-detail { padding: 16px; border-top: 1px solid #e2e8f0; background: #fafbfc; }
.qb-section { margin-bottom: 16px; }
.qb-label { font-weight: 600; color: #475569; margin-bottom: 6px; font-size: 14px; }
.qb-content { font-size: 14px; line-height: 1.9; color: #1e293b; white-space: pre-wrap; }
.qb-meta { display: flex; gap: 16px; font-size: 12px; color: #94a3b8; padding-top: 8px; border-top: 1px solid #eef2f6; }

.pagination { display: flex; justify-content: center; padding: 16px 0; }

.qb-actions { display: flex; gap: 8px; padding-top: 8px; }
.preview-box { margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 4px; font-size: 14px; line-height: 1.8; max-height: 300px; overflow-y: auto; }

.header-actions { display: flex; gap: 8px; }
</style>
