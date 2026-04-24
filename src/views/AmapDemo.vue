<template>
  <div class="amap-demo-page">
    <div class="page-header">
      <h1><i class="fas fa-map-marked-alt"></i> 高德地图 - POI搜索</h1>
    </div>

    <div class="demo-content card">
      <div class="search-bar">
        <input v-model="keywords" class="form-input" placeholder="搜索关键词（如：派出所、公安局）" @keydown.enter="searchPOI" />
        <input v-model="city" class="form-input" style="width:150px" placeholder="城市" />
        <button class="btn btn-primary" @click="searchPOI" :disabled="loading">
          <i class="fas fa-search"></i> 搜索
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <span class="spinner"></span> 搜索中...
      </div>

      <div v-if="pois.length > 0" class="poi-list">
        <div v-for="poi in pois" :key="poi.id" class="poi-item">
          <div class="poi-name">
            <i class="fas fa-map-pin"></i>
            <span>{{ poi.name }}</span>
          </div>
          <div class="poi-address">📍 {{ poi.address || '暂无地址' }}</div>
          <div class="poi-meta">
            <span class="poi-type">{{ poi.type }}</span>
            <span v-if="poi.tel" class="poi-tel">
              <i class="fas fa-phone"></i> {{ poi.tel }}
            </span>
          </div>
          <div class="poi-location" v-if="poi.location">
            <i class="fas fa-globe"></i> {{ poi.location }}
          </div>
        </div>
      </div>

      <div v-if="pois.length === 0 && searched" class="empty-state">
        <i class="fas fa-search-minus"></i>
        <p>未找到相关POI数据，请尝试其他关键词</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { searchPOI } from '../utils/api.js'

export default {
  name: 'AmapDemo',
  setup() {
    const keywords = ref('')
    const city = ref('')
    const pois = ref([])
    const loading = ref(false)
    const searched = ref(false)

    const search = async () => {
      if (!keywords.value.trim()) return
      loading.value = true
      searched.value = false
      try {
        const res = await searchPOI(keywords.value.trim(), city.value.trim())
        pois.value = res.data.pois || []
      } catch (e) {
        console.error('POI搜索失败:', e)
      } finally {
        loading.value = false
        searched.value = true
      }
    }

    return {
      keywords,
      city,
      pois,
      loading,
      searched,
      searchPOI: search,
    }
  },
}
</script>

<style scoped>
.amap-demo-page {
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

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-bar input:first-child {
  flex: 1;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.poi-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.poi-item {
  padding: 16px;
  background: #f7f8fa;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.poi-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.poi-name i {
  color: var(--danger);
  margin-right: 6px;
}

.poi-address {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.poi-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.poi-type {
  color: var(--primary);
  background: #e6f0ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.poi-tel {
  color: var(--success);
}

.poi-location {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  font-family: monospace;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
}
</style>
