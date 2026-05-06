<template>
  <div class="home">
    <Navbar />

    <div class="hero">
      <div class="hero-content">
        <h1>Welcome back, <span class="highlight">{{ auth.user?.name?.split(' ')[0] }}</span> 👋</h1>
        <p>Here's what's happening in your store today.</p>
      </div>
    </div>

    <div class="container">
      <!-- Summary Cards -->
      <div class="summary-grid" v-if="summary">
        <div class="card stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.totalProducts }}</div>
            <div class="stat-label">Products</div>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.totalCustomers }}</div>
            <div class="stat-label">Customers</div>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon">🛒</div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.totalOrders }}</div>
            <div class="stat-label">Orders</div>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">${{ summary.totalRevenue.toFixed(2) }}</div>
            <div class="stat-label">Revenue</div>
          </div>
        </div>
      </div>

      <div class="summary-grid" v-else-if="loading">
        <div class="card stat-card skeleton" v-for="i in 4" :key="i" />
      </div>

      <!-- Products -->
      <div class="section">
        <h2 class="section-title">Featured Products</h2>

        <div class="product-grid" v-if="products.length">
          <div class="card product-card" v-for="product in products" :key="product.id">
            <img :src="product.image_url" :alt="product.name" class="product-img" />
            <div class="product-body">
              <h3 class="product-name">{{ product.name }}</h3>
              <p class="product-desc">{{ product.description }}</p>
              <div class="product-footer">
                <span class="product-price">${{ Number(product.price).toFixed(2) }}</span>
                <span class="product-stock">{{ product.stock }} in stock</span>
              </div>
            </div>
          </div>
        </div>

        <div class="product-grid" v-else-if="loading">
          <div class="card skeleton product-skeleton" v-for="i in 6" :key="i" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { useAuthStore } from '../stores/auth'
import { enterprise } from '../services/api'

const auth = useAuthStore()
const summary = ref(null)
const products = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [summaryRes, productsRes] = await Promise.all([
      enterprise.get('/api/enterprise/summary'),
      enterprise.get('/api/enterprise/products?limit=6'),
    ])
    summary.value = summaryRes.data
    products.value = productsRes.data.data
  } catch (err) {
    console.error('Failed to load dashboard data', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.home { min-height: 100vh; background: #f8fafc; }

.hero {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  padding: 48px 32px;
  color: white;
}

.hero h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px;
}

.highlight { color: #60a5fa; }

.hero p {
  font-size: 16px;
  color: #94a3b8;
  margin: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
}

.stat-icon { font-size: 32px; }

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 20px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.product-card { overflow: hidden; }

.product-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.product-body { padding: 16px; }

.product-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 6px;
}

.product-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
  line-height: 1.5;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.product-stock {
  font-size: 12px;
  color: #22c55e;
  background: #f0fdf4;
  padding: 3px 8px;
  border-radius: 20px;
}

.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.product-skeleton { height: 280px; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
