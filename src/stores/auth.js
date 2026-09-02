import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/api/auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref(null)
    const refreshToken = ref(null)
    const user = ref(null)

    const isAuthenticated = computed(() => !!token.value)

    async function login(username, password) {
      const data = await authAPI.login(username, password)
      token.value = data.access_token
      refreshToken.value = data.refresh_token
      user.value = data.user
      return data
    }

    async function logout() {
      try {
        await authAPI.logout()
      } finally {
        token.value = null
        refreshToken.value = null
        user.value = null
      }
    }

    async function fetchProfile() {
      try {
        user.value = await authAPI.getMe()
      } catch {
        token.value = null
        user.value = null
      }
    }

    async function refreshAccessToken() {
      if (!refreshToken.value) return
      try {
        const data = await authAPI.refresh(refreshToken.value)
        token.value = data.access_token
        refreshToken.value = data.refresh_token
        user.value = data.user
      } catch {
        token.value = null
        refreshToken.value = null
        user.value = null
      }
    }

    return {
      token,
      refreshToken,
      user,
      isAuthenticated,
      login,
      logout,
      fetchProfile,
      refreshAccessToken,
    }
  },
  {
    persist: {
      key: 'auth',
      storage: localStorage,
      pick: ['token', 'refreshToken', 'user'],
    },
  }
)
