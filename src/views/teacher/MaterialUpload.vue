<template>
  <div class="material-upload">
    <div class="page-header">
      <h2><el-icon><FolderAdd /></el-icon> 教材解析</h2>
      <span class="badge">教师 / 管理员</span>
    </div>

    <!-- Upload zone -->
    <div class="card">
      <div class="card-title"><i class="fas fa-cloud-upload-alt"></i> 上传教材 PDF</div>
      <div class="upload-zone" :class="{ dragging }"
           @dragover.prevent="dragging = true"
           @dragleave="dragging = false"
           @drop.prevent="handleDrop">
        <el-icon :size="40" color="#cbd5e1"><UploadFilled /></el-icon>
        <p>拖拽或点击上传 PDF 教材文件</p>
        <p class="hint">MinerU 高精度解析 → 规则引擎结构化 → 知识树构建</p>
        <div class="upload-row">
          <input ref="fileInput" type="file" accept=".pdf" style="display:none" @change="handleFileSelect" />
          <el-button type="primary" @click="$refs.fileInput.click()" :loading="uploading">
            <el-icon><Upload /></el-icon> 选择 PDF
          </el-button>
          <el-input v-model="docTitle" placeholder="教材名称（可选）" style="width:200px" />
        </div>
        <div class="subject-row">
          <span class="subject-label">预分配学科：</span>
          <el-select v-model="selectedSubjectIds" multiple placeholder="不指定（可选）" style="width:320px" clearable>
            <el-option v-for="s in subjects" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- Subject management -->
    <div class="card">
      <div class="card-title"><i class="fas fa-book"></i> 学科管理</div>
      <div class="subject-toolbar">
        <el-input v-model="newSubjectName" placeholder="新学科名称" style="width:200px" size="small" />
        <el-input v-model="newSubjectDesc" placeholder="描述（可选）" style="width:240px" size="small" />
        <el-button type="primary" size="small" @click="createSubject" :disabled="!newSubjectName.trim()">
          添加学科
        </el-button>
      </div>
      <div class="subject-list">
        <el-tag v-for="s in subjects" :key="s.id" size="default" class="subject-tag">
          {{ s.name }}
        </el-tag>
        <span v-if="subjects.length === 0" style="color:#94a3b8;font-size:13px;">暂无学科，请先添加</span>
      </div>
    </div>

    <!-- Document list / processing status -->
    <div class="card">
      <div class="card-title"><i class="fas fa-tasks"></i> 解析任务</div>
      <div v-if="docs.length === 0" class="empty-state">
        <el-icon :size="32" color="#cbd5e1"><Clock /></el-icon>
        <p>暂无解析任务，上传 PDF 开始解析</p>
      </div>
      <div v-else class="doc-list">
        <div v-for="doc in docs" :key="doc.id" class="doc-row">
          <div class="doc-main">
            <span class="doc-title">{{ doc.title || doc.filename }}</span>
            <div class="doc-meta">
              <el-tag :type="statusTag(doc.status)" size="small">{{ statusLabel(doc.status) }}</el-tag>
              <span v-if="doc.status === 'processing'">进度 {{ doc.progress || 0 }}%</span>
              <span v-if="doc.total_pages">{{ doc.total_pages }} 页</span>
              <span class="doc-date">{{ formatDate(doc.created_at) }}</span>
              <span v-if="doc.subjects?.length" class="doc-subjects">
                学科：{{ doc.subjects.map(s => s.name).join('、') }}
              </span>
            </div>
          </div>
          <div class="doc-actions">
            <el-button v-if="doc.status === 'completed'" size="small" type="success" @click="buildTree(doc.id)">
              构建知识树
            </el-button>
            <el-button size="small" type="danger" text @click="deleteDoc(doc.id)">删除</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { documentsAPI } from '@/api/documents'
import { subjectsAPI } from '@/api/subjects'
import knowledgeAPI from '@/api/knowledge'

const fileInput = ref(null)
const docTitle = ref('')
const selectedSubjectIds = ref([])
const subjects = ref([])
const newSubjectName = ref('')
const newSubjectDesc = ref('')
const docs = ref([])
const uploading = ref(false)
const dragging = ref(false)

