<template>
  <div class="standalone-page">
    <StandaloneHeader title="讨论详情" icon="fas fa-users" />
    <main class="sa-body">
      <div class="page-header">
        <el-button text @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回列表</el-button>
      <div class="header-actions" v-if="disc">
        <el-button v-if="isTeacherOrAdmin" @click="togglePin" :type="disc.is_pinned ? 'warning' : 'default'" size="small">
          {{ disc.is_pinned ? '取消置顶' : '置顶' }}
        </el-button>
        <el-button v-if="canDelete" @click="deletePost" type="danger" size="small">删除</el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <el-icon :size="32" class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <template v-if="disc">
      <div class="post-card">
        <h1>{{ disc.title }}</h1>
        <div class="post-meta">
          <span class="author">{{ disc.author_name }}</span>
          <span class="time">{{ formatDate(disc.created_at) }}</span>
          <span v-if="disc.subject_id" class="badge-s">📚 学科</span>
          <el-button v-if="disc.user_id !== authStore.user?.id" size="small" text type="primary" @click="$router.push(`/messages/${disc.user_id}`)">
            <i class="fas fa-envelope"></i> 私信
          </el-button>
        </div>
        <div class="post-content" v-text="disc.content"></div>

        <!-- QA 引用卡片 -->
        <div v-if="disc.qa_refs?.length" class="qa-refs-section">
          <div class="qa-refs-title"><i class="fas fa-quote-right"></i> AI 对话引用</div>
          <div class="qa-ref-card" v-for="(ref, ri) in disc.qa_refs" :key="ri">
            <span :class="['ref-role-tag', ref.role]">{{ ref.role === 'user' ? '🙋 提问' : '🤖 AI 回答' }}</span>
            <div class="ref-text">{{ ref.content }}</div>
          </div>
        </div>

        <div class="post-actions">
          <el-button :type="disc.is_liked ? 'warning' : 'default'" @click="toggleLike" size="small" text>
            <el-icon><Star /></el-icon> {{ disc.like_count }} 点赞
          </el-button>
          <span class="stat"><el-icon><View /></el-icon> {{ disc.view_count }} 浏览</span>
        </div>
      </div>

      <!-- 回复区 -->
      <div class="replies-section">
        <h3>回复 ({{ replies.length }})</h3>
        <div v-if="!replies.length && !loading" class="empty-replies">
          <p>暂无回复，来写第一条吧</p>
        </div>
        <div v-for="r in replies" :key="r.id" class="reply-card">
          <div class="reply-header">
            <span class="reply-author">{{ r.author_name }}</span>
            <span class="reply-time">{{ formatDate(r.created_at) }}</span>
          </div>
          <div class="reply-content">{{ r.content }}</div>
          <div class="reply-actions">
            <el-button :type="r.is_liked ? 'warning' : 'default'" @click="toggleReplyLike(r)" size="small" text>
              <el-icon><Star /></el-icon> {{ r.like_count }}
            </el-button>
            <el-button v-if="isOwner(r.user_id) || isAdmin" @click="deleteReply(r.id)" size="small" text type="danger">
              删除
            </el-button>
          </div>
        </div>

        <!-- 回复输入 -->
        <div class="reply-input">
          <el-input v-model="replyContent" type="textarea" :rows="3" placeholder="写下你的回复..." maxlength="2000" show-word-limit />
          <el-button type="primary" @click="submitReply" :loading="replying" style="margin-top:8px;">
            <el-icon><Promotion /></el-icon> 回复
          </el-button>
        </div>
      </div>
    </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import StandaloneHeader from '@/components/StandaloneHeader.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const disc = ref(null)
const replies = ref([])
const loading = ref(true)
const replying = ref(false)
const replyContent = ref('')

const isAdmin = computed(() => authStore.user?.role === 'admin')
const isTeacherOrAdmin = computed(() => ['teacher', 'admin'].includes(authStore.user?.role))
const canDelete = computed(() => disc.value && (isOwner(disc.value.user_id) || isAdmin.value))

function isOwner(userId) {
  return authStore.user?.id === userId
}

