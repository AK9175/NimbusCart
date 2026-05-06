<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <span class="brand-icon">☁️</span>
        <h1>NimbusCart</h1>
        <p>Cloud-Native Retail & Enterprise Portal</p>
      </div>

      <div class="divider" />

      <div class="login-section">
        <h2>Welcome back</h2>
        <p class="subtitle">Sign in to access your dashboard and enterprise data</p>

        <a :href="googleAuthUrl" class="google-btn">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="google-icon" />
          Sign in with Google
        </a>

        <p class="note">Secured with Google OAuth 2.0</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const ENTERPRISE_URL = import.meta.env.VITE_ENTERPRISE_URL || 'http://localhost:3000'
const googleAuthUrl = `${ENTERPRISE_URL}/auth/google`
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
  text-align: center;
}

.brand-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.brand h1 {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
}

.brand p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.divider {
  height: 1px;
  background: #e2e8f0;
  margin: 28px 0;
}

.login-section h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 28px;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 14px 20px;
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
}

.google-btn:hover {
  border-color: #3b82f6;
  background: #f8faff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.google-icon {
  width: 20px;
  height: 20px;
}

.note {
  font-size: 12px;
  color: #94a3b8;
  margin: 16px 0 0;
}
</style>
