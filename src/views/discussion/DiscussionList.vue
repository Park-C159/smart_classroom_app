<template>
  <div class="standalone-page">
    <StandaloneHeader title="讨论区" icon="fas fa-users" />
    <main class="sa-body">
      <div class="page-header">
        <h2><el-icon><Comment /></el-icon> 讨论区</h2>
        <div class="header-actions">
          <el-button @click="$router.push('/messages')">
            <el-icon><ChatDotRound /></el-icon> 消息
          </el-button>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon> 发帖
          </el-button>
        </div>
      </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <el-input v-model="searchText" placeholder="搜索讨论..." @keydown.enter="loadDiscussions" clearable style="width:240px;">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>
      <div class="filter-group">
        <el-select v-model="subjectFilter" placeholder="全部学科" clearable @change="loadDiscussions" style="width:160px;">
          <el-option v-for="s in subjects" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </div>
      <el-button @click="loadDiscussions" :loading="loading"><el-icon><Refresh /></el-icon> 刷新</el-button>
    </div>

    <!-- 讨论列表 -->
    <div v-loading="loading" class="discussions">
      <div v-if="!discussions.length && !loading" class="empty-state">
        <el-icon :size="48" color="#cbd5e1"><ChatDotRound /></el-icon>
        <p>还没有讨论，来发第一个帖子吧！</p>
      </div>

      <div v-for="d in discussions" :key="d.id" :class="['discussion-card', { pinned: d.is_pinned }]" @click="goDetail(d.id)">
        <div class="card-top">
          <div class="card-title">
            <el-tag v-if="d.is_pinned" type="warning" size="small" effect="dark">置顶</el-tag>
            <span>{{ d.title }}</span>
          </div>
          <div class="card-stats">
            <span class="stat"><el-icon><View /></el-icon> {{ d.view_count }}</span>
            <span class="stat"><el-icon><ChatLineSquare /></el-icon> {{ d.reply_count }}</span>
            <span :class="['stat', { liked: d.is_liked }]"><el-icon><Star /></el-icon> {{ d.like_count }}</span>
          </div>
        </div>
        <div class="card-meta">
          <span class="author">{{ d.author_name }}</span>
          <span class="time">{{ formatDate(d.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadDiscussions"
        background
      />
    </div>

    <!-- 发帖弹窗 -->
    <el-dialog v-model="showCreateDialog" title="发帖" width="640px" :close-on-click-modal="false">
      <el-form :model="newPost" label-position="top">
        <el-form-item label="标题" required>
          <el-input v-model="newPost.title" placeholder="请输入标题" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="学科（可选）">
          <el-select v-model="newPost.subject_id" placeholder="选择学科" clearable style="width:100%">
            <el-option v-for="s in subjects" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <!-- QA 引用预览 -->
        <div v-if="newPost.qa_refs?.length" class="qa-refs-preview">
          <div class="qa-refs-label"><i class="fas fa-quote-right"></i> 引用的对话记录</div>
          <div class="qa-ref-item" v-for="(ref, ri) in newPost.qa_refs" :key="ri">
            <span :class="['ref-role', ref.role]">{{ ref.role === 'user' ? '🙋 提问' : '🤖 回答' }}</span>
            <div class="ref-content">{{ ref.content }}</div>
          </div>
        </div>
        <el-form-item label="补充说明">
          <el-input v-model="newPost.content" type="textarea" :rows="6" placeholder="补充说明你对这个回答的疑问或看法...（支持 Markdown 和 LaTeX）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false; pendingQaRefs = null; newPost.qa_refs = null">取消</el-button>
        <el-button type="primary" @click="createPost" :loading="creating">发帖</el-button>
      </template>
    </el-dialog>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { subjectsAPI } from '@/api/subjects'
import StandaloneHeader from '@/components/StandaloneHeader.vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const creating = ref(false)
const discussions = ref([])
const subjects = ref([])
const searchText = ref('')
const subjectFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showCreateDialog = ref(false)
const newPost = ref({ title: '', content: '', subject_id: null, qa_refs: null })

// Handle qa_refs from query params or sessionStorage
const pendingQaRefs = ref(null)

function loadQaRefs() {
  const q = route.query.qa_refs
  if (q) {
    try {
      pendingQaRefs.value = JSON.parse(q)
    } catch { /* ignore */ }
  } else if (route.query.qa_refs_stored === '1') {
    try {
      const stored = sessionStorage.getItem('pending_qa_refs')
      if (stored) {
        pendingQaRefs.value = JSON.parse(stored)
        sessionStorage.removeItem('pending_qa_refs')
      }
    } catch { /* ignore */ }
  }
  if (pendingQaRefs.value && pendingQaRefs.value.length) {
    // Auto-fill title from first question
    const firstQ = pendingQaRefs.value.find(r => r.role === 'user')
    if (firstQ) {
      const t = firstQ.content.slice(0, 60)
      newPost.value.title = '关于"' + t + (firstQ.content.length > 60 ? '..."' : '"') + ' 的讨论'
      newPost.value.content = '（详见下方引用）'
    }
    newPost.value.qa_refs = pendingQaRefs.value
    showCreateDialog.value = true
    // Clean query params
    router.replace({ path: '/discussion' })
  }
}

watch(() => route.query, loadQaRefs, { immediate: true })

async function loadDiscussions() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (searchText.value) params.search = searchText.value
    if (subjectFilter.value) params.subject_id = subjectFilter.value
    const r = await request.get('/discussion', { params })
    discussions.value = r.data.items || []
    total.value = r.data.total || 0
  } catch {
    ElMessage.error('加载讨论列表失败')
  } finally {
    loading.value = false
  }
}

async function loadSubjects() {
  try { subjects.value = await subjectsAPI.list() } catch { /* ignore */ }
}

async function createPost() {
  if (!newPost.value.title.trim() || !newPost.value.content.trim()) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  creating.value = true
  try {
    await request.post('/discussion', {
      title: newPost.value.title,
      content: newPost.value.content,
      subject_id: newPost.value.subject_id || null,
      qa_refs: newPost.value.qa_refs || null,
    })
    ElMessage.success('发帖成功')
    showCreateDialog.value = false
    pendingQaRefs.value = null
    newPost.value = { title: '', content: '', subject_id: null, qa_refs: null }
    page.value = 1
    await loadDiscussions()
  } catch (e) {
    ElMessage.error('发帖失败: ' + (e.response?.data?.detail || e.message))
  } finally {
    creating.value = false
  }
}

function goDetail(id) {
  router.push(`/discussion/${id}`)
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return d.toLocaleDateString()
}

onMounted(() => {
  loadSubjects()
  loadDiscussions()
})
</script>

<style scoped>
.standalone-page { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; overflow-y: auto; }
.sa-body { flex: 1; padding: 24px 32px; max-width: 1000px; margin: 0 auto; width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; color: #0b1e33; margin: 0; }
.header-actions { display: flex; gap: 8px; }

.filter-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }

.discussions { min-height: 200px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #94a3b8; }
.empty-state p { margin-top: 12px; font-size: 14px; }

.discussion-card { background: #fff; border: 1px solid #eef2f6; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; }
.discussion-card:hover { border-color: #3b82f6; box-shadow: 0 2px 12px rgba(59,130,246,0.1); }
.discussion-card.pinned { border-left: 3px solid #f59e0b; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #0b1e33; }
.card-stats { display: flex; gap: 16px; font-size: 13px; color: #94a3b8; }
.card-stats .stat { display: flex; align-items: center; gap: 4px; }
.card-stats .stat.liked { color: #f59e0b; }
.card-meta { font-size: 13px; color: #94a3b8; display: flex; gap: 16px; }
.card-meta .author { color: #3b82f6; }

.pagination { display: flex; justify-content: center; margin-top: 20px; }

/* QA 引用预览 */
.qa-refs-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}
.qa-refs-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 10px;
}
.qa-ref-item {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}
.qa-ref-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.ref-role {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-bottom: 4px;
}
.ref-role.user { background: #dbeafe; color: #1e40af; }
.ref-role.assistant { background: #f1f5f9; color: #475569; }
.ref-content {
  font-size: 13px;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 80px;
  overflow: hidden;
  position: relative;
}
.ref-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(transparent, #f8fafc);
}
</style>
