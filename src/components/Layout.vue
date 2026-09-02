<template>
  <div class="app-container">
    <!-- 左侧边栏：只有对话 -->
    <aside :class="['sidebar', { collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }]">
      <div class="sidebar-inner">
        <div class="conv-section">
          <div class="section-header">
            <div class="section-title"><i class="fas fa-microchip"></i> <span>答疑助手</span></div>
            <div class="header-actions">
              <button class="icon-btn" title="搜索对话"><i class="fas fa-search"></i></button>
              <button class="icon-btn" title="收起侧边栏" @click="toggleSidebar">
                <i :class="sidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"></i>
              </button>
            </div>
          </div>

          <div class="new-session-wrapper">
            <button class="new-session-btn" @click="newSession">
              <i class="fas fa-plus-circle"></i> <span>开启新对话</span>
            </button>
          </div>

          <!-- 对话列表 -->
          <div class="conv-list">
            <div
              v-for="conv in convStore.conversations"
              :key="conv.id"
              :class="['conv-item', { active: conv.id === convStore.activeId }]"
              @click="selectConversation(conv.id)"
            >
              <span class="conv-title">{{ conv.title }}</span>
              <button class="conv-del" @click.stop="convStore.deleteConversation(conv.id)" title="删除对话">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
            <div v-if="convStore.conversations.length === 0" class="conv-empty">暂无对话记录</div>
          </div>
        </div>

        <!-- 用户信息 -->
        <div class="user-profile">
          <div class="user-row">
            <div class="user-info-left">
              <div class="avatar">{{ userInitial }}</div>
              <div class="user-details">
                <div class="user-name">{{ authStore.user?.real_name || authStore.user?.username }}</div>
                <div class="info-row"><i class="fas fa-graduation-cap"></i> <span>{{ roleLabel }}</span></div>
                <div class="info-row"><i class="fas fa-id-card"></i> <span>{{ authStore.user?.student_id || authStore.user?.username }}</span></div>
              </div>
            </div>
            <button class="more-btn" @click="showDropdown = !showDropdown">
              <i class="fas fa-ellipsis-h"></i>
            </button>
          </div>
          <div :class="['dropdown-menu', { show: showDropdown }]">
            <div class="dropdown-item" @click="showFeedback = true; showDropdown = false">
              <i class="fas fa-comment-dots"></i> 反馈建议
            </div>
            <div class="dropdown-item logout" @click="handleLogout">
              <i class="fas fa-sign-out-alt"></i> 退出登录
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 悬浮按钮（侧栏收起时） -->
    <div :class="['floating-actions', { hidden: !sidebarCollapsed }]">
      <button class="floating-btn" @click="sidebarCollapsed = false"><i class="fas fa-chevron-right"></i></button>
      <button class="floating-btn" @click="newSession"><i class="fas fa-plus-circle"></i></button>
    </div>

    <!-- 移动端侧栏遮罩 -->
    <div v-if="mobileSidebarOpen" class="sidebar-backdrop" @click="mobileSidebarOpen = false"></div>

    <!-- 右侧主区域 -->
    <main class="main-area" :data-sidebar-collapsed="sidebarCollapsed">
      <div class="top-nav">
        <button class="hamburger" @click="mobileSidebarOpen = true"><i class="fas fa-bars"></i></button>
        <div class="top-nav-topic">
          <span>{{ pageTitle }}</span>
        </div>
        <div class="nav-buttons">
          <button class="nav-btn" @click="$router.push('/analytics')">
            <i class="fas fa-chart-line"></i> 学情分析
          </button>
          <button class="nav-btn" @click="$router.push('/exam')">
            <i class="fas fa-pen-fancy"></i> 测验
          </button>
          <button class="nav-btn" @click="$router.push('/messages')">
            <i class="fas fa-envelope"></i> 私信
            <span v-if="unread > 0" class="unread-dot">{{ unread > 99 ? '99+' : unread }}</span>
          </button>
          <button class="nav-btn" @click="$router.push('/discussion')">
            <i class="fas fa-users"></i> 讨论区
          </button>
          <button v-if="isTeacherOrAdmin" class="nav-btn" @click="$router.push('/admin')">
            <i class="fas fa-cog"></i> 管理
          </button>
        </div>
      </div>

      <div class="content-area">
        <router-view />
      </div>
    </main>

    <!-- 反馈建议弹窗 -->
    <FeedbackModal v-if="showFeedback" @close="showFeedback = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConversationsStore } from '@/stores/conversations'
import FeedbackModal from '@/components/FeedbackModal.vue'
import messagesAPI from '@/api/messages'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const convStore = useConversationsStore()

const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const showDropdown = ref(false)
const showFeedback = ref(false)
const unread = ref(0)

