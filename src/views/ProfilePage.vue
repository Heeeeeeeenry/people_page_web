<template>
  <div class="profile-page">
    <div class="profile-card">
      <!-- 用户头像和信息 -->
      <div class="user-avatar-section">
        <div class="avatar" :style="{ background: avatarColor }">
          {{ avatarLetter }}
        </div>
        <div class="user-meta">
          <h2>{{ displayName }}</h2>
          <p class="phone">{{ displayPhone }}</p>
          <p class="reg-time">注册时间：{{ registerTime }}</p>
        </div>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-num">{{ letters.length }}</div>
        <div class="stat-label">我的诉求</div>
      </div>
      <div class="stat-card">
        <div class="stat-num waiting-num">{{ waitingCount }}</div>
        <div class="stat-label">待受理</div>
      </div>
      <div class="stat-card">
        <div class="stat-num process-num">{{ processingCount }}</div>
        <div class="stat-label">处理中</div>
      </div>
      <div class="stat-card">
        <div class="stat-num done-num">{{ doneCount }}</div>
        <div class="stat-label">已完成</div>
      </div>
    </div>

    <!-- 我的诉求列表 -->
    <div class="section-header">
      <h3>我的诉求记录</h3>
      <span class="letter-count" v-if="letters.length > 0">共 {{ letters.length }} 条</span>
    </div>

    <div v-if="loading" class="loading-state">
      <svg class="spin" viewBox="0 0 24 24" width="32" height="32"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8z" fill="#1677ff"/></svg>
      <p>加载中...</p>
    </div>

    <div v-else-if="letters.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z" fill="#d9d9d9"/><path d="M12 12l-4-4h8z" fill="#d9d9d9" transform="rotate(90 12 12)"/></svg>
      <p>还没有提交过诉求</p>
      <router-link to="/write" class="btn btn-primary">提交诉求</router-link>
    </div>

    <div v-else class="letter-list">
      <div v-for="item in letters" :key="item['信件编号']" class="letter-item" @click="showLetterDetail(item)">
        <div class="letter-header">
          <span class="letter-no">{{ item['信件编号'] }}</span>
          <span class="letter-status" :class="statusClass(item['当前状态'])">{{ item['当前状态'] }}</span>
        </div>
        <div class="letter-time">{{ item['来信时间'] }}</div>
        <div class="letter-preview">{{ item['诉求内容'] }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, inject, onMounted } from 'vue'
import api, { getCurrentUser } from '../utils/api.js'

export default {
  name: 'ProfilePage',
  setup() {
    const userStore = inject('userStore')
    const letters = ref([])
    const loading = ref(true)

    const displayName = computed(() => {
      return userStore.user?.nickname || userStore.user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '市民用户'
    })

    const displayPhone = computed(() => {
      const phone = userStore.user?.phone || ''
      return phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''
    })

    const avatarLetter = computed(() => {
      const name = userStore.user?.nickname || userStore.user?.phone || '用户'
      return name.charAt(0).toUpperCase()
    })

    // 根据手机号生成固定颜色
    const avatarColor = computed(() => {
      const phone = userStore.user?.phone || 'default'
      let hash = 0
      for (let i = 0; i < phone.length; i++) {
        hash = phone.charCodeAt(i) + ((hash << 5) - hash)
      }
      const colors = ['#1677ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2', '#fa541c']
      return colors[Math.abs(hash) % colors.length]
    })

    const registerTime = computed(() => {
      return userStore.user?.created_at?.slice(0, 10) || '--'
    })

    const waitingCount = computed(() => letters.value.filter(l => l['当前状态'] === '待受理' || l['当前状态'] === '待分配').length)
    const processingCount = computed(() => letters.value.filter(l => l['当前状态'] === '处理中' || l['当前状态'] === '办理中').length)
    const doneCount = computed(() => letters.value.filter(l => l['当前状态'] === '已完成' || l['当前状态'] === '已办结').length)

    function statusClass(status) {
      const map = {
        '待受理': 'status-pending',
        '待分配': 'status-pending',
        '处理中': 'status-processing',
        '办理中': 'status-processing',
        '已完成': 'status-done',
        '已办结': 'status-done',
      }
      return map[status] || 'status-pending'
    }

    async function loadLetters() {
      loading.value = true
      try {
        const res = await getCurrentUser()
        if (res.data?.letters) {
          letters.value = res.data.letters
        }
      } catch (e) {
        console.warn('加载诉求记录失败:', e)
          // 直接通过手机号查询
          try {
            const res = await api.get('/auth/my-letters')
            if (res.data?.letters) {
              letters.value = res.data.letters
            }
          } catch (e2) {}
      } finally {
        loading.value = false
      }
    }

    function showLetterDetail(item) {
      alert(`信件编号: ${item['信件编号']}\n状态: ${item['当前状态']}\n时间: ${item['来信时间']}\n\n${item['诉求内容']}`)
    }

    onMounted(() => {
      loadLetters()
    })

    return {
      letters,
      loading,
      displayName,
      displayPhone,
      avatarLetter,
      avatarColor,
      registerTime,
      waitingCount,
      processingCount,
      doneCount,
      statusClass,
      showLetterDetail,
    }
  },
}
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.profile-card {
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border-radius: 16px;
  padding: 32px;
  color: #fff;
  margin-bottom: 20px;
}

.user-avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  border: 3px solid rgba(255,255,255,0.3);
  flex-shrink: 0;
}

.user-meta h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 4px;
}

.user-meta .phone {
  font-size: 14px;
  opacity: 0.85;
}

.user-meta .reg-time {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 4px;
}

/* 统计 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 12px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border: 1px solid #f0f0f0;
}

.stat-num {
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.waiting-num {
  color: #fa8c16;
}

.process-num {
  color: #1677ff;
}

.done-num {
  color: #52c41a;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 列表 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
  color: #333;
}

.letter-count {
  font-size: 13px;
  color: #8c8c8c;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
}

.loading-state p, .empty-state p {
  color: #8c8c8c;
  margin-top: 12px;
  font-size: 14px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.letter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.letter-item {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
}

.letter-item:hover {
  border-color: #d6e4ff;
  box-shadow: 0 2px 8px rgba(22,119,255,0.06);
}

.letter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.letter-no {
  font-family: monospace;
  font-size: 13px;
  color: #1677ff;
  font-weight: 500;
}

.letter-status {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-processing {
  background: #e6f7ff;
  color: #1677ff;
}

.status-done {
  background: #f6ffed;
  color: #52c41a;
}

.letter-time {
  font-size: 12px;
  color: #bfbfbf;
  margin-bottom: 6px;
}

.letter-preview {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  margin-top: 12px;
}

.btn-primary {
  background: #1677ff;
  color: #fff;
}

@media (max-width: 600px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
