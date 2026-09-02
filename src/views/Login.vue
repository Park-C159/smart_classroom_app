<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="app-title"><i class="fas fa-microchip"></i> 答疑助手</div>
        <div class="placeholder"></div>
      </div>

      <div class="login-title">登录</div>

      <div class="form-group">
        <label>用户名</label>
        <input
          type="text"
          v-model="username"
          @keydown.enter="login"
          autocomplete="username"
        />
      </div>

      <div class="form-group">
        <label>密码</label>
        <div class="password-wrapper">
          <input
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            @keydown.enter="login"
            autocomplete="current-password"
          />
          <button class="password-toggle" type="button" @click="showPassword = !showPassword">
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <button class="btn-login" @click="login" :disabled="loading">
        <i class="fas fa-sign-in-alt"></i> {{ loading ? '登录中...' : '登录' }}
      </button>

      <div v-if="message" :class="['login-message', messageType]">{{ message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('admin')
const password = ref('admin123')
const showPassword = ref(false)
const loading = ref(false)
const message = ref('')
const messageType = ref('error')

async function login() {
  const u = username.value.trim()
  const p = password.value.trim()
  if (!u || !p) {
    message.value = '请输入用户名和密码'
    messageType.value = 'error'
    return
  }
  loading.value = true
  message.value = ''
  try {
    await authStore.login(u, p)
    router.push('/')
  } catch (e) {
    message.value = '登录失败：' + (e.response?.data?.detail || e.message || '未知错误')
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  font-family: 'Inter', sans-serif;
  background: #f7f9fc;
  color: #1e293b;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-container {
  max-width: 400px;
  width: 100%;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
  padding: 40px 36px 32px;
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2f6;
}

.login-header .app-title {
  font-size: 17px;
  font-weight: 600;
  color: #0b1e33;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-header .app-title i {
  color: #3b82f6;
}

.login-header .placeholder {
  width: 80px;
}

.login-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #0b1e33;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-weight: 500;
  font-size: 14px;
  color: #475569;
  padding-left: 4px;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  background: #f8fafc;
  transition: 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.password-wrapper {
  position: relative;
  width: 100%;
}

.password-wrapper input {
  width: 100%;
  padding: 10px 44px 10px 14px !important;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-toggle:hover {
  color: #475569;
}

.btn-login {
  width: 100%;
  padding: 10px 24px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #3b82f6;
  color: white;
  margin-top: 4px;
}

.btn-login:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-message {
  margin-top: 12px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  text-align: center;
}

.login-message.error {
  background: #fee2e2;
  color: #b91c1c;
}

.login-message.success {
  background: #dcfce7;
  color: #166534;
}

@media (max-width: 480px) {
  .login-container {
    padding: 24px 20px;
  }
}
</style>
