<template>
  <div class="management-page">
    <StandaloneHeader title="管理后台" icon="fas fa-cog" />

    <main class="mgmt-body">
      <!-- ===== 系统概览 ===== -->
      <div class="card stats-card" v-if="isAdmin">
        <div class="card-title"><i class="fas fa-chart-pie"></i> 系统概览</div>
        <div v-if="loadingStats" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        <div class="stats-grid" v-else>
          <div class="stat-item">
            <div class="stat-num">{{ stats.users?.total || 0 }}</div>
            <div class="stat-label">总用户</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.content?.documents || 0 }}</div>
            <div class="stat-label">教材</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.content?.exercises || 0 }}</div>
            <div class="stat-label">题库</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.content?.total_chunks || 0 }}</div>
            <div class="stat-label">知识点</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.activity?.total_discussions || 0 }}</div>
            <div class="stat-label">讨论帖</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.activity?.total_interactions || 0 }}</div>
            <div class="stat-label">问答次数</div>
          </div>
        </div>
      </div>

      <!-- ===== 学科管理 ===== -->
      <div class="card">
        <div class="card-title">
          <i class="fas fa-book"></i> 学科管理
          <button class="btn btn-primary btn-sm" @click="showAddSubject = true" style="margin-left:auto">
            添加
          </button>
        </div>
        <div v-if="loadingSubjects" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        <div class="subject-list" v-else-if="subjects.length">
          <span class="subject-item" v-for="s in subjects" :key="s.id">
            <template v-if="editingSubjectId === s.id">
              <input v-model="editingSubjectName" @keydown.enter="saveSubject(s.id)" class="input-inline" style="width:120px;font-size:13px;padding:2px 6px;border:1px solid #3b82f6;border-radius:4px" />
              <button class="btn btn-success btn-xs" @click="saveSubject(s.id)"><i class="fas fa-check"></i></button>
              <button class="btn btn-outline btn-xs" @click="editingSubjectId = null">取消</button>
            </template>
            <template v-else>
              📚 {{ s.name }}
              <span v-if="isAdmin" class="edit-btn" @click="startEditSubject(s)" title="编辑" style="margin-left:6px;cursor:pointer;color:#3b82f6;font-size:12px"><i class="fas fa-pen"></i></span>
              <span v-if="isAdmin" class="del-btn" @click="deleteSubject(s.id)" title="删除"><i class="fas fa-times"></i></span>
            </template>
          </span>
        </div>
        <span class="text-muted" v-else-if="!loadingSubjects">暂无学科</span>
        <div v-if="showAddSubject" class="add-row">
          <input v-model="newSubjectName" placeholder="学科名称" @keydown.enter="createSubject" class="input-sm" />
          <button class="btn btn-success btn-sm" @click="createSubject"><i class="fas fa-check"></i></button>
          <button class="btn btn-outline btn-sm" @click="showAddSubject = false; newSubjectName = ''">取消</button>
        </div>
      </div>

      <!-- ===== 教材管理 ===== -->
      <div class="card">
        <div class="card-title">
          <i class="fas fa-file-pdf"></i> 教材管理
          <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
            <select v-model="uploadSubjectId" class="form-select">
              <option value="">不指定学科</option>
              <option v-for="s in subjects" :key="'up' + s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <input type="file" ref="pdfInput" accept=".pdf" style="font-size:12px;width:130px;" />
            <button class="btn btn-primary btn-sm" @click="uploadDocument">上传</button>
          </div>
        </div>
        <div class="filter-bar">
          <select v-model="docSubjectFilter" @change="loadDocuments" class="form-select" style="width:130px">
            <option value="">全部学科</option>
            <option v-for="s in subjects" :key="'df'+s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <button class="btn btn-warning btn-sm" @click="rebuildAll" :disabled="rebuilding">
            {{ rebuilding ? '索引重建中...' : '🔄 重建全部索引' }}
          </button>
        </div>
        <div v-if="loadingDocuments" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        <div v-else-if="documents.length" class="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>文件名</th><th>类型</th><th>页数</th><th>学科</th><th>状态</th><th>操作</th><th>上传时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in documents" :key="d.id">
                <td>{{ d.id }}</td>
                <td>{{ d.filename }}</td>
                <td>
                  <select :value="d.doc_type || ''" @change="setDocType(d, $event.target.value)" class="form-select" style="width:80px;font-size:12px">
                    <option value="">--</option>
                    <option value="textbook">教材</option>
                    <option value="reference">参考</option>
                  </select>
                  <button v-if="d.doc_type==='textbook' && !d.is_primary" class="btn btn-outline btn-xs" style="font-size:11px;padding:2px 6px" @click="setPrimary(d)">设为主教材</button>
                </td>
                <td>{{ d.total_pages || '-' }}</td>
                <td>
                  <span class="subject-tag" v-for="s in (d.subjects || [])" :key="s.id">{{ s.name }}</span>
                  <span v-if="!d.subjects?.length" style="color:#94a3b8;font-size:12px;">未分配</span>
                  <button class="btn btn-outline btn-xs" @click="editDocSubjects(d)"><i class="fas fa-edit"></i></button>
                </td>
                <td>
                  <span :class="['status-btn', 'status-' + d.status]" @click="viewLog(d.id)">
                    {{ statusMap[d.status] || d.status }}
                  </span>
                </td>
                <td class="table-actions">
                  <button class="btn btn-primary btn-sm" @click="viewDocument(d.id)">查看</button>
                  <button class="btn btn-warning btn-sm" @click="reparseDoc(d.id)">重新解析</button>
                  <button class="btn btn-danger btn-sm" @click="deleteDoc(d.id)">删除</button>
                </td>
                <td>{{ formatDate(d.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="text-muted" v-else-if="!loadingDocuments">暂无文档，上传 PDF 开始解析</div>
      </div>

      <!-- ===== 用户管理（管理员） ===== -->
      <div class="card" v-if="isAdmin">
        <div class="card-title">
          <i class="fas fa-users"></i> 用户管理
          <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
            <button class="btn btn-primary btn-sm" @click="openCreateUser"><i class="fas fa-user-plus"></i> 添加用户</button>
            <select v-model="importSubjectId" class="form-select">
              <option value="">不指定学科</option>
              <option v-for="s in subjects" :key="'imp' + s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <input type="file" ref="csvInput" accept=".csv,.xlsx" style="font-size:12px;width:130px;" />
            <button class="btn btn-success btn-sm" @click="importUsers">导入</button>
          </div>
        </div>

        <div class="filter-bar">
          <input v-model="searchText" placeholder="搜索姓名/学号" class="search-input" @keydown.enter="loadUsers" />
          <select v-model="roleFilter" @change="loadUsers" class="form-select">
            <option value="">全部身份</option>
            <option value="student">学生</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
          <select v-model="userSubjectFilter" @change="loadUsers" class="form-select">
            <option value="">全部学科</option>
            <option v-for="s in subjects" :key="'uf' + s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <button class="btn btn-outline btn-sm" @click="loadUsers"><i class="fas fa-sync-alt"></i></button>
        </div>

        <div :class="['message', importResult.type]" v-if="importResult.show" v-html="importResult.msg"></div>

        <div v-if="loadingUsers" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        <div v-else-if="users.length" class="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>身份</th><th>姓名</th><th>学号</th><th>班级</th><th>学科</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.id }}</td>
                <td>{{ roleMap[u.role] }}</td>
                <td>{{ u.real_name || '' }}</td>
                <td>{{ u.student_id || '' }}</td>
                <td>{{ u.class_name || '' }}</td>
                <td>
                  <span class="subject-tag" v-for="s in (u.subjects || [])" :key="s.id">{{ s.name }}</span>
                  <span v-if="!u.subjects?.length" style="color:#94a3b8;font-size:12px;">未分配</span>
                  <button class="btn btn-outline btn-xs" @click="editUserSubjects(u)"><i class="fas fa-edit"></i></button>
                </td>
                <td>{{ u.is_active ? '✅' : '❌' }}</td>
                <td>
                  <button class="btn btn-warning btn-sm" @click="resetPassword(u.id)">重置密码</button>
                  <button class="btn btn-danger btn-sm" @click="deleteUser(u.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="text-muted" v-else-if="!loadingUsers">暂无用户</div>
      </div>

      <!-- ===== 反馈建议（管理员） ===== -->
      <div class="card" v-if="isAdmin">
        <div class="card-title">
          <i class="fas fa-comment-dots"></i> 反馈建议
          <select v-model="feedbackCategory" @change="loadFeedbacks" class="form-select" style="margin-left:12px;">
            <option value="">全部类型</option>
            <option value="feature">功能建议</option>
            <option value="bug">Bug反馈</option>
            <option value="experience">使用体验</option>
          </select>
        </div>
        <div v-if="loadingFeedbacks" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        <div v-else-if="feedbacks.length" class="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>用户</th><th>类型</th><th>内容</th><th>时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="fb in feedbacks" :key="fb.id">
                <td>{{ fb.id }}</td>
                <td>{{ fb.author_name }}</td>
                <td><span :class="['fb-tag', 'fb-' + fb.category]">{{ categoryMap[fb.category] }}</span></td>
                <td style="max-width:400px;word-break:break-word;">{{ fb.content }}</td>
                <td>{{ formatDate(fb.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="text-muted" v-else-if="!loadingFeedbacks">暂无反馈</div>
      </div>
    </main>

    <!-- ===== 弹窗 ===== -->

    <!-- 学科分配（文档） -->
    <div :class="['modal-overlay', { active: showDocSubjectModal }]" @click.self="showDocSubjectModal = false">
      <div class="modal-content">
        <h3><i class="fas fa-tags"></i> 为教材选择学科</h3>
        <div class="checkbox-group">
          <label v-for="s in subjects" :key="'doc' + s.id">
            <input type="checkbox" :value="s.id" v-model="docSubjectIds" /> {{ s.name }}
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showDocSubjectModal = false">取消</button>
          <button class="btn btn-primary" @click="saveDocSubjects">保存</button>
        </div>
      </div>
    </div>

    <!-- 学科分配（用户） -->
    <div :class="['modal-overlay', { active: showUserSubjectModal }]" @click.self="showUserSubjectModal = false">
      <div class="modal-content">
        <h3><i class="fas fa-tags"></i> 为用户分配学科</h3>
        <div class="checkbox-group">
          <label v-for="s in subjects" :key="'user' + s.id">
            <input type="checkbox" :value="s.id" v-model="userSubjectIds" /> {{ s.name }}
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showUserSubjectModal = false">取消</button>
          <button class="btn btn-primary" @click="saveUserSubjects">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加用户弹窗 -->
    <div :class="['modal-overlay', { active: showCreateUserModal }]" @click.self="showCreateUserModal = false">
      <div class="modal-content">
        <h3><i class="fas fa-user-plus"></i> 添加用户</h3>
        <div class="form-fields">
          <div class="form-field">
            <label>用户名 *</label>
            <input v-model="newUser.username" placeholder="登录账号，如 zhangsan" />
          </div>
          <div class="form-field">
            <label>真实姓名</label>
            <input v-model="newUser.real_name" placeholder="如 张三" />
          </div>
          <div class="form-field">
            <label>身份</label>
            <select v-model="newUser.role" class="form-select">
              <option value="student">学生</option>
              <option value="teacher">教师</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div class="form-field">
            <label>班级</label>
            <input v-model="newUser.class_name" placeholder="可选" />
          </div>
          <div class="form-field">
            <label>学号</label>
            <input v-model="newUser.student_id" placeholder="可选" />
          </div>
          <div class="form-field">
            <label>密码 *</label>
            <input v-model="newUser.password" placeholder="默认 123456" />
          </div>
        </div>
        <div class="form-field" style="margin-bottom:12px;">
          <label>学科（可多选，用于学生选科/教师授课）</label>
          <div class="checkbox-group">
            <label v-for="s in subjects" :key="'new' + s.id">
              <input type="checkbox" :value="s.id" v-model="newUser.subject_ids" /> {{ s.name }}
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showCreateUserModal = false">取消</button>
          <button class="btn btn-primary" @click="createUser"><i class="fas fa-save"></i> 创建</button>
        </div>
      </div>
    </div>

    <!-- 日志弹窗 -->
    <div :class="['modal-overlay', { active: showLogModal }]" @click.self="closeLog">
      <div class="log-viewer">
        <div class="log-header">
          <h3><i class="fas fa-terminal"></i> MinerU 日志 <span class="muted">(文档 {{ logDocId }})</span></h3>
          <button class="close-btn" @click="closeLog"><i class="fas fa-times"></i></button>
        </div>
        <div class="log-body" ref="logBodyRef"><pre>{{ logContent || '加载中...' }}</pre></div>
        <div class="log-footer">
          <span class="log-status">状态: <span>{{ logStatus || '⏳' }}</span></span>
          <div class="log-actions">
            <span class="log-timestamp" v-if="logTimestamp">最后更新: {{ logTimestamp }}</span>
            <button class="btn-refresh-log" @click="refreshLog"><i class="fas fa-sync-alt"></i> 刷新</button>
            <button class="btn-refresh-log" @click="copyLog"><i class="fas fa-copy"></i> 复制</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 文档内容弹窗 -->
    <div :class="['modal-overlay', { active: showDocDetail }]" @click.self="showDocDetail = false">
      <div class="modal-content detail-modal">
        <div class="detail-header">
          <h3><i class="fas fa-file-alt"></i> 解析内容 <span class="muted">{{ docDetailTitle }}</span></h3>
          <button class="close-btn" @click="showDocDetail = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="detail-body"><div class="md-content" v-html="docDetailHtml"></div></div>
        <div class="detail-footer"><button class="btn btn-primary" @click="showDocDetail = false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usersAPI } from '@/api/users'
import { documentsAPI } from '@/api/documents'
import { subjectsAPI } from '@/api/subjects'
import analyticsAPI from '@/api/analytics'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import katex from 'katex'
import StandaloneHeader from '@/components/StandaloneHeader.vue'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' }
const statusMap = { pending: '⏳ 等待中', processing: '🔄 处理中', completed: '✅ 已完成', failed: '❌ 失败' }

// ── 学科 ──
const subjects = ref([])
const showAddSubject = ref(false)
const newSubjectName = ref('')
const editingSubjectId = ref(null)
const editingSubjectName = ref('')
const loadingSubjects = ref(false)
async function loadSubjects() { loadingSubjects.value = true; try { subjects.value = await subjectsAPI.list() } catch {} finally { loadingSubjects.value = false } }
async function createSubject() {
  const name = newSubjectName.value.trim()
  if (!name) return
  try {
    await subjectsAPI.create(name)
    ElMessage.success(`学科「${name}」已添加`)
    newSubjectName.value = ''
    showAddSubject.value = false
    await loadSubjects()
  } catch (e) { ElMessage.error('添加失败: ' + (e.response?.data?.detail || e.message)) }
}
function startEditSubject(s) {
  editingSubjectId.value = s.id
  editingSubjectName.value = s.name
}

async function saveSubject(id) {
  const name = editingSubjectName.value.trim()
  if (!name) return
  try {
    await request.put('/subjects/' + id, { name })
    await loadSubjects()
    editingSubjectId.value = null
  } catch (e) { alert('修改失败: ' + (e.response?.data?.detail || e.message)) }
}

async function deleteSubject(id) {
  try {
    await ElMessageBox.confirm('确定删除该学科？删除后已分配该学科的教材和用户将失去关联。', '确认删除', { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' })
    await subjectsAPI.delete(id)
    ElMessage.success('学科已删除')
    await loadSubjects()
    await loadDocuments()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败: ' + (e.response?.data?.detail || e.message))
  }
}

// ── 文档 ──
const documents = ref([])
const uploadSubjectId = ref('')
const docSubjectFilter = ref('')
const pdfInput = ref(null)
const loadingDocuments = ref(true)  // only true on first load, not during auto-refresh
const rebuildSubjectId = ref('')
const manageSubjectId = ref('')
const rebuilding = ref(false)
async function loadDocuments(isRefresh = false) {
  if (!isRefresh) loadingDocuments.value = true
  try {
    const params = docSubjectFilter.value ? { subject_id: docSubjectFilter.value } : {}
    documents.value = await documentsAPI.list(params) || []
    if (documents.value.some(d => d.status === 'processing')) setTimeout(() => loadDocuments(true), 3000)
  } catch {} finally { loadingDocuments.value = false }
}
async function uploadDocument() {
  const file = pdfInput.value?.files?.[0]
  if (!file) { ElMessage.warning('请选择PDF文件'); return }
  const fd = new FormData(); fd.append('file', file)
  if (uploadSubjectId.value) fd.append('subject_ids', uploadSubjectId.value)
  try {
    await documentsAPI.upload(fd)
    ElMessage.success('上传成功，后台解析中...')
    await loadDocuments()
    pdfInput.value.value = ''
  } catch (e) { ElMessage.error('上传失败: ' + (e.response?.data?.detail || e.message)) }
}
async function reparseDoc(id) {
  if (!confirm('确定重新解析？将清除之前的解析结果。')) return
  try { await documentsAPI.reparse(id); ElMessage.success('已触发重新解析'); await loadDocuments() }
  catch (e) { ElMessage.error('重新解析失败: ' + (e.response?.data?.detail || e.message)) }
}
async function deleteDoc(id) {
  if (!confirm('确定删除？')) return
  try { await documentsAPI.delete(id); await loadDocuments(); if (logDocId.value === id) closeLog() }
  catch (e) { alert('删除失败: ' + (e.response?.data?.detail || e.message)) }
}

const pendingChanges = ref({}) // { docId: { doc_type, is_primary } }

function setDocType(doc, docType) {
  if (!docType) return
  doc.doc_type = docType  // local only
  pendingChanges.value[doc.id] = { ...pendingChanges.value[doc.id], doc_type: docType }
}

function setPrimary(doc) {
  doc.is_primary = true  // local only
  pendingChanges.value[doc.id] = { ...pendingChanges.value[doc.id], is_primary: true }
}

async function rebuildAll() {
  rebuilding.value = true
  try {
    // 1. Save pending changes
    for (const [docId, changes] of Object.entries(pendingChanges.value)) {
      if (changes.doc_type) {
        await request.put('/documents/' + docId + '/type', { doc_type: changes.doc_type })
      }
      if (changes.is_primary) {
        await request.put('/documents/' + docId + '/primary', { is_primary: true })
      }
    }
    pendingChanges.value = {}

    // 2. Rebuild indices
    const sids = docSubjectFilter.value ? [parseInt(docSubjectFilter.value)] : subjects.value.map(s => s.id)
    for (const sid of sids) {
      await request.post('/knowledge/chunks/rebuild-index?subject_id=' + sid)
      await request.post('/knowledge/question-bank/rebuild-index?subject_id=' + sid)
    }
    alert('已保存并重建索引')
  } catch (e) { alert('操作失败: ' + (e.response?.data?.detail || e.message)) }
  finally { rebuilding.value = false }
}

// ── 文档学科分配 ──
const showDocSubjectModal = ref(false)
const docSubjectIds = ref([])
const editingDocId = ref(null)
async function editDocSubjects(doc) {
  editingDocId.value = doc.id
  try { const subs = await documentsAPI.getDocumentSubjects(doc.id); docSubjectIds.value = (subs || []).map(s => s.id) }
  catch { docSubjectIds.value = [] }
  showDocSubjectModal.value = true
}
async function saveDocSubjects() {
  if (!editingDocId.value) return
  try { await documentsAPI.updateDocumentSubjects(editingDocId.value, docSubjectIds.value); showDocSubjectModal.value = false; await loadDocuments() }
  catch (e) { alert('保存失败: ' + (e.response?.data?.detail || e.message)) }
}

// ── 用户 ──
const users = ref([])
const searchText = ref('')
const roleFilter = ref('')
const userSubjectFilter = ref('')
const importSubjectId = ref('')
const importResult = ref({ show: false, type: 'success', msg: '' })
const csvInput = ref(null)
const loadingUsers = ref(false)
async function loadUsers() {
  loadingUsers.value = true
  try {
    const params = { page_size: 100 }
    if (searchText.value) params.search = searchText.value
    if (roleFilter.value) params.role = roleFilter.value
    if (userSubjectFilter.value) params.subject_id = userSubjectFilter.value
    const data = await usersAPI.list(params)
    users.value = data.items || []
  } catch {} finally { loadingUsers.value = false }
}
async function importUsers() {
  const file = csvInput.value?.files?.[0]
  if (!file) { importResult.value = { show: true, type: 'error', msg: '请选择文件' }; return }
  const fd = new FormData(); fd.append('file', file)
  try {
    const data = await usersAPI.importExcel(fd)
    let msg = `✅ 成功导入 ${data.success || data.created} 个用户`
    if (data.errors?.length) msg += '<br>⚠️ ' + data.errors.join('；')
    importResult.value = { show: true, type: 'success', msg }
    await loadUsers(); csvInput.value.value = ''
  } catch (e) { importResult.value = { show: true, type: 'error', msg: '导入失败：' + (e.response?.data?.detail || e.message) } }
}
async function deleteUser(id) { if (!confirm('确定删除？')) return; try { await usersAPI.delete(id); await loadUsers() } catch (e) { alert(e.response?.data?.detail || '删除失败') } }
async function resetPassword(id) { if (!confirm('确认重置密码为学号？')) return; try { const d = await usersAPI.resetPassword(id); alert(d.message || '✅ 已重置') } catch (e) { alert('重置失败') } }

// ── 手动添加用户 ──
const showCreateUserModal = ref(false)
const newUser = ref({ username: '', password: '123456', real_name: '', role: 'student', class_name: '', student_id: '', subject_ids: [] })
function openCreateUser() { newUser.value = { username: '', password: '123456', real_name: '', role: 'student', class_name: '', student_id: '', subject_ids: [] }; showCreateUserModal.value = true }
async function createUser() {
  if (!newUser.value.username.trim()) { ElMessage.warning('请输入用户名'); return }
  if (!newUser.value.password || newUser.value.password.length < 6) { ElMessage.warning('密码至少 6 位'); return }
  try {
    await usersAPI.create({
      username: newUser.value.username.trim(),
      password: newUser.value.password,
      real_name: newUser.value.real_name.trim(),
      role: newUser.value.role,
      class_name: newUser.value.class_name.trim() || null,
      student_id: newUser.value.student_id.trim() || null,
      subject_ids: newUser.value.subject_ids,
    })
    showCreateUserModal.value = false
    await loadUsers()
    ElMessage.success('✅ 用户添加成功')
  } catch (e) { ElMessage.error('添加失败: ' + (e.response?.data?.detail || e.message)) }
}

// ── 反馈 ──
import request from '@/api/request'
const feedbacks = ref([])
const loadingFeedbacks = ref(false)
const feedbackCategory = ref('')
const categoryMap = { feature: '💡 功能建议', bug: '🐛 Bug反馈', experience: '💬 使用体验' }
async function loadFeedbacks() {
  loadingFeedbacks.value = true
  try {
    const params = { page_size: 100 }
    if (feedbackCategory.value) params.category = feedbackCategory.value
    const r = await request.get('/feedbacks', { params })
    feedbacks.value = r.data.items || []
  } catch { /* ignore */ } finally { loadingFeedbacks.value = false }
}

// ── 用户学科分配 ──
const showUserSubjectModal = ref(false)
const userSubjectIds = ref([])
const editingUserId = ref(null)
function editUserSubjects(u) { editingUserId.value = u.id; userSubjectIds.value = (u.subjects || []).map(s => s.id); showUserSubjectModal.value = true }
async function saveUserSubjects() {
  if (!editingUserId.value) return
  try { await usersAPI.updateUserSubjects(editingUserId.value, userSubjectIds.value); showUserSubjectModal.value = false; await loadUsers() }
  catch (e) { alert('保存失败: ' + (e.response?.data?.detail || e.message)) }
}

// ── 日志 ──
const showLogModal = ref(false); const logDocId = ref(null); const logContent = ref(''); const logStatus = ref(''); const logTimestamp = ref(''); const logBodyRef = ref(null); let logTimer = null
function viewLog(id) { logDocId.value = id; showLogModal.value = true; refreshLog(); if (logTimer) clearInterval(logTimer); logTimer = setInterval(refreshLog, 3000) }
function closeLog() { showLogModal.value = false; if (logTimer) { clearInterval(logTimer); logTimer = null } }
async function refreshLog() {
  if (!logDocId.value) return
  try { const d = await documentsAPI.getLog(logDocId.value); logContent.value = d.log || '暂无日志'; logTimestamp.value = d.updated_at || ''; logStatus.value = statusMap[d.status] || d.status; if (d.status === 'completed' || d.status === 'failed') { if (logTimer) { clearInterval(logTimer); logTimer = null } } }
  catch { logContent.value = '加载失败' }
  await nextTick()
  // Only auto-scroll if user is near the bottom (within 60px), otherwise they're reading history
  const el = logBodyRef.value
  if (el) {
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    if (atBottom) el.scrollTop = el.scrollHeight
  }
}
function copyLog() { if (logContent.value) navigator.clipboard.writeText(logContent.value).catch(() => {}) }

// ── 文档内容 ──
const showDocDetail = ref(false); const docDetailHtml = ref(''); const docDetailTitle = ref('')
async function viewDocument(docId) {
  showDocDetail.value = true; docDetailHtml.value = '<div style="text-align:center;padding:40px;color:#94a3b8;">⏳ 加载中...</div>'
  try { const d = await documentsAPI.get(docId); docDetailTitle.value = '《' + (d.filename || '文档' + docId) + '》' } catch {}
  try {
    const data = await documentsAPI.getParsed(docId)
    if (data.status === 'pending') { docDetailHtml.value = '<div style="color:#f59e0b;text-align:center;padding:40px;">⏳ 等待解析...</div>'; return }
    if (data.status === 'processing') { docDetailHtml.value = '<div style="color:#3b82f6;text-align:center;padding:40px;">🔄 解析中 ' + (data.progress||0) + '%...</div>'; setTimeout(() => viewDocument(docId), 5000); return }
    if (data.status === 'failed') { docDetailHtml.value = '<div style="color:#ef4444;text-align:center;padding:40px;">❌ 解析失败</div>'; return }
    let md = data.data?.markdown || ''
    if (md) {
      let html = md
      html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_,f) => { try { return katex.renderToString(f.trim(),{displayMode:true,throwOnError:false}) } catch { return _ } })
      html = html.replace(/\$([^\$]+?)\$/g, (_,f) => { try { return katex.renderToString(f.trim(),{displayMode:false,throwOnError:false}) } catch { return _ } })
      html = DOMPurify.sanitize(marked.parse(html))
      docDetailHtml.value = html
    } else { docDetailHtml.value = '<div style="color:#94a3b8;text-align:center;padding:40px;">📄 结果为空</div>' }
  } catch (e) { docDetailHtml.value = '<div style="color:#ef4444;text-align:center;padding:40px;">❌ ' + e.message + '</div>' }
}

// ── 系统概览 ──
const stats = ref({})
const loadingStats = ref(false)
async function loadStats() {
  if (!isAdmin.value) return
  loadingStats.value = true
  try { stats.value = await analyticsAPI.getDashboard() } catch {} finally { loadingStats.value = false }
}

function formatDate(iso) { return iso ? new Date(iso).toLocaleString('zh-CN') : '-' }

let statsTimer = null

onMounted(async () => {
  await Promise.all([
    loadSubjects(),
    loadDocuments(),
    isAdmin.value ? loadUsers() : Promise.resolve(),
    isAdmin.value ? loadStats() : Promise.resolve(),
    isAdmin.value ? loadFeedbacks() : Promise.resolve(),
  ])
  if (isAdmin.value) {
    statsTimer = setInterval(loadStats, 30000)
  }
})
onUnmounted(() => {
  if (logTimer) clearInterval(logTimer)
  if (statsTimer) clearInterval(statsTimer)
})
</script>

<style scoped>
.management-page { height: 100vh; display: flex; flex-direction: column; background: #f8fafc; overflow-y: auto; }

/* ── 内容区 ── */
.mgmt-body { flex: 1; padding: 24px 32px; max-width: 1000px; margin: 0 auto; width: 100%; }

/* stats row */
.stats-card { margin-bottom: 24px; }
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
.stat-item { text-align: center; padding: 20px 12px; background: #fff; border-radius: 12px; border: 1px solid #eef2f6; }
.stat-num { font-size: 32px; font-weight: 700; color: #3b82f6; line-height: 1.2; }
.stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }

/* ── 卡片 ── */
.card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 16px; color: #0b1e33; display: flex; align-items: center; gap: 8px; }
.card-title i { color: #3b82f6; }
.text-muted { color: #94a3b8; font-size: 13px; }
.muted { font-weight: 400; font-size: 13px; color: #94a3b8; }

/* subjects */
.subject-list { display: flex; flex-wrap: wrap; gap: 8px; }
.subject-item { display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 5px 14px; border-radius: 20px; font-size: 13px; }
.subject-item .del-btn { cursor: pointer; color: #94a3b8; font-size: 13px; margin-left: 2px; }
.subject-item .del-btn:hover { color: #ef4444; }
.add-row { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
.input-sm { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; width: 160px; font-family: inherit; }

/* filter bar */
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.search-input { padding: 7px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; width: 150px; font-family: inherit; }
.form-select { padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: inherit; background: #fff; }

/* buttons */
.btn { padding: 7px 18px; border-radius: 20px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; } .btn-primary:hover { background: #2563eb; }
.btn-success { background: #22c55e; color: #fff; } .btn-success:hover { background: #16a34a; }
.btn-warning { background: #f59e0b; color: #fff; } .btn-warning:hover { background: #d97706; }
.btn-danger { background: #ef4444; color: #fff; } .btn-danger:hover { background: #dc2626; }
.btn-outline { background: #fff; color: #475569; border: 1px solid #cbd5e1; } .btn-outline:hover { background: #f1f5f9; }
.btn-sm { padding: 5px 14px; font-size: 12px; }
.btn-xs { padding: 2px 8px; font-size: 11px; border-radius: 12px; }

.subject-tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 20px; font-size: 12px; margin: 2px 4px 2px 0; }

/* table */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 12px; color: #64748b; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.table-actions { white-space: nowrap; }
.table-actions .btn + .btn { margin-left: 6px; }

/* status */
.fb-tag { display: inline-block; font-size: 12px; padding: 2px 10px; border-radius: 20px; }
.fb-feature { background: #dbeafe; color: #1e40af; }
.fb-bug { background: #fee2e2; color: #991b1b; }
.fb-experience { background: #fef3c7; color: #92400e; }
.status-btn { cursor: pointer; font-size: 12px; font-weight: 500; padding: 3px 12px; border-radius: 20px; border: 1px solid transparent; font-family: inherit; display: inline-block; }
.status-btn:hover { opacity: 0.8; }
.status-pending { color: #92400e; background: #fef3c7; border-color: #f59e0b; }
.status-processing { color: #1e40af; background: #dbeafe; border-color: #3b82f6; animation: pulse 1.5s infinite; }
.status-completed { color: #166534; background: #dcfce7; border-color: #22c55e; }
.status-failed { color: #991b1b; background: #fee2e2; border-color: #ef4444; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

/* modals */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
.modal-overlay.active { display: flex; }
.modal-content { background: #fff; border-radius: 16px; padding: 24px; max-width: 480px; width: 90%; max-height: 80vh; overflow-y: auto; }
.modal-content h3 { margin: 0 0 16px; font-size: 16px; }
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.checkbox-group label { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: #f1f5f9; border-radius: 8px; cursor: pointer; font-size: 14px; }
.checkbox-group label:hover { background: #e2e8f0; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 12px; border-top: 1px solid #eef2f6; }
.form-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin-bottom: 12px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 13px; color: #475569; font-weight: 500; }
.form-field input, .form-field select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: inherit; }
.form-field input:focus, .form-field select:focus { outline: none; border-color: #3b82f6; }

.detail-modal { max-width: 1000px !important; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; }
.detail-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; border-radius: 16px 16px 0 0; }
.detail-header h3 { margin: 0; font-size: 17px; }
.detail-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.detail-footer { padding: 12px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right; flex-shrink: 0; border-radius: 0 0 16px 16px; }
.close-btn { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #1e293b; }

/* log viewer */
.log-viewer { background: #1e293b; border-radius: 16px; max-width: 1000px; width: 94%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
.log-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #0f172a; color: #e2e8f0; border-bottom: 1px solid #334155; }
.log-header h3 { margin: 0; font-size: 16px; color: #e2e8f0; }
.log-header .close-btn { color: #94a3b8; } .log-header .close-btn:hover { background: #334155; color: #f1f5f9; }
.log-body { padding: 16px 20px; overflow-y: auto; flex: 1; background: #0f172a; min-height: 200px; max-height: 55vh; }
.log-body pre { margin: 0; color: #e2e8f0; font-family: 'Consolas', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
.log-footer { padding: 10px 20px; background: #0f172a; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.log-status { color: #94a3b8; font-size: 13px; }
.log-actions { display: flex; gap: 8px; align-items: center; }
.log-timestamp { color: #64748b; font-size: 12px; }
.btn-refresh-log { background: #334155; border: none; color: #e2e8f0; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.btn-refresh-log:hover { background: #475569; }

.message { margin-top: 12px; padding: 10px 16px; border-radius: 12px; font-size: 14px; }
.message.error { background: #fee2e2; color: #b91c1c; }
.message.success { background: #dcfce7; color: #166534; }

.loading-spinner { text-align: center; padding: 24px; color: #3b82f6; font-size: 14px; }
.loading-spinner i { margin-right: 6px; }

@media (max-width: 768px) {
  .mgmt-body { padding: 16px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  /* 卡片标题：标题和按钮换行，不再挤一起 */
  .card { padding: 16px; }
  .card-title { flex-wrap: wrap; gap: 6px; }
  .card-title > [style*="margin-left:auto"] { margin-left: 0 !important; flex-basis: 100%; justify-content: flex-start; }
  /* 表格操作按钮换行 */
  .table-actions { white-space: normal; }
  .table-actions .btn { margin: 2px 0; }
}
</style>
