import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { reactive } from 'vue'
import App from './App.vue'
import PeoplePage from './views/PeoplePage.vue'
import WritePage from './views/WritePage.vue'
import ProfilePage from './views/ProfilePage.vue'
import LoginPage from './views/LoginPage.vue'
import WechatCallback from './views/WechatCallback.vue'
import AmapDemo from './views/AmapDemo.vue'
import IconDemo from './views/IconDemo.vue'

// 全局用户状态
const userStore = reactive({
  user: null,
  token: null,
  isLoggedIn: false,
})

// 从localStorage恢复登录状态
const savedToken = localStorage.getItem('citizen_token')
const savedUser = localStorage.getItem('citizen_user')
if (savedToken && savedUser) {
  try {
    userStore.token = savedToken
    userStore.user = JSON.parse(savedUser)
    userStore.isLoggedIn = true
  } catch (e) {
    localStorage.removeItem('citizen_token')
    localStorage.removeItem('citizen_user')
  }
}

const routes = [
  { path: '/', name: 'home', component: PeoplePage, meta: { requiresAuth: false } },
  { path: '/write', name: 'write', component: WritePage, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginPage, meta: { requiresAuth: false } },
  { path: '/auth/wechat/callback', name: 'wechat-callback', component: WechatCallback, meta: { requiresAuth: false } },
  { path: '/amap-demo', name: 'amap', component: AmapDemo },
  { path: '/icon-demo', name: 'icon', component: IconDemo },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫 - 登录检查
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)

// 全局注入userStore
app.config.globalProperties.$userStore = userStore
app.provide('userStore', userStore)

app.mount('#app')
