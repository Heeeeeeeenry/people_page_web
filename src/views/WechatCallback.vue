<template>
  <div class="callback-container">
    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>微信登录中...</p>
    </div>
    <div class="error" v-else-if="error">
      <svg viewBox="0 0 24 24" width="48" height="48"><circle cx="12" cy="12" r="10" fill="#ff4d4f" opacity="0.1"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ff4d4f"/></svg>
      <p>{{ error }}</p>
      <button class="btn-back" @click="goBack">返回登录</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { inject } from 'vue'

const router = useRouter()
const route = useRoute()
const userStore = inject('userStore')

const loading = ref(true)
const error = ref('')

// 从 URL 或 localStorage 获取信息
onMounted(async () => {
  const token = route.query.token
  const errMsg = route.query.error
  const needBindPhone = route.query.need_bind_phone
  const wxOpenid = route.query.wx_openid

  if (errMsg) {
    loading.value = false
    error.value = decodeURIComponent(errMsg)
    return
  }

  if (token) {
    // 后端已处理完登录，用 token 获取用户信息
    try {
      localStorage.setItem('citizen_token', token)
      const resp = await fetch('http://localhost:8081/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (resp.ok) {
        const user = await resp.json()
        localStorage.setItem('citizen_user', JSON.stringify(user))
        userStore.token = token
        userStore.user = user
        userStore.isLoggedIn = true

        // 通知父窗口并关闭
        if (window.opener) {
          window.opener.postMessage({
            type: 'wechat-login',
            token: token,
            user: user
          }, '*')
          window.close()
        } else {
          router.push(route.query.redirect || '/')
        }
      } else {
        localStorage.removeItem('citizen_token')
        throw new Error('获取用户信息失败')
      }
    } catch (e) {
      loading.value = false
      error.value = '登录失败: ' + e.message
    }
    return
  }

  if (needBindPhone && wxOpenid) {
    // 新用户需绑定手机号 → 跳转到登录页，传递 wx_openid
    localStorage.setItem('wx_openid_to_bind', wxOpenid)
    if (window.opener) {
      window.opener.postMessage({
        type: 'wechat-need-bind',
        wx_openid: wxOpenid
      }, '*')
      window.close()
    } else {
      router.push(`/login?need_bind_phone=true&wx_openid=${wxOpenid}`)
    }
    return
  }

  // 没有 token 也没有错误？可能直接从 WeChat 带 code 重定向过来的
  // 这种情况应该由后端先处理（后端 callback），所以这里不会走到
  loading.value = false
  error.value = '微信登录失败：未收到有效的登录信息'
})

function goBack() {
  router.push('/login')
}
</script>

<style scoped>
.callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  text-align: center;
}
.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e8e8e8;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading p { color: #666; font-size: 15px; }
.error p { color: #ff4d4f; font-size: 15px; }
.btn-back {
  padding: 8px 20px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}
.btn-back:hover { border-color: #1677ff; color: #1677ff; }
</style>