const userInitial = computed(() => {
  const name = authStore.user?.real_name || authStore.user?.username || '用'
  return name.charAt(0)
})

const roleLabel = computed(() => {
  const map = { admin: '管理员', teacher: '教师', student: '学生' }
  return map[authStore.user?.role] || '学生'
})

const isTeacherOrAdmin = computed(() => ['teacher', 'admin'].includes(authStore.user?.role))

const pageTitle = computed(() => {
  // On Q&A page, show conversation topic if available, otherwise empty
  if (route.path === '/') {
    const conv = convStore.activeConversation
    if (conv && conv.title !== '新对话') {
      return conv.title
    }
    return ''
  }
  const titles = {
    '/teacher/analytics': '班级学情',
    '/teacher/questions': '题库管理',
    '/teacher/exercises/upload': '习题上传',
    '/teacher/materials/upload': '教材上传',
    '/teacher/test-bank': '试题库管理',
    '/admin/test-bank': '试题库管理',
    '/admin/users': '用户管理',
    '/admin/knowledge-tree': '知识树管理',
    '/admin/knowledge-chunks': '知识库管理',
    '/admin/question-bank': '题库管理',
    '/admin/parse-review': '解析审核',
  }
  return titles[route.path] || '智能答疑助手'
})

function newSession() {
  if (route.path !== '/') {
    router.push('/')
    convStore.newConversation()
  } else {
    convStore.newConversation()
  }
  closeMobileSidebar()
}

function selectConversation(id) {
  convStore.selectConversation(id)
  closeMobileSidebar()
}

// 收起/展开侧栏：桌面端折叠宽度，移动端关闭抽屉
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    mobileSidebarOpen.value = false
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

function closeMobileSidebar() {
  if (window.innerWidth <= 768) {
    mobileSidebarOpen.value = false
  }
}

let unreadTimer = null

onMounted(() => {
  convStore.ensureActive()
  loadUnread()
  // 定时轮询未读数，新私信到达时红点自动更新，无需手动刷新
  unreadTimer = setInterval(loadUnread, 15000)
})

onUnmounted(() => {
  if (unreadTimer) clearInterval(unreadTimer)
})

async function loadUnread() {
  try {
    const r = await messagesAPI.unreadCount()
    unread.value = r.count || 0
  } catch {}
}

async function handleLogout() {
  showDropdown.value = false
  try { await authStore.logout() } catch {}
  router.push('/login')
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100%;
  position: relative;
}

/* ── 侧边栏 ── */
.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  overflow: hidden;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 0; min-width: 0; border-right: none; }

.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 16px;
  width: 280px;
}

