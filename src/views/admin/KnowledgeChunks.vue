<template>
  <div class="knowledge-chunks">
    <div class="page-header">
      <h2><el-icon><Document /></el-icon> 知识库管理 <span v-if="subjectName" style="font-size:14px;color:#64748b;font-weight:400">— {{ subjectName }}</span></h2>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="loadChunks"><el-icon><Refresh /></el-icon> 刷新</el-button>
        <el-button type="warning" size="small" @click="rebuildIndex" :loading="rebuilding">
          <el-icon><Cpu /></el-icon> 重建知识库索引
        </el-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="filters">
        <el-select v-model="filterSection" placeholder="按节筛选" clearable filterable size="small" style="width:280px" @change="loadChunks">
          <el-option v-for="sec in sections" :key="sec.id" :label="sec.id + ' ' + sec.title" :value="sec.id" />
        </el-select>
        <el-select v-model="filterType" placeholder="按类型" clearable size="small" style="width:140px" @change="loadChunks">
          <el-option v-for="t in chunkTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-input v-model="searchText" placeholder="搜索内容..." size="small" style="width:200px" clearable @input="doSearch" />
        <span class="stats-text">共 {{ totalChunks }} 块</span>
      </div>
    </div>

    <!-- Chunk list -->
    <div class="card" v-loading="loading">
      <div v-if="loading" class="empty-state">
        <el-icon :size="40" class="is-loading"><Loading /></el-icon>
        <p>加载中...</p>
      </div>
      <div v-else-if="chunks.length === 0" class="empty-state">
        <el-icon :size="40" color="#cbd5e1"><Folder /></el-icon>
        <p>{{ sections.length === 0 ? '正在加载章节...' : '选择节后查看分块内容' }}</p>
      </div>

      <div v-else class="chunk-list">
        <div v-for="c in pagedChunks" :key="c.id" class="chunk-card" :class="{ expanded: expandedId === c.id }">
          <div class="chunk-header" @click="toggleExpand(c.id)">
            <span class="expand-icon">{{ expandedId === c.id ? '▼' : '▶' }}</span>
            <el-tag size="small" :type="chunkTagType(c.chunk_type)">{{ c.chunk_type }}</el-tag>
            <span class="chunk-page" v-if="c.page_number">P{{ c.page_number }}</span>
            <span class="chunk-kp">{{ c.kp_id }}</span>
            <span class="chunk-preview" v-html="renderMath(c.content?.substring(0, 120) || '')"></span>
          </div>
          <div v-if="expandedId === c.id" class="chunk-detail">
            <div class="chunk-full" v-html="renderMath(c.full_content || c.content)"></div>
            <div class="chunk-actions">
              <el-button size="small" type="primary" @click="openEdit(c)">编辑</el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="chunks.length > pageSize">
        <el-pagination small layout="prev, pager, next" :total="chunks.length" :page-size="pageSize" v-model:current-page="currentPage" />
      </div>
    </div>

    <!-- Edit dialog -->
    <el-dialog v-model="editVisible" title="编辑分块" width="700px">
      <el-form :model="editForm" label-width="80px" size="small">
        <el-form-item label="类型">
          <el-select v-model="editForm.chunk_type">
            <el-option v-for="t in chunkTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="页码">
          <el-input-number v-model="editForm.page_number" :min="1" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="editForm.content" type="textarea" :rows="12" />
          <div class="preview-box" v-html="renderMath(editForm.content)"></div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Refresh, Cpu, Folder, Loading } from '@element-plus/icons-vue'
import request from '@/api/request'
import { renderMath } from '@/utils/math'

const route = useRoute()
const subjectId = computed(() => parseInt(route.query.subject_id) || 1)
const subjectName = ref('')

const loading = ref(false)
const rebuilding = ref(false)
const saving = ref(false)
const chunks = ref([])
const sections = ref([])
const filterSection = ref('')
const filterType = ref('')
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(30)
const expandedId = ref(null)
const editVisible = ref(false)
const editForm = ref({ id: null, chunk_type: '', content: '', page_number: 1 })
const totalChunks = ref(0)

const chunkTypes = ['text', 'definition', 'theorem', 'proof', 'remark', 'image_block', 'table']

const filteredChunks = computed(() => {
  let result = chunks.value
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    result = result.filter(c => (c.content || '').toLowerCase().includes(q))
  }
  return result
})

const pagedChunks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredChunks.value.slice(start, start + pageSize.value)
})

