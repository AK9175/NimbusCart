<template>
  <nav class="navbar">
    <div class="nav-brand">
      <span class="brand-icon">☁️</span>
      <span class="brand-name">NimbusCart</span>
    </div>

    <div class="nav-links">
      <router-link to="/">Home</router-link>
    </div>

    <div class="nav-user" v-if="auth.user">
      <img
        v-if="auth.user.avatar"
        :src="auth.user.avatar"
        :alt="auth.user.name"
        class="avatar"
      />
      <div class="user-info">
        <span class="user-name">{{ auth.user.name }}</span>
        <span class="user-email">{{ auth.user.email }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout">Logout</button>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { enterprise } from '../services/api'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  try {
    await enterprise.post('/auth/logout')
  } catch {}
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  background: #0f172a;
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.brand-icon { font-size: 22px; }

.brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: white;
}

.nav-links a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: white;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #3b82f6;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.user-email {
  font-size: 11px;
  color: #64748b;
}

.logout-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #1e293b;
  color: white;
  border-color: #475569;
}
</style>
