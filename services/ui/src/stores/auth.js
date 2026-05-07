import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)

    const payload = JSON.parse(atob(newToken.split('.')[1]))
    user.value = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      avatar: payload.avatar,
      role: payload.role || 'customer',
    }
  }

  function loadFromStorage() {
    const stored = localStorage.getItem('token')
    if (stored) {
      try {
        setToken(stored)
      } catch {
        logout()
      }
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  return { user, token, isAuthenticated, isAdmin, setToken, loadFromStorage, logout }
})
