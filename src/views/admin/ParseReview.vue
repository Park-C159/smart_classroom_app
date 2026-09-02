<template>
  <div class="parse-review">
    <div class="page-header">
      <h2><el-icon><Checked /></el-icon> 解析校对</h2>
      <span class="badge">管理员</span>
    </div>

    <!-- Document selector -->
    <div class="card">
      <div class="card-title"><i class="fas fa-file-pdf"></i> 选择已解析文档</div>
      <div class="doc-select-row">
        <el-select v-model="selectedDocId" placeholder="选择文档" style="width:300px" @change="loadPreview">
          <el-option v-for="doc in completedDocs" :key="doc.id" :label="doc.title" :value="doc.id" />
        </el-select>
        <el-button type="primary" @click="loadPreview" :disabled="!selectedDocId" :loading="loading">
          加载预览
        </el-button>
        <el-button type="success" @click="buildTree" :disabled="!selectedDocId" :loading="building">
          <el-icon><Upload /></el-icon> 构建知识树
        </el-button>
      </div>
      <div v-if="buildResult" class="build-result">
        <el-alert type="success" :closable="false">
          ✅ 知识树构建完成：{{ buildResult.result?.knowledge_points || 0 }} 个知识点，
          {{ buildResult.result?.content_chunks || 0 }} 个内容块，
          {{ buildResult.result?.exercises || 0 }} 道习题
        </el-alert>
      </div>
    </div>

    <!-- Preview content -->
    <div class="card" v-if="preview">
      <div class="card-title"><i class="fas fa-sitemap"></i> 结构预览</div>
      <div v-if="preview.chapters.length === 0" class="empty-state">
        <p>未能识别到章节结构，请检查 Markdown 格式</p>
      </div>
      <div v-else class="tree-preview">
        <div v-for="ch in preview.chapters" :key="ch.title" class="chapter-node">
          <div class="chapter-label">📘 {{ ch.title }}</div>
          <div v-for="sec in (ch.sections || [])" :key="sec.number" class="section-node">
            <div class="section-label">📄 {{ sec.number }} {{ sec.title }}</div>
            <div v-for="kp in (sec.kps || [])" :key="kp.id" class="kp-node">
              <span class="kp-badge">{{ kp.id }}</span> {{ kp.title }}
              <span class="block-count" v-if="kp.blocks?.length">{{ kp.blocks.length }} 个内容块</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Exercises preview -->
    <div class="card" v-if="preview?.exercises?.length">
      <div class="card-title"><i class="fas fa-list-ol"></i> 识别到 {{ preview.exercises.length }} 道习题</div>
      <div class="exercise-list">
        <div v-for="(ex, i) in preview.exercises.slice(0, 10)" :key="i" class="ex-row">
          <span class="ex-num">{{ ex.number }}.</span>
          <span class="ex-text">{{ ex.text }}</span>
        </div>
        <p v-if="preview.exercises.length > 10" class="more-hint">...还有 {{ preview.exercises.length - 10 }} 道习题</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { documentsAPI } from '@/api/documents'
import knowledgeAPI from '@/api/knowledge'

const completedDocs = ref([])
const selectedDocId = ref(null)
const preview = ref(null)
const buildResult = ref(null)
const loading = ref(false)
const building = ref(false)

onMounted(async () => {
  try {
    const docs = await documentsAPI.list()
    completedDocs.value = (docs || []).filter(d => d.status === 'completed')
  } catch {}
})

async function loadPreview() {
  if (!selectedDocId.value) return
  loading.value = true
  try {
    preview.value = await knowledgeAPI.previewDoc(selectedDocId.value)
    buildResult.value = null
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '加载失败')
  } finally { loading.value = false }
}

async function buildTree() {
  if (!selectedDocId.value) return
  building.value = true
  try {
    buildResult.value = await knowledgeAPI.buildFromDoc(selectedDocId.value)
    ElMessage.success('知识树构建完成！')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '构建失败')
  } finally { building.value = false }
}
</script>

<style scoped>
.parse-review { padding: 24px; height: 100%; overflow-y: auto; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; }

.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }

.doc-select-row { display: flex; gap: 12px; align-items: center; }
.build-result { margin-top: 16px; }

.empty-state { text-align: center; padding: 32px 0; color: #94a3b8; }
.empty-state p { font-size: 14px; }

.tree-preview { padding-left: 8px; }
.chapter-node { margin-bottom: 12px; }
.chapter-label { font-weight: 700; font-size: 16px; color: #0b1e33; padding: 8px 0; border-bottom: 1px solid #eef2f6; }
.section-node { margin-left: 24px; margin-top: 8px; }
.section-label { font-weight: 600; font-size: 14px; color: #334155; padding: 4px 0; }
.kp-node { margin-left: 24px; padding: 6px 10px; font-size: 13px; color: #475569; border-left: 2px solid #3b82f6; margin-top: 4px; }
.kp-badge { background: #dbeafe; color: #1e40af; font-size: 11px; padding: 1px 6px; border-radius: 3px; margin-right: 6px; }
.block-count { font-size: 11px; color: #94a3b8; margin-left: 8px; }

.exercise-list { padding-left: 8px; }
.ex-row { display: flex; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
.ex-num { font-weight: 600; color: #3b82f6; min-width: 30px; }
.ex-text { color: #334155; flex: 1; }
.more-hint { font-size: 13px; color: #94a3b8; margin-top: 8px; text-align: center; }
</style>
