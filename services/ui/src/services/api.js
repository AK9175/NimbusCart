import axios from 'axios'

function createClient(baseURL) {
  const client = axios.create({ baseURL })

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )

  return client
}

export const enterprise = createClient(import.meta.env.VITE_ENTERPRISE_URL || 'http://localhost:3000')
export const catalog    = createClient(import.meta.env.VITE_CATALOG_URL    || 'http://localhost:3001')
export const cart       = createClient(import.meta.env.VITE_CART_URL       || 'http://localhost:3002')
export const checkout   = createClient(import.meta.env.VITE_CHECKOUT_URL   || 'http://localhost:3003')
export const orders     = createClient(import.meta.env.VITE_ORDERS_URL     || 'http://localhost:3004')
