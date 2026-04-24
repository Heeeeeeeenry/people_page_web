<template>
  <div class="icon-demo-page">
    <div class="page-header">
      <h1><i class="fas fa-shapes"></i> AI 图标动画展示</h1>
    </div>

    <div class="demos-grid">
      <div class="card demo-card" v-for="demo in demos" :key="demo.id">
        <div class="icon-display" :style="{ background: demo.bg }">
          <div :class="['icon-animated', demo.animation]">
            <i :class="demo.icon"></i>
          </div>
        </div>
        <p class="demo-label">{{ demo.label }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'IconDemo',
  setup() {
    const demos = ref([
      { id: 1, icon: 'fas fa-robot', label: 'AI 机器人', animation: 'pulse', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },
      { id: 2, icon: 'fas fa-brain', label: '智能大脑', animation: 'rotate', bg: 'linear-gradient(135deg, #f093fb, #f5576c)' },
      { id: 3, icon: 'fas fa-microchip', label: 'AI 芯片', animation: 'float', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
      { id: 4, icon: 'fas fa-network-wired', label: '神经网络', animation: 'pulse', bg: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
      { id: 5, icon: 'fas fa-database', label: '数据云', animation: 'float', bg: 'linear-gradient(135deg, #fa709a, #fee140)' },
      { id: 6, icon: 'fas fa-shield-halved', label: '安全防护', animation: 'rotate', bg: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
      { id: 7, icon: 'fas fa-chart-line', label: '数据分析', animation: 'pulse', bg: 'linear-gradient(135deg, #ffecd2, #fcb69f)' },
      { id: 8, icon: 'fas fa-cloud', label: '云服务', animation: 'float', bg: 'linear-gradient(135deg, #89f7fe, #66a6ff)' },
    ])

    return { demos }
  },
}
</script>

<style scoped>
.icon-demo-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.page-header h1 {
  font-size: 22px;
  margin-bottom: 20px;
}

.page-header h1 i {
  color: var(--primary);
  margin-right: 8px;
}

.demos-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.demo-card {
  text-align: center;
  padding: 0;
  overflow: hidden;
}

.icon-display {
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-animated {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2);
  border-radius: 16px;
  color: white;
  font-size: 28px;
}

.icon-animated.pulse {
  animation: pulse 2s ease-in-out infinite;
}

.icon-animated.rotate {
  animation: spin 3s linear infinite;
}

.icon-animated.float {
  animation: float 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.demo-label {
  padding: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

@media (max-width: 768px) {
  .demos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