async function loadDetail() {
  loading.value = true
  try {
    const r = await request.get(`/discussion/${route.params.id}`)
    disc.value = r.data.discussion
    replies.value = r.data.replies || []
  } catch {
    ElMessage.error('加载失败')
    router.push('/discussion')
  } finally {
    loading.value = false
  }
}

async function toggleLike() {
  try {
    const r = await request.post(`/discussion/${disc.value.id}/like`)
    disc.value.is_liked = r.data.liked
    disc.value.like_count = r.data.like_count
  } catch { ElMessage.error('操作失败') }
}

async function toggleReplyLike(reply) {
  try {
    const r = await request.post(`/discussion/reply/${reply.id}/like`)
    reply.is_liked = r.data.liked
    reply.like_count = r.data.like_count
  } catch { ElMessage.error('操作失败') }
}

async function togglePin() {
  try {
    const r = await request.post(`/discussion/${disc.value.id}/pin`)
    disc.value.is_pinned = r.data.is_pinned
    ElMessage.success(r.data.message || '操作成功')
  } catch { ElMessage.error('操作失败') }
}

async function submitReply() {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  replying.value = true
  try {
    await request.post(`/discussion/${disc.value.id}/reply`, { content: replyContent.value })
    replyContent.value = ''
    await loadDetail()
  } catch (e) {
    ElMessage.error('回复失败: ' + (e.response?.data?.detail || e.message))
  } finally {
    replying.value = false
  }
}

async function deletePost() {
  try {
    await ElMessageBox.confirm('确定删除该帖子吗？', '确认', { type: 'warning' })
    await request.delete(`/discussion/${disc.value.id}`)
    ElMessage.success('已删除')
    router.push('/discussion')
  } catch { /* cancelled or error */ }
}

async function deleteReply(id) {
  try {
    await request.delete(`/discussion/reply/${id}`)
    await loadDetail()
  } catch { /* error */ }
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return d.toLocaleString()
}

onMounted(loadDetail)
</script>

<style scoped>
.standalone-page { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; overflow-y: auto; }
.sa-body { flex: 1; padding: 24px 32px; max-width: 1000px; margin: 0 auto; width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-actions { display: flex; gap: 8px; }
.loading-state { display: flex; flex-direction: column; align-items: center; padding: 60px 0; color: #94a3b8; }

.post-card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #eef2f6; }
.post-card h1 { font-size: 22px; color: #0b1e33; margin: 0 0 12px; }
.post-meta { display: flex; gap: 16px; align-items: center; font-size: 13px; color: #94a3b8; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eef2f6; }
.post-meta .author { color: #3b82f6; font-weight: 500; }
.post-content { font-size: 15px; line-height: 1.8; color: #1e293b; white-space: pre-wrap; word-break: break-word; }
.post-actions { display: flex; gap: 16px; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #eef2f6; }
.post-actions .stat { font-size: 13px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }

.replies-section { margin-bottom: 24px; }
.replies-section h3 { font-size: 16px; color: #0b1e33; margin-bottom: 16px; }
.empty-replies { text-align: center; padding: 40px 0; color: #94a3b8; }

.reply-card { background: #f8fafc; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; border: 1px solid #eef2f6; }
.reply-header { display: flex; gap: 12px; margin-bottom: 8px; font-size: 13px; }
.reply-author { font-weight: 500; color: #3b82f6; }
.reply-time { color: #94a3b8; }
.reply-content { font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-wrap; word-break: break-word; }
.reply-actions { margin-top: 8px; display: flex; gap: 4px; }

.reply-input { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eef2f6; }

/* QA 引用卡片 */
.qa-refs-section {
  margin-top: 16px;
  margin-bottom: 8px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 14px 18px;
}
.qa-refs-title {
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 10px;
}
.qa-ref-card {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid #fef3c7;
}
.qa-ref-card:last-child { margin-bottom: 0; }
.ref-role-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  margin-bottom: 4px;
}
.ref-role-tag.user { background: #dbeafe; color: #1e40af; }
.ref-role-tag.assistant { background: #e2e8f0; color: #475569; }
.ref-text {
  font-size: 13px;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}
.badge-s { background: #dbeafe; color: #1e40af; padding: 1px 10px; border-radius: 10px; font-size: 12px; }
</style>
