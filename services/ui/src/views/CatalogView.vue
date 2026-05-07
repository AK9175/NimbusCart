<template>
  <div class="page">
    <Navbar />
    <div class="container">
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Catalog</h1>
            <p class="page-sub" v-if="auth.isAdmin">Manage your product inventory</p>
            <p class="page-sub" v-else>Browse and add products to your cart</p>
          </div>
          <button v-if="auth.isAdmin" class="add-product-btn" @click="showAddForm = !showAddForm">
            {{ showAddForm ? '✕ Cancel' : '+ Add Product' }}
          </button>
        </div>
      </div>

      <!-- Admin: Add Product Form -->
      <div class="add-form card" v-if="auth.isAdmin && showAddForm">
        <h2 class="form-title">New Product</h2>
        <div class="form-grid">
          <div class="form-group">
            <label>Name *</label>
            <input v-model="newProduct.name" placeholder="Product name" />
          </div>
          <div class="form-group">
            <label>Price *</label>
            <input v-model.number="newProduct.price" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label>Stock</label>
            <input v-model.number="newProduct.stock" type="number" min="0" placeholder="0" />
          </div>
          <div class="form-group">
            <label>Image URL</label>
            <input v-model="newProduct.image_url" placeholder="https://..." />
          </div>
          <div class="form-group span-2">
            <label>Description</label>
            <textarea v-model="newProduct.description" rows="2" placeholder="Short description..."></textarea>
          </div>
          <div class="form-group span-2">
            <label>Tags (comma-separated)</label>
            <input v-model="newProduct.tagsRaw" placeholder="e.g. audio, accessories" />
          </div>
        </div>
        <div class="form-actions">
          <span class="form-error" v-if="formError">{{ formError }}</span>
          <button class="submit-btn" @click="submitProduct" :disabled="submitting">
            {{ submitting ? 'Adding…' : 'Add to Catalog' }}
          </button>
        </div>
      </div>

      <!-- Search + Tag Filter -->
      <div class="filters">
        <input
          v-model="search"
          @input="onSearch"
          class="search-input"
          placeholder="Search products..."
        />
        <select v-model="selectedTag" @change="loadProducts" class="tag-select">
          <option value="">All Tags</option>
          <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
      </div>

      <!-- Loading -->
      <div class="product-grid" v-if="loading">
        <div class="card skeleton product-skeleton" v-for="i in 8" :key="i" />
      </div>

      <!-- Error -->
      <div class="empty-state" v-else-if="error">
        <div class="empty-icon">⚠️</div>
        <p>{{ error }}</p>
      </div>

      <!-- Empty -->
      <div class="empty-state" v-else-if="!products.length">
        <div class="empty-icon">📦</div>
        <p>No products found.</p>
      </div>

      <!-- Products -->
      <div class="product-grid" v-else>
        <div class="card product-card" v-for="product in products" :key="product.id">
          <img :src="product.image_url" :alt="product.name" class="product-img" />
          <div class="product-body">
            <div class="tag-row">
              <span class="tag" v-for="tag in product.tags" :key="tag">{{ tag }}</span>
            </div>
            <h3 class="product-name">{{ product.name }}</h3>
            <p class="product-desc">{{ product.description }}</p>
            <div class="product-footer">
              <span class="product-price">${{ Number(product.price).toFixed(2) }}</span>
              <span class="product-stock">{{ product.stock }} in stock</span>
            </div>
            <!-- Admin controls -->
            <button
              v-if="auth.isAdmin"
              class="delete-btn"
              @click="deleteProduct(product)"
              :disabled="deleting[product.id]"
            >
              {{ deleting[product.id] ? 'Deleting…' : 'Delete Product' }}
            </button>
            <!-- Customer controls -->
            <button
              v-else
              class="add-btn"
              @click="addToCart(product)"
              :disabled="adding[product.id]"
            >
              {{ adding[product.id] ? 'Added!' : '+ Add to Cart' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { catalog as catalogApi } from '../services/api'
import { useCartStore } from '../stores/cart'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const cartStore = useCartStore()
const products = ref([])
const tags = ref(['audio', 'input', 'accessories', 'video', 'storage', 'lighting', 'furniture', 'display'])
const search = ref('')
const selectedTag = ref('')
const loading = ref(true)
const error = ref(null)
const adding = ref({})
const deleting = ref({})
let searchTimer = null

// Add product form state
const showAddForm = ref(false)
const submitting = ref(false)
const formError = ref('')
const newProduct = ref({ name: '', description: '', price: '', stock: 0, image_url: '', tagsRaw: '' })

async function loadProducts() {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({ limit: 50 })
    if (search.value) params.set('search', search.value)
    if (selectedTag.value) params.set('tag', selectedTag.value)
    const res = await catalogApi.get(`/products?${params}`)
    products.value = res.data.products
  } catch {
    error.value = 'Failed to load products. Make sure the catalog service is running.'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadProducts, 400)
}

async function addToCart(product) {
  adding.value[product.id] = true
  try {
    await cartStore.addItem(product)
  } catch {}
  setTimeout(() => { adding.value[product.id] = false }, 1200)
}

async function submitProduct() {
  formError.value = ''
  if (!newProduct.value.name || newProduct.value.price === '') {
    formError.value = 'Name and price are required.'
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: newProduct.value.name,
      description: newProduct.value.description,
      price: newProduct.value.price,
      stock: newProduct.value.stock,
      image_url: newProduct.value.image_url || null,
      tags: newProduct.value.tagsRaw
        ? newProduct.value.tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : [],
    }
    await catalogApi.post('/products', payload)
    newProduct.value = { name: '', description: '', price: '', stock: 0, image_url: '', tagsRaw: '' }
    showAddForm.value = false
    await loadProducts()
  } catch (err) {
    formError.value = err?.response?.data?.error || 'Failed to add product.'
  } finally {
    submitting.value = false
  }
}

