import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : '/api',
  timeout: 60000,
})

// 请求拦截器 - 自动添加token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('citizen_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 处理401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('citizen_token')
      localStorage.removeItem('citizen_user')
      // 跳转到登录页（如果在Vue实例中）
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  }
)

// ==== 认证相关 ====

// 发送验证码
export function sendCode(phone) {
  return api.post('/auth/send-code', { phone })
}

// 登录
export function login(phone, code) {
  return api.post('/auth/login', { phone, code })
}

// 登出
export function logout() {
  return api.post('/auth/logout')
}

// 获取当前用户信息
export function getCurrentUser() {
  return api.get('/auth/me')
}

// ==== 原有API ====

// 获取系统提示词
export function getPrompt() {
  return api.get('/prompt')
}

// 流式对话 - 返回 EventSource 兼容的 URL
export function getChatStreamUrl() {
  return api.defaults.baseURL + '/chat/stream'
}

// 提交信件（市民版）
export function submitLetter(data) {
  return api.post('/letter/submit', data)
}

// POI 搜索
export function searchPOI(keywords, city = '') {
  return api.get('/amap/poi/search', { params: { keywords, city } })
}

// 地理编码
export function geocode(address, city = '') {
  return api.get('/amap/geocode', { params: { address, city } })
}

// 逆地理编码
export function regeocode(longitude, latitude) {
  return api.get('/amap/regeocode', { params: { longitude, latitude } })
}

// 周边搜索
export function searchPOIAround(location, keywords, radius = 1000) {
  return api.get('/amap/poi/around', { params: { location, keywords, radius } })
}

// 输入提示
export function getInputTips(keywords, city = '') {
  return api.get('/amap/input/tips', { params: { keywords, city } })
}

// 获取分类树（前端三级联动）
export function getCategories() {
  return api.get('/letter/categories')
}

// AI智能分类
export function classifyLetter(data) {
  return api.post('/letter/classify', data)
}

export default api
