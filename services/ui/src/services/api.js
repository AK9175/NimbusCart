import axios from 'axios'

const ENTERPRISE_URL = import.meta.env.VITE_ENTERPRISE_URL || 'http://localhost:3000'

const enterprise = axios.create({ baseURL: ENTERPRISE_URL })

enterprise.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

enterprise.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export { enterprise }
