<template>
  <div class="admin-page">
    <!-- ===== 用户信息卡片 ===== -->
    <div class="card">
      <div class="card-title"><i class="fas fa-user-circle"></i> 我的信息</div>
      <div class="info-grid">
        <div class="info-item" v-for="f in myInfoFields" :key="f.label">
          <span class="label">{{ f.label }}</span>
          <span class="value">{{ f.value }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 学科管理（管理员） ===== -->
    <div class="card" v-if="isAdmin">
      <div class="card-title">
        <i class="fas fa-book"></i> 学科管理
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" @click="showAddSubject = true">
            <i class="fas fa-plus"></i> 添加学科
          </button>
          <span style="font-size:11px;font-weight:400;color:#94a3b8;">管理员可添加/删除学科</span>
        </div>
      </div>
      <div class="subject-list" v-if="subjects.length">
        <div class="subject-item" v-for="s in subjects" :key="s.id">
          <span>📚 {{ s.name }}</span>
          <span class="del-btn" @click="deleteSubject(s.id)" title="删除学科"><i class="fas fa-times"></i></span>
        </div>
      </div>
      <span class="text-muted" v-else>暂无学科，请添加</span>
      <div v-if="showAddSubject" class="add-subject-form">
        <input v-model="newSubjectName" placeholder="输入学科名称" @keydown.enter="createSubject" ref="subjectInput" />
        <button class="btn btn-success btn-sm" @click="createSubject"><i class="fas fa-check"></i> 确认</button>
        <button class="btn btn-outline btn-sm" @click="showAddSubject = false; newSubjectName = ''">取消</button>
      </div>
    </div>

    <!-- ===== 教材管理（教师/管理员） ===== -->
    <div class="card" v-if="isTeacherOrAdmin">
      <div class="card-title">
        <i class="fas fa-file-pdf"></i> 教材管理
        <div class="card-actions">
          <div class="file-input-wrapper">
            <input type="file" ref="pdfInput" accept=".pdf" style="font-size:12px;">
            <button class="btn btn-primary btn-sm" @click="uploadDocument"><i class="fas fa-upload"></i> 上传</button>
          </div>
        </div>
      </div>
      <div class="filter-bar">
        <div class="filter-group">
          <label>📚 学科</label>
          <select v-model="docSubjectFilter" @change="loadDocuments" class="form-select">
            <option value="">全部学科</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <button class="btn btn-outline btn-sm" @click="loadDocuments"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
      <div v-if="documents.length">
        <table>
          <thead>
            <tr><th>ID</th><th>文件名</th><th>页数</th><th>学科</th><th>状态</th><th>操作</th><th>上传时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in documents" :key="d.id">
              <td>{{ d.id }}</td>
              <td>{{ d.filename }}</td>
              <td>{{ d.total_pages || '-' }}</td>
              <td>
                <span class="subject-tag" v-for="s in (d.subjects || [])" :key="s.id">{{ s.name }}</span>
                <span v-if="!d.subjects?.length" style="color:#94a3b8;font-size:12px;">未分配</span>
                <button class="btn btn-outline btn-xs" @click="editDocSubjects(d)" title="编辑学科">
                  <i class="fas fa-edit"></i>
                </button>
              </td>
              <td>
                <button :class="['status-btn', 'status-' + d.status]" @click="viewLog(d.id)">
                  {{ statusMap[d.status] || d.status }}
                </button>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-primary btn-sm" @click="viewDocument(d.id)"><i class="fas fa-file-alt"></i> 查看</button>
                  <button class="btn btn-danger btn-sm" @click="deleteDoc(d.id)"><i class="fas fa-trash"></i> 删除</button>
                </div>
              </td>
              <td>{{ formatDate(d.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="text-muted" v-else>暂无文档</div>
    </div>

    <!-- ===== 用户管理（管理员） ===== -->
    <div class="card" v-if="isAdmin">
      <div class="card-title">
        <i class="fas fa-users"></i> 用户列表
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" @click="openCreateUser"><i class="fas fa-user-plus"></i> 添加用户</button>
          <div class="file-input-wrapper">
            <input type="file" ref="csvInput" accept=".csv,.xlsx" style="font-size:12px;">
            <button class="btn btn-success btn-sm" @click="importUsers"><i class="fas fa-upload"></i> 导入</button>
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>🔍</label>
          <input type="text" v-model="searchText" placeholder="搜索姓名/学号" class="search-input" @keydown.enter="loadUsers" />
        </div>
        <div class="filter-group">
          <label>身份</label>
          <select v-model="roleFilter" @change="loadUsers" class="form-select">
            <option value="">全部</option>
            <option value="student">学生</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div class="filter-group">
          <label>学科</label>
          <select v-model="userSubjectFilter" @change="loadUsers" class="form-select">
            <option value="">全部学科</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>班级</label>
          <select v-model="classFilter" @change="loadUsers" class="form-select">
            <option value="">全部班级</option>
            <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" @click="loadUsers"><i class="fas fa-search"></i> 筛选</button>
        <button class="btn btn-outline btn-sm" @click="resetFilters">重置</button>
      </div>

      <div :class="['message', importResult.type]" v-if="importResult.show" v-html="importResult.msg"></div>

      <div v-if="users.length">
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
                <button class="btn btn-outline btn-xs" @click="editUserSubjects(u)" title="编辑学科">
                  <i class="fas fa-edit"></i>
                </button>
              </td>
              <td>{{ u.is_active ? '✅ 启用' : '❌ 禁用' }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-outline btn-sm" @click="$router.push(`/messages/${u.id}`)"><i class="fas fa-envelope"></i> 私信</button>
                  <button class="btn btn-warning btn-sm" @click="resetPassword(u.id)">重置密码</button>
                  <button class="btn btn-danger btn-sm" @click="deleteUser(u.id)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="text-muted" v-else>暂无用户</div>
      <div class="text-muted mt-16">支持 .csv 或 .xlsx · 必填列：姓名、学号；班级、学科可选</div>
    </div>

    <!-- ===== 学科分配弹窗（文档） ===== -->
    <div :class="['modal-overlay', { active: showDocSubjectModal }]" @click.self="showDocSubjectModal = false">
      <div class="modal-content">
        <h3><i class="fas fa-tags"></i> 为教材选择学科</h3>
        <p class="modal-desc">选择该教材所属的学科（可多选）</p>
        <div class="checkbox-group">
          <label v-for="s in subjects" :key="'doc' + s.id">
            <input type="checkbox" :value="s.id" v-model="docSubjectIds" /> {{ s.name }}
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showDocSubjectModal = false">取消</button>
          <button class="btn btn-primary" @click="saveDocSubjects"><i class="fas fa-save"></i> 保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 学科分配弹窗（用户） ===== -->
    <div :class="['modal-overlay', { active: showUserSubjectModal }]" @click.self="showUserSubjectModal = false">
      <div class="modal-content">
        <h3><i class="fas fa-tags"></i> 为用户分配学科</h3>
        <p class="modal-desc">选择该用户所属的学科（可多选）</p>
        <div class="checkbox-group">
          <label v-for="s in subjects" :key="'user' + s.id">
            <input type="checkbox" :value="s.id" v-model="userSubjectIds" /> {{ s.name }}
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showUserSubjectModal = false">取消</button>
          <button class="btn btn-primary" @click="saveUserSubjects"><i class="fas fa-save"></i> 保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 添加用户弹窗 ===== -->
    <div :class="['modal-overlay', { active: showCreateUserModal }]" @click.self="showCreateUserModal = false">
      <div class="modal-content">
        <h3><i class="fas fa-user-plus"></i> 添加用户</h3>
        <p class="modal-desc">手动输入信息创建账号（管理员）</p>
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
        <div class="form-field" style="margin-top:12px;">
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

    <!-- ===== 日志查看弹窗 ===== -->
    <div :class="['modal-overlay', { active: showLogModal }]" style="background:rgba(0,0,0,0.6);" @click.self="closeLog">
      <div class="log-viewer">
        <div class="log-header">
          <h3><i class="fas fa-terminal"></i> MinerU 解析日志 <span style="font-weight:400;font-size:13px;color:#94a3b8;">(文档 ID: {{ logDocId }})</span></h3>
          <button class="close-btn" @click="closeLog"><i class="fas fa-times"></i></button>
        </div>
        <div class="log-body">
          <pre>{{ logContent || '加载中...' }}</pre>
        </div>
        <div class="log-footer">
          <span class="log-status">状态: <span>{{ logStatus || '⏳ 加载中' }}</span></span>
          <div class="log-actions">
            <span class="log-timestamp" v-if="logTimestamp">最后更新: {{ logTimestamp }}</span>
            <button class="btn-refresh-log" @click="refreshLog"><i class="fas fa-sync-alt"></i> 刷新</button>
            <button class="btn-refresh-log" @click="copyLog"><i class="fas fa-copy"></i> 复制</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 文档内容查看弹窗 ===== -->
    <div :class="['modal-overlay', { active: showDocDetail }]" style="background:rgba(0,0,0,0.6);" @click.self="showDocDetail = false">
      <div class="modal-content" style="max-width:900px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;padding:0;">
        <div class="detail-header">
          <h3><i class="fas fa-file-alt"></i> 解析内容 <span style="font-weight:400;font-size:14px;color:#94a3b8;">{{ docDetailTitle }}</span></h3>
          <button class="close-btn" @click="showDocDetail = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="detail-body">
          <div class="md-content" v-html="docDetailHtml"></div>
        </div>
        <div class="detail-footer">
          <button class="btn btn-primary" @click="showDocDetail = false">关闭</button>
        </div>
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
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const authStore = useAuthStore()

// ── 角色 ──
const isAdmin = computed(() => authStore.user?.role === 'admin')
const isTeacherOrAdmin = computed(() => ['teacher', 'admin'].includes(authStore.user?.role))
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' }
const statusMap = { pending: '⏳ 等待中', processing: '🔄 处理中', completed: '✅ 已完成', failed: '❌ 失败' }

// ── 我的信息 ──
const myInfoFields = computed(() => {
  const u = authStore.user || {}
  return [
    { label: 'ID', value: u.id },
    { label: '用户名', value: u.username },
    { label: '真实姓名', value: u.real_name || '-' },
    { label: '身份', value: roleMap[u.role] || u.role },
    { label: '班级', value: u.class_name || '-' },
    { label: '学号', value: u.student_id || '-' },
    { label: '状态', value: u.is_active ? '✅ 启用' : '❌ 禁用' },
  ]
})

// ── 学科管理 ──
const subjects = ref([])
const showAddSubject = ref(false)
const newSubjectName = ref('')

async function loadSubjects() {
  try { subjects.value = await subjectsAPI.list() } catch { /* ignore */ }
}

async function createSubject() {
  const name = newSubjectName.value.trim()
  if (!name) return
  try {
    await subjectsAPI.create(name)
    newSubjectName.value = ''
    showAddSubject.value = false
    await loadSubjects()
    alert('✅ 学科添加成功')
  } catch (e) {
    alert('添加失败: ' + (e.response?.data?.detail || e.message))
  }
}

async function deleteSubject(id) {
  if (!confirm('确定要删除该学科吗？')) return
  try {
    await subjectsAPI.delete(id)
    await loadSubjects()
    await loadDocuments()
    alert('✅ 学科已删除')
  } catch (e) {
    alert('删除失败: ' + (e.response?.data?.detail || e.message))
  }
}

// ── 文档管理 ──
const documents = ref([])
const docSubjectFilter = ref('')
const pdfInput = ref(null)

async function loadDocuments() {
  try {
    const params = {}
    if (docSubjectFilter.value) params.subject_id = docSubjectFilter.value
    documents.value = await documentsAPI.list(params)
    // Check for processing docs
    const hasProcessing = documents.value.some(d => d.status === 'processing')
    if (hasProcessing) setTimeout(loadDocuments, 3000)
  } catch { /* ignore */ }
}

async function uploadDocument() {
  const file = pdfInput.value?.files?.[0]
  if (!file) { alert('请选择PDF文件'); return }
  const fd = new FormData()
  fd.append('file', file)
  try {
    const data = await documentsAPI.upload(fd)
    alert('文档上传成功！正在后台处理...\n文档ID: ' + data.id)
    await loadDocuments()
    pdfInput.value.value = ''
  } catch (e) {
    alert('上传失败: ' + (e.response?.data?.detail || e.message))
  }
}

async function deleteDoc(id) {
  if (!confirm('确定删除该文档及其所有解析数据吗？')) return
  try {
    await documentsAPI.delete(id)
    await loadDocuments()
    if (logDocId.value === id) closeLog()
    alert('✅ 删除成功')
  } catch (e) {
    alert('删除失败: ' + (e.response?.data?.detail || e.message))
  }
}

// ── 文档学科分配 ──
const showDocSubjectModal = ref(false)
const docSubjectIds = ref([])
const editingDocId = ref(null)

async function editDocSubjects(doc) {
  editingDocId.value = doc.id
  try {
    const subs = await documentsAPI.getDocumentSubjects(doc.id)
    docSubjectIds.value = (subs || []).map(s => s.id)
  } catch {
    docSubjectIds.value = []
  }
  showDocSubjectModal.value = true
}

async function saveDocSubjects() {
  if (!editingDocId.value) return
  try {
    await documentsAPI.updateDocumentSubjects(editingDocId.value, docSubjectIds.value)
    showDocSubjectModal.value = false
    await loadDocuments()
    alert('✅ 学科分配成功')
  } catch (e) {
    alert('保存失败: ' + (e.response?.data?.detail || e.message))
  }
}

// ── 用户管理 ──
const users = ref([])
const classes = ref([])
const searchText = ref('')
const roleFilter = ref('')
const userSubjectFilter = ref('')
const classFilter = ref('')
const importResult = ref({ show: false, type: 'success', msg: '' })
const csvInput = ref(null)

async function loadUsers() {
  try {
    const params = { page_size: 100 }
    if (searchText.value) params.search = searchText.value
    if (roleFilter.value) params.role = roleFilter.value
    if (userSubjectFilter.value) params.subject_id = userSubjectFilter.value
    if (classFilter.value) params.class_name = classFilter.value
    const data = await usersAPI.list(params)
    users.value = data.items || []
  } catch { /* ignore */ }
}

async function loadClasses() {
  try { classes.value = await usersAPI.getClasses() } catch { /* ignore */ }
}

function resetFilters() {
  searchText.value = ''
  roleFilter.value = ''
  userSubjectFilter.value = ''
  classFilter.value = ''
  loadUsers()
}

// ── 手动添加用户 ──
const showCreateUserModal = ref(false)
const newUser = ref({ username: '', password: '123456', real_name: '', role: 'student', class_name: '', student_id: '', subject_ids: [] })

function openCreateUser() {
  newUser.value = { username: '', password: '123456', real_name: '', role: 'student', class_name: '', student_id: '', subject_ids: [] }
  showCreateUserModal.value = true
}

async function createUser() {
  if (!newUser.value.username.trim()) { alert('请输入用户名'); return }
  if (!newUser.value.password || newUser.value.password.length < 6) { alert('密码至少 6 位'); return }
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
    await loadClasses()
    alert('✅ 用户添加成功')
  } catch (e) {
    alert('添加失败: ' + (e.response?.data?.detail || e.message))
  }
}

async function importUsers() {
  const file = csvInput.value?.files?.[0]
  importResult.value = { show: false, type: 'success', msg: '' }
  if (!file) {
    importResult.value = { show: true, type: 'error', msg: '请选择文件' }
    return
  }
  const fd = new FormData()
  fd.append('file', file)
  try {
    const data = await usersAPI.importExcel(fd)
    let msg = `✅ 创建 ${data.created || data.success} 个用户。`
    if (data.errors?.length) msg += '<br>⚠️ 错误：' + data.errors.join('；')
    importResult.value = { show: true, type: 'success', msg }
    await loadUsers()
    csvInput.value.value = ''
  } catch (e) {
    importResult.value = { show: true, type: 'error', msg: '导入失败：' + (e.response?.data?.detail || e.message) }
  }
}

async function deleteUser(id) {
  if (!confirm('确定删除该用户吗？')) return
  try {
    await usersAPI.delete(id)
    alert('✅ 删除成功')
    await loadUsers()
  } catch (e) {
    alert('删除失败: ' + (e.response?.data?.detail || e.message))
  }
}

async function resetPassword(id) {
  if (!confirm('确认将该用户的密码重置为学号吗？')) return
  try {
    const data = await usersAPI.resetPassword(id)
    alert(data.message || '✅ 密码已重置')
  } catch (e) {
    alert('重置失败: ' + (e.response?.data?.detail || e.message))
  }
}

// ── 用户学科分配 ──
const showUserSubjectModal = ref(false)
const userSubjectIds = ref([])
const editingUserId = ref(null)

function editUserSubjects(u) {
  editingUserId.value = u.id
  userSubjectIds.value = (u.subjects || []).map(s => s.id)
  showUserSubjectModal.value = true
}

async function saveUserSubjects() {
  if (!editingUserId.value) return
  try {
    await usersAPI.updateUserSubjects(editingUserId.value, userSubjectIds.value)
    showUserSubjectModal.value = false
    await loadUsers()
    alert('✅ 用户学科分配成功')
  } catch (e) {
    alert('保存失败: ' + (e.response?.data?.detail || e.message))
  }
}

// ── 日志查看 ──
const showLogModal = ref(false)
const logDocId = ref(null)
const logContent = ref('')
const logStatus = ref('')
const logTimestamp = ref('')
let logTimer = null

function viewLog(docId) {
  logDocId.value = docId
  showLogModal.value = true
  refreshLog()
  if (logTimer) clearInterval(logTimer)
  logTimer = setInterval(refreshLog, 5000)
}

function closeLog() {
  showLogModal.value = false
  if (logTimer) { clearInterval(logTimer); logTimer = null }
}

async function refreshLog() {
  if (!logDocId.value) return
  try {
    const data = await documentsAPI.getLog(logDocId.value)
    logContent.value = data.log || '暂无日志输出'
    logTimestamp.value = data.updated_at || ''
    logStatus.value = statusMap[data.status] || data.status
    if (data.status === 'completed' || data.status === 'failed') {
      if (logTimer) { clearInterval(logTimer); logTimer = null }
    }
  } catch {
    logContent.value = '加载日志失败'
  }
}

function copyLog() {
  if (logContent.value) {
    navigator.clipboard.writeText(logContent.value).then(() => alert('日志已复制')).catch(() => alert('复制失败'))
  }
}

// ── 文档内容查看 ──
const showDocDetail = ref(false)
const docDetailHtml = ref('')
const docDetailTitle = ref('')

async function viewDocument(docId) {
  showDocDetail.value = true
  docDetailHtml.value = '<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> 加载解析结果...</div>'
  try {
    const docData = await documentsAPI.get(docId)
    docDetailTitle.value = '《' + (docData.filename || '文档' + docId) + '》'
  } catch { /* ignore */ }

  try {
    const data = await documentsAPI.getParsed(docId)
    if (data.status === 'pending') {
      docDetailHtml.value = '<div style="color:#f59e0b;text-align:center;padding:40px 0;">⏳ 文档等待解析中...</div>'
      return
    }
    if (data.status === 'processing') {
      docDetailHtml.value = `<div style="color:#3b82f6;text-align:center;padding:40px 0;">🔄 文档解析中 ${data.progress || 0}%...</div>`
      setTimeout(() => viewDocument(docId), 5000)
      return
    }
    if (data.status === 'failed') {
      docDetailHtml.value = '<div style="color:#ef4444;text-align:center;padding:40px 0;">❌ 文档解析失败，请查看日志</div>'
      return
    }
    let markdown = data.data?.markdown || ''
    if (!markdown) {
      docDetailHtml.value = '<div style="color:#94a3b8;text-align:center;padding:40px 0;">📄 解析结果为空</div>'
      return
    }
    const html = marked.parse(markdown)
    docDetailHtml.value = DOMPurify.sanitize(html)
  } catch (e) {
    docDetailHtml.value = '<div style="color:#ef4444;text-align:center;padding:40px 0;">❌ 加载失败: ' + e.message + '</div>'
  }
}

// ── 工具 ──
function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

let refreshTimer = null

onMounted(async () => {
  await loadSubjects()
  await loadDocuments()
  if (isAdmin.value) {
    await loadClasses()
    await loadUsers()
  }
})

onUnmounted(() => {
  if (logTimer) clearInterval(logTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.admin-page {
  padding: 20px 24px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-y: auto;
  height: 100%;
}

/* ── 卡片 ── */
.card { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #eef2f6; }
.card-title { font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #0b1e33; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.card-title i { color: #3b82f6; }
.card-title .card-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.card-actions .file-input-wrapper { display: flex; align-items: center; gap: 6px; }
.text-muted { color: #94a3b8; font-size: 13px; }
.mt-16 { margin-top: 16px; }

/* ── 信息网格 ── */
.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 20px; }
.info-item .label { font-size: 12px; font-weight: 500; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
.info-item .value { font-size: 15px; font-weight: 500; color: #0b1e33; margin-top: 2px; word-break: break-all; }

/* ── 筛选栏 ── */
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #eef2f6; margin-bottom: 12px; }
.filter-bar label { font-size: 13px; color: #475569; font-weight: 500; }
.filter-bar .filter-group { display: flex; align-items: center; gap: 6px; }
.search-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; width: 160px; font-family: 'Inter', sans-serif; }

/* ── 学科列表 ── */
.subject-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.subject-item { display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 4px 12px 4px 16px; border-radius: 20px; font-size: 13px; }
.subject-item .del-btn { cursor: pointer; color: #94a3b8; font-size: 14px; }
.subject-item .del-btn:hover { color: #ef4444; }
.add-subject-form { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
.add-subject-form input { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; flex: 1; max-width: 200px; font-family: 'Inter', sans-serif; }
.add-subject-form input:focus { outline: none; border-color: #3b82f6; }

.subject-tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 12px; border-radius: 20px; font-size: 12px; margin: 2px 4px 2px 0; }

/* ── 操作按钮 ── */
.action-buttons { display: flex; gap: 6px; flex-wrap: wrap; }

/* ── 状态按钮 ── */
.status-btn { background: none; border: 1px solid transparent; cursor: pointer; font-size: 13px; font-weight: 500; padding: 4px 14px; border-radius: 20px; transition: all 0.2s; font-family: inherit; }
.status-btn:hover { transform: scale(0.95); opacity: 0.8; }
.status-pending { color: #92400e; background: #fef3c7; border-color: #f59e0b; }
.status-processing { color: #1e40af; background: #dbeafe; border-color: #3b82f6; animation: pulse-bg 1.5s infinite; }
.status-completed { color: #166534; background: #dcfce7; border-color: #22c55e; }
.status-failed { color: #991b1b; background: #fee2e2; border-color: #ef4444; }
@keyframes pulse-bg { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

/* ── 弹窗 ── */
.modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
.modal-overlay.active { display: flex; }
.modal-content { background: white; border-radius: 16px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
.modal-content h3 { margin-top: 0; margin-bottom: 16px; font-size: 16px; }
.modal-content .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.modal-content .checkbox-group label { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: #f1f5f9; border-radius: 8px; cursor: pointer; font-size: 14px; }
.modal-content .checkbox-group label:hover { background: #e2e8f0; }
.modal-content .checkbox-group label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
.modal-content .modal-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 12px; border-top: 1px solid #eef2f6; }
.modal-desc { color: #64748b; font-size: 14px; margin-bottom: 16px; }
.form-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin-bottom: 4px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 13px; color: #475569; font-weight: 500; }
.form-field input, .form-field select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-family: inherit; }
.form-field input:focus, .form-field select:focus { outline: none; border-color: #3b82f6; }

/* ── 日志查看器 ── */
.log-viewer { background: #1e293b; border-radius: 16px; max-width: 900px; width: 92%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
.log-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #0f172a; color: #e2e8f0; border-bottom: 1px solid #334155; }
.log-header h3 { margin: 0; font-size: 16px; }
.log-header .close-btn { background: none; border: none; color: #94a3b8; font-size: 22px; cursor: pointer; padding: 4px 10px; border-radius: 6px; }
.log-header .close-btn:hover { background: #334155; color: #f1f5f9; }
.log-body { padding: 16px 20px; overflow-y: auto; flex: 1; background: #0f172a; min-height: 200px; max-height: 55vh; }
.log-body pre { margin: 0; color: #e2e8f0; font-family: 'Consolas', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
.log-footer { padding: 10px 20px; background: #0f172a; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.log-status { color: #94a3b8; font-size: 13px; }
.log-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.log-timestamp { color: #64748b; font-size: 12px; }
.btn-refresh-log { background: #334155; border: none; color: #e2e8f0; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.btn-refresh-log:hover { background: #475569; }

/* ── 文档详情弹窗 ── */
.detail-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.detail-header h3 { margin: 0; font-size: 18px; }
.detail-header .close-btn { background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer; padding: 4px 10px; border-radius: 6px; }
.detail-header .close-btn:hover { background: #f1f5f9; color: #1e293b; }
.detail-body { padding: 20px 24px; overflow-y: auto; flex: 1; background: white; }
.detail-footer { padding: 12px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right; flex-shrink: 0; }

/* ── 消息 ── */
.message { margin-top: 12px; padding: 10px 16px; border-radius: 12px; font-size: 14px; }
.message.error { background: #fee2e2; color: #b91c1c; }
.message.success { background: #dcfce7; color: #166534; }

@media (max-width: 768px) { .info-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .info-grid { grid-template-columns: 1fr; } }
</style>