function chunkTagType(type) {
  const map = { definition: 'primary', theorem: 'warning', example: 'success', proof: 'info', remark: 'danger', exercise: '', image_block: '', table: 'warning' }
  return map[type] || ''
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

async function loadSections() {
  try {
    const res = await request.get('/knowledge/tree')
    // API returns { data: [...] }
    const chapters = res.data?.data || res.data?.chapters || res.data || []
    const list = []
    for (const ch of chapters) {
      if (!ch.parent_id || ch.level === 0) {
        for (const child of ch.children || []) {
          if (child.level === 1) list.push({ id: child.id, title: child.title })
        }
      }
    }
    sections.value = list.sort((a, b) => {
      const pa = a.id.match(/KP-(\d+)\.(\d+)$/)
      const pb = b.id.match(/KP-(\d+)\.(\d+)$/)
      if (pa && pb) {
        const ca = parseInt(pa[1]), cb = parseInt(pb[1])
        if (ca !== cb) return ca - cb
        return parseInt(pa[2]) - parseInt(pb[2])
      }
      return a.id.localeCompare(b.id)
    }) || list
    if (list.length > 0 && !filterSection.value) {
      filterSection.value = list[0].id
      await loadChunks()
    }
  } catch (e) {
    console.error('Load sections failed:', e)
    ElMessage.error('加载章节失败: ' + e.message)
  }
}

async function loadChunks() {
  loading.value = true
  try {
    const params = { subject_id: subjectId.value }
    if (filterSection.value) params.section_id = filterSection.value
    if (filterType.value) params.chunk_type = filterType.value
    const res = await request.get('/knowledge/chunks', { params })
    chunks.value = res.data || []
    totalChunks.value = chunks.value.length
    currentPage.value = 1
  } catch (e) {
    ElMessage.error('加载分块失败')
  } finally {
    loading.value = false
  }
}

function openEdit(chunk) {
  editForm.value = { id: chunk.id, chunk_type: chunk.chunk_type, content: chunk.full_content || chunk.content, page_number: chunk.page_number }
  editVisible.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    await request.put(`/knowledge/chunks/${editForm.value.id}`, {
      content: editForm.value.content,
      chunk_type: editForm.value.chunk_type,
      page_number: editForm.value.page_number,
    })
    ElMessage.success('分块已更新')
    editVisible.value = false
    loadChunks()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function rebuildIndex() {
  try {
    await ElMessageBox.confirm('重建知识库向量索引？这会清除现有索引并重新构建。', '确认', { type: 'warning' })
  } catch { return }
  rebuilding.value = true
  try {
    await request.post('/knowledge/chunks/rebuild-index?subject_id=' + subjectId.value)
    ElMessage.success('知识库索引已重建')
  } catch (e) {
    ElMessage.error('重建失败')
  } finally {
    rebuilding.value = false
  }
}

function doSearch() {
  currentPage.value = 1
}

async function loadSubjectName() {
  try {
    const res = await request.get('/subjects/')
    const subs = res.data || []
    const s = subs.find(s => s.id === subjectId.value)
    subjectName.value = s?.name || ''
  } catch {}
}

onMounted(() => {
  loadSubjectName()
  loadSections()
})
</script>

<style scoped>
.knowledge-chunks { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; overflow: hidden; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #1e293b; margin: 0; }
.card { background: #fff; padding: 16px 24px; margin: 0; border-bottom: 1px solid #eef2f6; flex-shrink: 0; }
.card:last-of-type { flex: 1; overflow-y: auto; border-bottom: none; }
.filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.stats-text { color: #64748b; font-size: 13px; margin-left: auto; }
.empty-state { text-align: center; padding: 40px; color: #94a3b8; }
.chunk-card { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px; overflow: hidden; }
.chunk-card.expanded { border-color: #3b82f6; }
.chunk-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; background: #f8fafc; }
.chunk-header:hover { background: #f1f5f9; }
.expand-icon { font-size: 10px; color: #94a3b8; width: 14px; }
.chunk-page { color: #64748b; font-size: 12px; font-weight: 600; }
.chunk-kp { color: #94a3b8; font-size: 11px; }
.chunk-preview { flex: 1; font-size: 13px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chunk-detail { padding: 12px; border-top: 1px solid #e2e8f0; }
.chunk-full { font-size: 14px; line-height: 1.8; white-space: pre-wrap; color: #1e293b; margin-bottom: 12px; }
.chunk-actions { display: flex; gap: 8px; }
.pagination { display: flex; justify-content: center; padding-top: 12px; }
.preview-box { margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 4px; font-size: 14px; line-height: 1.8; max-height: 200px; overflow-y: auto; }
:deep(.katex-display) { overflow-x: auto; }
</style>
