<template>
  <div id="app" class="app-container">
    <!-- 顶部导航 -->
    <header class="top-bar">
      <div class="top-left">
        <div class="logo">
          <svg viewBox="0 0 40 40" width="32" height="32">
            <rect x="4" y="10" width="32" height="24" rx="4" fill="#fff" opacity="0.2"/>
            <path d="M8 18 L20 12 L32 18 L32 30 L8 30Z" fill="#fff" opacity="0.4"/>
            <path d="M12 21 L20 17 L28 21 L28 28 L12 28Z" fill="#fff"/>
            <circle cx="20" cy="22" r="2" fill="#1677ff"/>
          </svg>
        </div>
        <span class="site-name">民意直通车</span>
      </div>
      <nav class="top-nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link v-if="isLoggedIn" to="/write" class="nav-item btn-write">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
          </svg>
          写信
        </router-link>
        <template v-if="isLoggedIn">
          <router-link to="/profile" class="nav-item user-info">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.5"/>
              <path d="M12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" fill="currentColor" opacity="0.5"/>
            </svg>
            <span class="user-name">{{ userName }}</span>
          </router-link>
          <button class="nav-item btn-logout" @click="handleLogout">退出</button>
        </template>
        <router-link v-else to="/login" class="nav-item btn-login">登录</router-link>
      </nav>
    </header>

    <!-- 主内容 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'

const userStore = inject('userStore')
const router = useRouter()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const userName = computed(() => userStore.user?.nickname || userStore.user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '用户')

function handleLogout() {
  localStorage.removeItem('citizen_token')
  localStorage.removeItem('citizen_user')
  userStore.token = null
  userStore.user = null
  userStore.isLoggedIn = false
  router.push('/login')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif;
  background: #f5f7fa;
  color: #333;
  -webkit-font-smoothing: antialiased;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #1677ff;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(22,119,255,0.15);
}

.top-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  display: flex;
  align-items: center;
}

.site-name {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.top-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  color: rgba(255,255,255,0.85);
  text-decoration: none;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.2s;
  border: none;
  background: none;
  cursor: pointer;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.nav-item.router-link-active {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.btn-write {
  background: rgba(255,255,255,0.15);
  margin: 0 4px;
}

.btn-write:hover {
  background: rgba(255,255,255,0.25);
}

.user-info {
  font-weight: 500;
}

.user-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-logout {
  font-size: 13px;
  opacity: 0.8;
}

.btn-logout:hover {
  opacity: 1;
}

.main-content {
  flex: 1;
}
</style>
