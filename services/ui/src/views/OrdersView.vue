<template>
  <div class="page">
    <Navbar />
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">My Orders</h1>
        <p class="page-sub">Your order history</p>
      </div>

      <!-- Filter -->
      <div class="filters">
        <select v-model="statusFilter" @change="loadOrders" class="filter-select">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <!-- Loading -->
      <div class="loading" v-if="loading">Loading orders...</div>

      <!-- Error -->
      <div class="empty-state" v-else-if="error">
        <div class="empty-icon">⚠️</div>
        <p>{{ error }}</p>
      </div>

      <!-- Empty -->
      <div class="empty-state" v-else-if="!orderList.length">
        <div class="empty-icon">📋</div>
        <p>No orders found.</p>
        <router-link to="/catalog" class="shop-btn">Start Shopping</router-link>
      </div>

      <!-- Orders List -->
      <div class="orders-list" v-else>
        <div class="order-card card" v-for="order in orderList" :key="order.id">
          <div class="order-header">
            <div>
              <span class="order-id">Order #{{ order.id }}</span>
              <span class="order-date">{{ formatDate(order.created_at) }}</span>
            </div>
            <span class="status-badge" :class="order.status">{{ order.status }}</span>
          </div>

          <div class="order-body" v-if="order.items">
            <div class="order-item" v-for="item in order.items" :key="item.id">
              <span class="item-name">{{ item.product_name }}</span>
              <span class="item-qty">x{{ item.quantity }}</span>
              <span class="item-price">${{ (item.unit_price * item.quantity).toFixed(2) }}</span>
            </div>
          </div>

          <div class="order-footer">
            <div class="shipping-info" v-if="order.shipping_name">
              {{ order.shipping_name }} — {{ order.street }}, {{ order.city }}, {{ order.state }} {{ order.zip }}
            </div>
            <div class="order-total">Total: <strong>${{ Number(order.total).toFixed(2) }}</strong></div>
          </div>

          <button class="expand-btn" @click="toggleDetails(order)">
            {{ expanded[order.id] ? 'Hide Details' : 'View Details' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { orders as ordersApi } from '../services/api'

const orderList = ref([])
const statusFilter = ref('')
const loading = ref(true)
const error = ref(null)
const expanded = ref({})

async function loadOrders() {
  loading.value = true
  error.value = null
  try {
    const params = statusFilter.value ? `?status=${statusFilter.value}` : ''
    const res = await ordersApi.get(`/orders${params}`)
    orderList.value = res.data.orders
  } catch {
    error.value = 'Failed to load orders. Make sure the orders service is running.'
  } finally {
    loading.value = false
  }
}

async function toggleDetails(order) {
  if (expanded.value[order.id]) {
    expanded.value[order.id] = false
    order.items = null
    return
  }
  try {
    const res = await ordersApi.get(`/orders/${order.id}`)
    order.items = res.data.items
    expanded.value[order.id] = true
  } catch {}
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(loadOrders)
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header { margin-bottom: 24px; }
.page-title { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.page-sub { font-size: 14px; color: #64748b; }

.filters { margin-bottom: 24px; }

.filter-select {
  padding: 9px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  outline: none;
}

.loading { color: #64748b; padding: 40px 0; }

.empty-state { text-align: center; padding: 80px 0; color: #64748b; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }

.shop-btn {
  display: inline-block;
  margin-top: 16px;
  padding: 10px 24px;
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.orders-list { display: flex; flex-direction: column; gap: 16px; }

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.order-card { padding: 20px 24px; }

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.order-id { font-size: 15px; font-weight: 700; color: #0f172a; margin-right: 12px; }
.order-date { font-size: 13px; color: #64748b; }

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge.pending    { background: #fef9c3; color: #a16207; }
.status-badge.processing { background: #dbeafe; color: #1d4ed8; }
.status-badge.shipped    { background: #e0f2fe; color: #0369a1; }
.status-badge.delivered  { background: #dcfce7; color: #15803d; }

.order-body {
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  margin-bottom: 12px;
}

.order-item {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #475569;
  padding: 4px 0;
}

.item-name { flex: 1; }
.item-qty { color: #94a3b8; }
.item-price { font-weight: 600; color: #0f172a; }

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  margin-top: 4px;
}

.shipping-info { font-size: 12px; color: #94a3b8; }

.order-total { font-size: 14px; color: #475569; }
.order-total strong { color: #0f172a; font-size: 16px; }

.expand-btn {
  margin-top: 12px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.expand-btn:hover { background: #f8fafc; color: #0f172a; }
</style>
