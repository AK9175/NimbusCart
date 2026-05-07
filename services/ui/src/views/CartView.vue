<template>
  <div class="page">
    <Navbar />
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Your Cart</h1>
        <p class="page-sub">Review items before checkout</p>
      </div>

      <!-- Loading -->
      <div class="loading" v-if="loading">Loading cart...</div>

      <!-- Empty -->
      <div class="empty-state" v-else-if="!cartStore.items.length">
        <div class="empty-icon">🛒</div>
        <p>Your cart is empty.</p>
        <router-link to="/catalog" class="shop-btn">Browse Catalog</router-link>
      </div>

      <!-- Cart Items -->
      <div v-else class="cart-layout">
        <div class="cart-items">
          <div class="cart-item card" v-for="item in cartStore.items" :key="item.productId">
            <div class="item-info">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-price">${{ Number(item.price).toFixed(2) }} each</div>
            </div>
            <div class="item-controls">
              <button class="qty-btn" @click="changeQty(item, item.quantity - 1)">−</button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button class="qty-btn" @click="changeQty(item, item.quantity + 1)">+</button>
            </div>
            <div class="item-subtotal">${{ (item.price * item.quantity).toFixed(2) }}</div>
            <button class="remove-btn" @click="remove(item.productId)">✕</button>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="summary card">
          <h2 class="summary-title">Order Summary</h2>
          <div class="summary-row">
            <span>Items ({{ cartStore.count }})</span>
            <span>${{ cartStore.total.toFixed(2) }}</span>
          </div>
          <div class="summary-row">
            <span>Shipping</span>
            <span class="free">Free</span>
          </div>
          <div class="summary-divider" />
          <div class="summary-row total-row">
            <span>Total</span>
            <span>${{ cartStore.total.toFixed(2) }}</span>
          </div>

          <!-- Shipping Form -->
          <div class="shipping-form">
            <h3 class="shipping-title">Shipping Address</h3>
            <input v-model="shipping.name"   placeholder="Full name"    class="form-input" />
            <input v-model="shipping.street" placeholder="Street"       class="form-input" />
            <div class="form-row">
              <input v-model="shipping.city"  placeholder="City"  class="form-input" />
              <input v-model="shipping.state" placeholder="State" class="form-input" />
            </div>
            <input v-model="shipping.zip"    placeholder="ZIP code"     class="form-input" />
          </div>

          <button class="checkout-btn" @click="doCheckout" :disabled="checkingOut">
            {{ checkingOut ? 'Processing...' : 'Place Order' }}
          </button>

          <div class="checkout-success" v-if="orderPlaced">
            Order #{{ orderPlaced }} placed successfully!
            <router-link to="/orders">View Orders</router-link>
          </div>
          <div class="checkout-error" v-if="checkoutError">{{ checkoutError }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { useCartStore } from '../stores/cart'
import { checkout as checkoutApi } from '../services/api'

const cartStore = useCartStore()
const loading = ref(true)
const checkingOut = ref(false)
const orderPlaced = ref(null)
const checkoutError = ref(null)

const shipping = ref({ name: '', street: '', city: '', state: '', zip: '' })

onMounted(async () => {
  await cartStore.fetch()
  loading.value = false
})

async function changeQty(item, qty) {
  if (qty < 1) return remove(item.productId)
  await cartStore.updateItem(item.productId, qty)
}

async function remove(productId) {
  await cartStore.removeItem(productId)
}

async function doCheckout() {
  checkingOut.value = true
  checkoutError.value = null
  orderPlaced.value = null
  try {
    const res = await checkoutApi.post('/checkout', { shipping: shipping.value })
    orderPlaced.value = res.data.order.id
    await cartStore.fetch()
  } catch (err) {
    checkoutError.value = err.response?.data?.error || 'Checkout failed. Please try again.'
  } finally {
    checkingOut.value = false
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header { margin-bottom: 28px; }
.page-title { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.page-sub { font-size: 14px; color: #64748b; }

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

.cart-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.cart-items { display: flex; flex-direction: column; gap: 12px; }

.cart-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}

.item-info { flex: 1; }
.item-name { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
.item-price { font-size: 12px; color: #64748b; }

.item-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 28px; height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.qty-btn:hover { background: #f1f5f9; }

.qty-value { font-size: 15px; font-weight: 600; min-width: 24px; text-align: center; }

.item-subtotal { font-size: 15px; font-weight: 700; color: #0f172a; min-width: 64px; text-align: right; }

.remove-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.remove-btn:hover { color: #ef4444; }

.summary { padding: 24px; }
.summary-title { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #475569;
  margin-bottom: 10px;
}

.free { color: #22c55e; font-weight: 600; }

.summary-divider { border-top: 1px solid #e2e8f0; margin: 12px 0; }

.total-row { font-size: 16px; font-weight: 700; color: #0f172a; }

.shipping-form { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.shipping-title { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: #3b82f6; }

.form-row { display: flex; gap: 8px; }
.form-row .form-input { flex: 1; }

.checkout-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.checkout-btn:hover { background: #2563eb; }
.checkout-btn:disabled { background: #93c5fd; cursor: default; }

.checkout-success {
  margin-top: 12px;
  padding: 10px 14px;
  background: #f0fdf4;
  color: #16a34a;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
}
.checkout-success a { color: #16a34a; font-weight: 700; margin-left: 6px; text-decoration: underline; }

.checkout-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 7px;
  font-size: 13px;
}
</style>