.conv-section { flex: 1; overflow-y: auto; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  color: #475569;
  font-size: 14px;
}
.section-title { font-size: 17px; font-weight: 600; color: #0b1e33; }
.section-title i { margin-right: 8px; color: #3b82f6; }
.header-actions { display: flex; gap: 8px; }

.icon-btn {
  background: none; border: none; color: #64748b; cursor: pointer;
  font-size: 16px; width: 32px; height: 32px; border-radius: 6px;
  transition: all 0.2s;
  display: inline-flex; align-items: center; justify-content: center;
}
.icon-btn:hover { background: #f1f5f9; color: #0f172a; }

.new-session-wrapper { margin-bottom: 24px; }
.new-session-btn {
  width: 100%; background: #3b82f6; border: none; color: white;
  padding: 10px 12px; border-radius: 12px; font-weight: 500; font-size: 14px;
  font-family: 'Inter', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background 0.2s;
}
.new-session-btn:hover { background: #2563eb; }

.conv-list { display: flex; flex-direction: column; gap: 2px; }
.conv-item {
  display: flex; align-items: center; padding: 10px 12px; border-radius: 10px;
  cursor: pointer; transition: background 0.15s; gap: 8px;
}
.conv-item:hover { background: #f1f5f9; }
.conv-item.active { background: #eef2ff; }
.conv-title {
  flex: 1; font-size: 14px; color: #334155; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.conv-item.active .conv-title { color: #3b82f6; font-weight: 500; }
.conv-del {
  opacity: 0; background: none; border: none; color: #94a3b8;
  cursor: pointer; font-size: 12px; padding: 4px; border-radius: 6px;
  transition: all 0.15s;
}
.conv-item:hover .conv-del { opacity: 1; }
.conv-del:hover { background: #fee2e2; color: #ef4444; }
.conv-empty { text-align: center; color: #94a3b8; font-size: 13px; padding: 20px 0; }

/* ── 用户资料 ── */
.user-profile { margin-top: auto; padding-top: 16px; position: relative; }
.user-row { display: flex; justify-content: space-between; align-items: flex-start; }
.user-info-left { display: flex; gap: 12px; }
.avatar {
  width: 44px; height: 44px; background: #3b82f6; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 18px; color: white; flex-shrink: 0;
}
.user-details { font-size: 12px; color: #475569; }
.user-name { font-weight: 600; color: #0f172a; margin-bottom: 4px; }
.info-row { margin-top: 4px; display: flex; align-items: center; gap: 6px; }

.more-btn {
  background: none; border: none; color: #64748b; cursor: pointer;
  width: 32px; height: 32px; border-radius: 6px; font-size: 16px;
  display: inline-flex; align-items: center; justify-content: center;
}
.more-btn:hover { background: #f1f5f9; color: #0f172a; }

.dropdown-menu {
  position: absolute; bottom: 100%; right: 0;
  background: #ffffff; border-radius: 12px; width: 180px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12); border: 1px solid #e2e8f0;
  display: none; z-index: 300; margin-bottom: 8px; padding: 4px 0;
}
.dropdown-menu.show { display: block; }
.dropdown-item {
  padding: 10px 16px; font-size: 14px; cursor: pointer; transition: background 0.2s;
  color: #1e293b; display: flex; align-items: center; gap: 8px;
}
.dropdown-item:hover { background: #f1f5f9; }
.dropdown-item.logout { color: #ef4444; }
.dropdown-item.logout:hover { background: #fee2e2; }

/* ── 悬浮按钮 ── */
.floating-actions {
  position: fixed; left: 16px; top: 50%; transform: translateY(-50%);
  background: #ffffff; border-radius: 40px; padding: 12px 8px;
  display: flex; flex-direction: column; gap: 16px; z-index: 200;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
}
.floating-actions.hidden { display: none; }
.floating-btn {
  background: none; border: none; color: #475569; font-size: 20px;
  cursor: pointer; padding: 6px; border-radius: 50%; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
}
.floating-btn:hover { background: #e2e8f0; color: #0f172a; }

/* ── 主区域 ── */
.main-area {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; background: #ffffff; position: relative;
  --sidebar-width: 280px;
}
.main-area[data-sidebar-collapsed="true"] { --sidebar-width: 0px; }

.top-nav {
  position: relative;
  display: flex; align-items: center;
  min-height: 64px; padding: 0 32px;
  background: #ffffff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.top-nav-topic {
  font-weight: 500; font-size: 20px; color: #0f172a;
  display: flex; align-items: center; gap: 8px;
}

.nav-buttons { position: absolute; right: 32px; top: 50%; transform: translateY(-50%); display: flex; gap: 8px; z-index: 1; }
.nav-btn {
  background: #ffffff; border: 1px solid #cbd5e1; color: #334155;
  padding: 7px 16px; border-radius: 20px; cursor: pointer; font-size: 14px;
  line-height: 1.4; height: 36px;
  font-family: inherit; transition: all 0.2s; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 6px;
}
.nav-btn:hover { background: #f1f5f9; border-color: #94a3b8; color: #0f172a; }
.nav-btn:hover { background: #f1f5f9; border-color: #94a3b8; color: #0f172a; }

.content-area {
  flex: 1; overflow: hidden; display: flex; flex-direction: column;
}

/* 汉堡按钮：仅移动端显示 */
.hamburger { display: none; }

@media (max-width: 768px) {
  /* 主区域占满全宽（侧栏变抽屉后，--sidebar-width 归零） */
  .main-area { --sidebar-width: 0px; }

  /* 侧栏变抽屉 */
  .sidebar, .sidebar.collapsed {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: 280px; min-width: 280px;
    border-right: 1px solid #e2e8f0;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: 2px 0 12px rgba(0,0,0,0.15);
    z-index: 400;
  }
  .sidebar.mobile-open { transform: translateX(0); }
  .sidebar-backdrop {
    position: fixed; inset: 0; background: rgba(15,23,42,0.4); z-index: 350;
  }
  .hamburger {
    display: inline-flex; align-items: center; justify-content: center;
    background: none; border: none; color: #334155; cursor: pointer;
    width: 36px; height: 36px; border-radius: 8px; font-size: 18px; flex-shrink: 0;
  }
  .hamburger:hover { background: #f1f5f9; }
  .top-nav { padding: 10px 12px; min-height: 52px; flex-wrap: wrap; gap: 6px; }
  .top-nav-topic { font-size: 15px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-buttons { position: static; transform: none; display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
  .nav-btn { padding: 5px 12px; font-size: 13px; height: 32px; }
  .floating-actions { display: none; }
}

.unread-dot {
  background: #ef4444; color: #fff; font-size: 11px; line-height: 1;
  padding: 2px 5px; border-radius: 10px; margin-left: 2px;
}
</style>