async function deleteProduct(product) {
  if (!confirm(`Delete "${product.name}"?`)) return
  deleting.value[product.id] = true
  try {
    await catalogApi.delete(`/products/${product.id}`)
    products.value = products.value.filter(p => p.id !== product.id)
  } catch {
    alert('Failed to delete product.')
  } finally {
    deleting.value[product.id] = false
  }
}

onMounted(loadProducts)
</script>

<style scoped>
.page { min-height: 100vh; background: #f8fafc; }

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header { margin-bottom: 28px; }

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.page-sub { font-size: 14px; color: #64748b; }

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus { border-color: #3b82f6; }

.tag-select {
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  outline: none;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.product-card { overflow: hidden; }

.product-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.product-body { padding: 14px; }

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag {
  font-size: 10px;
  background: #eff6ff;
  color: #3b82f6;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: capitalize;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.product-desc {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
  line-height: 1.5;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.product-price {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.product-stock {
  font-size: 11px;
  color: #22c55e;
  background: #f0fdf4;
  padding: 2px 7px;
  border-radius: 10px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.add-product-btn {
  padding: 10px 20px;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.add-product-btn:hover { background: #1e293b; }

.add-form {
  padding: 24px;
  margin-bottom: 28px;
}

.form-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.span-2 { grid-column: span 2; }

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.form-group input,
.form-group textarea {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus { border-color: #3b82f6; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
}

.form-error { font-size: 13px; color: #ef4444; }

.submit-btn {
  padding: 10px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:hover { background: #2563eb; }
.submit-btn:disabled { background: #93c5fd; cursor: default; }

.add-btn {
  width: 100%;
  padding: 8px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover { background: #2563eb; }
.add-btn:disabled { background: #22c55e; cursor: default; }

.delete-btn {
  width: 100%;
  padding: 8px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.delete-btn:hover { background: #dc2626; color: white; }
.delete-btn:disabled { opacity: 0.5; cursor: default; }

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: #64748b;
}

.empty-icon { font-size: 48px; margin-bottom: 12px; }

.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.product-skeleton { height: 300px; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
