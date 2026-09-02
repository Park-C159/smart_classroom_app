<template>
  <header class="sa-header">
    <div class="sa-header-inner">
      <button class="nav-btn back-btn" @click="$router.push('/')">
        <i class="fas fa-arrow-left"></i> 答疑
      </button>
      <div class="sa-header-center">
        <h1><i :class="icon"></i> {{ title }}</h1>
      </div>
      <div class="nav-buttons">
        <button class="nav-btn" :class="{ current: $route.path === '/analytics' }" @click="$router.push('/analytics')">
          <i class="fas fa-chart-line"></i> 学情分析
        </button>
        <button class="nav-btn" :class="{ current: $route.path === '/exam' }" @click="$router.push('/exam')">
          <i class="fas fa-pen-fancy"></i> 测验
        </button>
        <button class="nav-btn" :class="{ current: $route.path.startsWith('/messages') }" @click="$router.push('/messages')">
          <i class="fas fa-envelope"></i> 私信
          <span v-if="unread > 0" class="unread-dot">{{ unread > 99 ? '99+' : unread }}</span>
        </button>
        <button class="nav-btn" :class="{ current: $route.path.startsWith('/discussion') }" @click="$router.push('/discussion')">
          <i class="fas fa-users"></i> 讨论区
        </button>
        <button v-if="isTeacherOrAdmin" class="nav-btn" :class="{ current: $route.path === '/admin' }" @click="$router.push('/admin')">
          <i class="fas fa-cog"></i> 管理
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import messagesAPI from '@/api/messages'

defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'fas fa-file-alt' },
})

const route = useRoute()
const authStore = useAuthStore()

const isTeacherOrAdmin = computed(() => ['teacher', 'admin'].includes(authStore.user?.role))
const unread = ref(0)
let unreadTimer = null

async function loadUnread() {
  try {
    const r = await messagesAPI.unreadCount()
    unread.value = r.count || 0
  } catch {}
}

onMounted(() => {
  loadUnread()
  // 定时轮询未读数，新私信到达时红点自动更新
  unreadTimer = setInterval(loadUnread, 15000)
})

onUnmounted(() => {
  if (unreadTimer) clearInterval(unreadTimer)
})
</script>

<style scoped>
.sa-header {
  background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; position: relative;
}
.sa-header-inner {
  height: 64px; display: flex; align-items: center; justify-content: center;
}
.back-btn { position: absolute; left: 32px; top: 50%; transform: translateY(-50%); z-index: 1; }
.sa-header-center {
  width: 100%; max-width: 1000px; padding: 0 32px;
}
.sa-header-center h1 {
  font-size: 20px; font-weight: 600; color: #0b1e33; margin: 0;
  display: flex; align-items: center; gap: 8px;
}
.sa-header-center h1 i { color: #3b82f6; }

.nav-buttons { position: absolute; right: 32px; top: 50%; transform: translateY(-50%); display: flex; gap: 8px; z-index: 1; }
.nav-btn {
  background: #ffffff; border: 1px solid #cbd5e1; color: #334155;
  padding: 7px 16px; border-radius: 20px; cursor: pointer; font-size: 14px;
  line-height: 1.4; height: 36px;
  font-family: inherit; transition: all 0.2s; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 6px;
}
.nav-btn:hover { background: #f1f5f9; border-color: #94a3b8; color: #0f172a; }
.nav-btn.current { background: #eef2ff; border-color: #3b82f6; color: #3b82f6; }
@media (max-width: 768px) {
  .sa-header-inner { padding: 8px 12px; height: auto; flex-wrap: wrap; gap: 8px; justify-content: flex-start; }
  .back-btn { position: static; transform: none; }
  .sa-header-center { width: auto; flex: 1; padding: 0; min-width: 0; }
  .sa-header-center h1 { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nav-buttons { position: static; transform: none; flex-wrap: wrap; width: 100%; gap: 6px; }
  .nav-btn { padding: 5px 12px; font-size: 13px; height: 32px; }
}

.unread-dot {
  background: #ef4444; color: #fff; font-size: 11px; line-height: 1;
  padding: 2px 5px; border-radius: 10px; margin-left: 2px;
}
</style>