onMounted(() => {
  loadDocs()
  loadSubjects()
})

async function loadDocs() {
  try { docs.value = await documentsAPI.list() || [] } catch {}
}

async function loadSubjects() {
  try { subjects.value = await subjectsAPI.list() || [] } catch {}
}

async function createSubject() {
  const name = newSubjectName.value.trim()
  if (!name) return
  try {
    await subjectsAPI.create(newSubjectName.value.trim(), newSubjectDesc.value.trim())
    ElMessage.success(`学科「${name}」已添加`)
    newSubjectName.value = ''
    newSubjectDesc.value = ''
    await loadSubjects()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '添加失败')
  }
}

async function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) await uploadFile(file)
}

async function handleDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.name.endsWith('.pdf')) await uploadFile(file)
  else ElMessage.warning('仅支持 PDF 文件')
}

async function uploadFile(file) {
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (docTitle.value) formData.append('title', docTitle.value)
    if (selectedSubjectIds.value.length > 0) {
      formData.append('subject_ids', selectedSubjectIds.value.join(','))
    }
    await documentsAPI.upload(formData)
    ElMessage.success('上传成功，后台开始解析...')
    docTitle.value = ''
    selectedSubjectIds.value = []
    await loadDocs()
    setTimeout(loadDocs, 5000)
    setTimeout(loadDocs, 15000)
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '上传失败')
  } finally { uploading.value = false }
}

async function buildTree(docId) {
  try {
    await ElMessageBox.confirm('将从此文档的解析结果构建知识树，这会将章节、知识点、内容块和习题写入数据库。', '确认构建', { type: 'info' })
    const result = await knowledgeAPI.buildFromDoc(docId)
    ElMessage.success(`构建完成！${result.result?.knowledge_points || 0} 个知识点，${result.result?.exercises || 0} 道习题`)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.detail || '构建失败')
  }
}

async function deleteDoc(id) {
  try {
    await ElMessageBox.confirm('确认删除此文档及解析结果？', '警告', { type: 'warning' })
    await documentsAPI.delete(id)
    ElMessage.success('已删除')
    await loadDocs()
  } catch {}
}

function statusTag(s) {
  return s === 'completed' ? 'success' : s === 'processing' ? 'warning' : s === 'failed' ? 'danger' : 'info'
}
function statusLabel(s) {
  return s === 'completed' ? '已完成' : s === 'processing' ? '解析中' : s === 'failed' ? '失败' : '等待中'
}
function formatDate(ts) { return ts ? new Date(ts).toLocaleDateString('zh-CN') : '' }
</script>

<style scoped>
.material-upload { padding: 24px; height: 100%; overflow-y: auto; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }

.upload-zone { text-align: center; padding: 40px 20px; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; transition: border-color 0.2s; }
.upload-zone.dragging { border-color: #3b82f6; background: #eff6ff; }
.upload-zone p { margin-top: 8px; font-size: 14px; }
.hint { font-size: 12px; color: #cbd5e1; }
.upload-row { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 16px; }
.subject-row { display: flex; gap: 8px; align-items: center; justify-content: center; margin-top: 14px; }
.subject-label { font-size: 13px; color: #64748b; white-space: nowrap; }

.subject-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.subject-list { display: flex; flex-wrap: wrap; gap: 8px; }
.subject-tag { cursor: default; }

.empty-state { text-align: center; padding: 40px 0; color: #94a3b8; }

.doc-list { }
.doc-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-radius: 10px; border: 1px solid #eef2f6; margin-bottom: 8px; background: #fff; }
.doc-main { flex: 1; }
.doc-title { font-size: 15px; font-weight: 500; color: #0b1e33; }
.doc-meta { display: flex; align-items: center; gap: 12px; margin-top: 4px; font-size: 13px; color: #94a3b8; }
.doc-actions { display: flex; gap: 8px; margin-left: 16px; }
.doc-date { font-size: 12px; }
.doc-subjects { color: #3b82f6; font-size: 12px; }
</style>
