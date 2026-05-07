<template>
  <div class="page">
    <Navbar />

    <div class="hero">
      <div class="hero-content">
        <h1>Enterprise Data Viewer</h1>
        <p>Aggregated view of products, customers, and orders</p>
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
            <div class="stat-value">${{ Number(summary.totalRevenue).toFixed(2) }}</div>
            <div class="stat-label">Revenue</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <input
          v-model="search"
          @input="onSearch"
          class="search-input"
          :placeholder="`Search ${activeTab}...`"
        />
      </div>

      <!-- Loading -->
      <div class="loading" v-if="loading">Loading {{ activeTab }}...</div>

      <!-- Error -->
      <div class="empty-state" v-else-if="error">
        <div class="empty-icon">⚠️</div>
        <p>{{ error }}</p>
      </div>

      <!-- Empty -->
      <div class="empty-state" v-else-if="!rows.length">
        <div class="empty-icon">🔍</div>
        <p>No {{ activeTab }} found.</p>
      </div>

      <!-- Products Table -->
      <div class="table-wrap card" v-else-if="activeTab === 'products'">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Description</th><th>Price</th><th>Stock</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>{{ row.id }}</td>
              <td class="bold">{{ row.name }}</td>
              <td class="muted">{{ row.description }}</td>
              <td>${{ Number(row.price).toFixed(2) }}</td>
              <td><span class="stock-badge">{{ row.stock }}</span></td>
              <td class="muted">{{ formatDate(row.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Customers Table -->
      <div class="table-wrap card" v-else-if="activeTab === 'customers'">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Email</th><th>Company</th><th>Phone</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>{{ row.id }}</td>
              <td class="bold">{{ row.name }}</td>
              <td>{{ row.email }}</td>
              <td class="muted">{{ row.company }}</td>
              <td class="muted">{{ row.phone }}</td>
              <td class="muted">{{ formatDate(row.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Orders Table -->
      <div class="table-wrap card" v-else-if="activeTab === 'orders'">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Customer</th><th>Status</th><th>Total</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>{{ row.id }}</td>
              <td class="bold">{{ row.customer_name || '—' }}</td>
              <td><span class="status-badge" :class="row.status">{{ row.status }}</span></td>
              <td>${{ Number(row.total).toFixed(2) }}</td>
              <td class="muted">{{ formatDate(row.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination info -->
      <div class="pagination-info" v-if="rows.length">
        Showing {{ filteredRows.length }} of {{ rows.length }} {{ activeTab }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { enterprise } from '../services/api'

const tabs = [
  { key: 'products',  label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'orders',    label: 'Orders' },
]

const activeTab = ref('products')
const rows = ref([])
const summary = ref(null)
const search = ref('')
const loading = ref(false)
const error = ref(null)
let searchTimer = null

const filteredRows = computed(() => {
  if (!search.value) return rows.value
  const q = search.value.toLowerCase()
  return rows.value.filter(row =>
    Object.values(row).some(v => v && String(v).toLowerCase().includes(q))
  )
})

async function loadSummary() {
  try {
    const res = await enterprise.get('/api/enterprise/summary')
    summary.value = res.data
  } catch {}
}

async function loadTab(tab) {
  loading.value = true
  error.value = null
  rows.value = []
  try {
    const res = await enterprise.get(`/api/enterprise/${tab}`)
    rows.value = res.data.data || res.data[tab] || []
  } catch {
    error.value = `Failed to load ${tab}.`
  } finally {
    loading.value = false
  }
}

async function switchTab(tab) {
  activeTab.value = tab
  search.value = ''
  await loadTab(tab)
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {}, 300)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(async () => {
  await Promise.all([loadSummary(), loadTab('products')])
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }

.hero {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  padding: 40px 32px;
  color: white;
}

.hero h1 { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
.hero p { font-size: 15px; color: #94a3b8; }

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
}

.stat-icon { font-size: 30px; }
.stat-value { font-size: 22px; font-weight: 700; color: #0f172a; }
.stat-label { font-size: 12px; color: #64748b; margin-top: 2px; }

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; }
.tab-btn:hover { color: #1e293b; }

.search-bar { margin-bottom: 16px; }

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 9px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: #3b82f6; }

.loading { color: #64748b; padding: 40px 0; }

.empty-state { text-align: center; padding: 60px 0; color: #64748b; }
.empty-icon { font-size: 40px; margin-bottom: 10px; }

.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead tr {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #374151;
}

tbody tr:hover { background: #f8fafc; }
tbody tr:last-child td { border-bottom: none; }

.bold { font-weight: 600; color: #1e293b; }
.muted { color: #94a3b8; }

.stock-badge {
  background: #f0fdf4;
  color: #16a34a;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 12px;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.pending    { background: #fef9c3; color: #a16207; }
.status-badge.processing { background: #dbeafe; color: #1d4ed8; }
.status-badge.shipped    { background: #e0f2fe; color: #0369a1; }
.status-badge.delivered  { background: #dcfce7; color: #15803d; }

.pagination-info {
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
  text-align: right;
}
</style>
