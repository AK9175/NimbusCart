import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cart as cartApi } from '../services/api'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const total = ref(0)

  const count = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))

  async function fetch() {
    try {
      const res = await cartApi.get('/cart')
      items.value = res.data.items
      total.value = res.data.total
    } catch {}
  }

  async function addItem(product, quantity = 1) {
    await cartApi.post('/cart/items', {
      productId: String(product.id),
      name: product.name,
      price: Number(product.price),
      quantity,
    })
    await fetch()
  }

  async function updateItem(productId, quantity) {
    await cartApi.put(`/cart/items/${productId}`, { quantity })
    await fetch()
  }

  async function removeItem(productId) {
    await cartApi.delete(`/cart/items/${productId}`)
    await fetch()
  }

  async function clear() {
    await cartApi.delete('/cart')
    items.value = []
    total.value = 0
  }

  return { items, total, count, fetch, addItem, updateItem, removeItem, clear }
})
