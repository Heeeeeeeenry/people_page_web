<template>
  <div class="write-page">
    <div class="page-header">
      <h1><svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#1677ff"/></svg> 提交群众诉求</h1>
      <p class="subtitle">请填写您要反映的问题，我们将及时受理并反馈</p>
    </div>

    <div class="write-layout">
      <!-- Left: Form -->
      <div class="form-section card">
        <!-- 基础信息 -->
        <div class="form-row">
          <div class="form-group">
            <label>群众姓名 <span class="required">*</span></label>
            <input v-model="form.姓名" class="form-input" placeholder="请输入您的姓名" />
          </div>
          <div class="form-group">
            <label>手机号 <span class="required">*</span></label>
            <input v-model="form.手机号" class="form-input" placeholder="11位手机号码" maxlength="11" :disabled="autoPhone" />
          </div>
        </div>

        <div class="form-group">
          <label>身份证号</label>
          <input v-model="form.身份证号" class="form-input" placeholder="18位身份证号码（选填）" maxlength="18" />
        </div>

        <!-- 诉求内容 -->
        <div class="form-group">
          <label>诉求描述 <span class="required">*</span></label>
          <textarea
            v-model="form.描述"
            class="form-input"
            rows="8"
            placeholder="请详细描述您要反映的问题，包括事发时间、地点、经过等关键信息..."
          ></textarea>
        </div>

        <!-- 位置信息（高德地图选点） -->
        <div class="form-group">
          <label>事发位置 <span class="optional">（选填）</span></label>
          <div class="location-search">
            <input
              v-model="locationQuery"
              class="form-input"
              placeholder="搜索地址或地点名称..."
              @keydown.enter.prevent="searchLocation"
            />
            <button class="btn btn-search" @click="searchLocation" :disabled="searching">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
            </button>
          </div>
          <!-- 搜索建议 -->
          <div v-if="addressList.length > 0" class="address-list">
            <div
              v-for="(addr, idx) in addressList"
              :key="idx"
              class="address-item"
              @click="selectAddress(addr)"
            >
              <div class="address-name">{{ addr.name }}</div>
              <div class="address-detail">{{ addr.address }}</div>
            </div>
          </div>
          <!-- 已选位置 -->
          <div v-if="selectedAddress" class="selected-location">
            <svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1677ff"/></svg>
            <div class="location-info">
              <div class="location-name">{{ selectedAddress.name }}</div>
              <div class="location-addr">{{ selectedAddress.address }} | {{ selectedAddress.province }} {{ selectedAddress.city }} {{ selectedAddress.district }}</div>
            </div>
            <button class="btn-remove" @click="clearLocation">×</button>
          </div>
          <!-- 地图容器 -->
          <div id="map-container" class="map-container" :style="{ height: showMap ? '280px' : '0' }"></div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" :disabled="!canSubmit || submitting" @click="submitLetter">
            <svg v-if="submitting" class="spin" viewBox="0 0 24 24" width="16" height="16"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/></svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
            {{ submitting ? '提交中...' : '提交诉求' }}
          </button>
          <button class="btn btn-secondary" @click="resetForm">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" fill="currentColor"/></svg>
            重置
          </button>
        </div>
      </div>

      <!-- Right: Preview -->
      <div class="preview-section">
        <div class="card">
          <h3><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#1677ff"/></svg> 信息预览</h3>
          <div class="preview-content">
            <table class="preview-table">
              <tr>
                <td class="label">群众姓名</td>
                <td class="value">{{ form.姓名 || '（未填写）' }}</td>
              </tr>
              <tr>
                <td class="label">手机号</td>
                <td class="value">{{ displayPhone || '（未填写）' }}</td>
              </tr>
              <tr v-if="form.身份证号">
                <td class="label">身份证号</td>
                <td class="value">{{ form.身份证号 }}</td>
              </tr>
              <tr>
                <td class="label">事发位置</td>
                <td class="value">{{ selectedAddress ? selectedAddress.address || selectedAddress.name : '（未填写）' }}</td>
              </tr>
              <tr>
                <td class="label">来信渠道</td>
                <td class="value"><span class="tag tag-channel">市民上报</span></td>
              </tr>
              <tr>
                <td class="label" style="vertical-align:top;">诉求描述</td>
                <td class="value description">{{ form.描述 || '（未填写）' }}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- 提交结果 -->
        <div v-if="submitResult" class="card result-card" :class="submitResult.success ? 'success' : 'error'">
          <svg v-if="submitResult.success" viewBox="0 0 24 24" width="28" height="28"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z" fill="#52c41a"/></svg>
          <svg v-else viewBox="0 0 24 24" width="28" height="28"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ff4d4f"/></svg>
          <div>
            <p class="result-msg">{{ submitResult.message }}</p>
            <p v-if="submitResult.letterNo" class="letter-no">信件编号：{{ submitResult.letterNo }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, inject, nextTick } from 'vue'
import api, { submitLetter, regeocode, getInputTips } from '../utils/api.js'

export default {
  name: 'WritePage',
  setup() {
    const userStore = inject('userStore')

    const form = reactive({
      姓名: '',
      手机号: '',
      身份证号: '',
      描述: '',
    })

    // 位置相关
    const locationQuery = ref('')
    const addressList = ref([])
    const selectedAddress = ref(null)
    const searching = ref(false)
    const showMap = ref(false)
    const mapInstance = ref(null)
    const marker = ref(null)
    const autoPhone = ref(false)

    const submitResult = ref(null)
    const submitting = ref(false)

    // 自动填手机号
    onMounted(() => {
      if (userStore.user?.phone) {
        form.手机号 = userStore.user.phone
        autoPhone.value = true
      }
      // 加载草稿
      const draft = localStorage.getItem('letterDraft')
      if (draft) {
        try {
          const data = JSON.parse(draft)
          Object.assign(form, data)
          localStorage.removeItem('letterDraft')
        } catch (e) {}
      }
    })

    const displayPhone = computed(() => {
      if (!form.手机号) return ''
      return form.手机号.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    })

    const canSubmit = computed(() => {
      return form.姓名 && form.手机号 && form.描述
    })

    // 搜索地址
    async function searchLocation() {
      if (!locationQuery.value.trim()) return
      searching.value = true
      addressList.value = []
      try {
        // 调用后端高德输入提示API
        const res = await getInputTips(locationQuery.value)
        addressList.value = (res.data?.tips || []).map(t => ({
          name: t.name,
          address: t.address || t.district,
          location: t.location,
          province: t.province || '',
          city: t.city || '',
          district: t.district || '',
        }))
      } catch (e) {
        console.warn('搜索地址失败，使用模拟数据', e)
        // Fallback: 模拟数据
        addressList.value = [
          { name: locationQuery.value, address: '示例地址', location: '116.397428,39.90923', province: '北京市', city: '北京市', district: '东城区' }
        ]
      }
      searching.value = false
    }

    async function selectAddress(addr) {
      selectedAddress.value = addr
      addressList.value = []
      locationQuery.value = addr.name

      // 尝试逆地理编码获取详细地址
      if (addr.location) {
        try {
          const [lng, lat] = addr.location.split(',')
          const res = await regeocode(lng, lat)
          if (res.data?.regeocode) {
            const rg = res.data.regeocode
            if (rg.addressComponent) {
              selectedAddress.value = {
                ...addr,
                address: rg.formattedAddress || rg.addressComponent?.building || addr.address,
                province: rg.addressComponent.province || addr.province,
                city: rg.addressComponent.city || addr.city,
                district: rg.addressComponent.district || addr.district,
              }
            }
          }
        } catch (e) {}
      }

      showMap.value = true
      await nextTick()
      // 在此处可以初始化高德地图（如果要显示地图）
      // 由于高德JS API需要Key，这里显示一个占位
    }

    function clearLocation() {
      selectedAddress.value = null
      locationQuery.value = ''
      addressList.value = []
      showMap.value = false
    }

    async function submitLetterHandler() {
      if (!canSubmit.value || submitting.value) return
      submitting.value = true
      submitResult.value = null

      try {
        const payload = {
          姓名: form.姓名,
          手机号: form.手机号,
          身份证号: form.身份证号 || '',
          描述: form.描述,
        }

        // 附加位置信息
        if (selectedAddress.value) {
          payload.location = selectedAddress.value.location || ''
          payload.address = selectedAddress.value.address || ''
          payload.province = selectedAddress.value.province || ''
          payload.city = selectedAddress.value.city || ''
          payload.district = selectedAddress.value.district || ''
        }

        const res = await submitLetter(payload)
        submitResult.value = {
          success: true,
          message: '✅ 诉求提交成功！我们将尽快处理。',
          letterNo: res.data['信件编号'],
        }
        resetForm()
      } catch (error) {
        submitResult.value = {
          success: false,
          message: `❌ 提交失败：${error.response?.data?.error || error.message}`,
        }
      } finally {
        submitting.value = false
      }
    }

    function resetForm() {
      form.姓名 = ''
      form.手机号 = userStore.user?.phone || ''
      form.身份证号 = ''
      form.描述 = ''
      clearLocation()
    }

    return {
      form,
      locationQuery,
      addressList,
      selectedAddress,
      searching,
      showMap,
      submitResult,
      submitting,
      autoPhone,
      displayPhone,
      canSubmit,
      searchLocation,
      selectAddress,
      clearLocation,
      submitLetter: submitLetterHandler,
      resetForm,
    }
  },
}
</script>

<style scoped>
.write-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-direction: column;
}

.page-header h1 {
  font-size: 22px;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.subtitle {
  color: #8c8c8c;
  margin: 4px 0 0;
  font-size: 14px;
}

.write-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: start;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.required {
  color: #ff4d4f;
}

.optional {
  color: #bfbfbf;
  font-weight: 400;
  font-size: 12px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #fff;
  color: #333;
}

.form-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22,119,255,0.1);
}

.form-input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

textarea.form-input {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* 位置搜索 */
.location-search {
  display: flex;
  gap: 8px;
}

.location-search input {
  flex: 1;
}

.btn-search {
  padding: 10px 14px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  color: #666;
}

.btn-search:hover:not(:disabled) {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f5ff;
}

.btn-search:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.address-list {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.address-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.15s;
}

.address-item:last-child {
  border-bottom: none;
}

.address-item:hover {
  background: #f0f5ff;
}

.address-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.address-detail {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.selected-location {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 8px;
  margin-top: 8px;
}

.location-info {
  flex: 1;
  min-width: 0;
}

.location-name {
  font-size: 14px;
  color: #1677ff;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-addr {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-remove {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.05);
  color: #999;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: #ff4d4f;
  color: #fff;
}

.map-container {
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  transition: height 0.3s ease;
}

/* 按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #1677ff;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #4096ff;
}

.btn-primary:disabled {
  background: #d9d9d9;
  color: #999;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 预览 */
.preview-section h3 {
  font-size: 15px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #333;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table tr:not(:last-child) td {
  border-bottom: 1px solid #f5f5f5;
}

.preview-table td {
  padding: 10px 0;
  font-size: 13px;
}

.preview-table td.label {
  color: #8c8c8c;
  width: 80px;
  white-space: nowrap;
  vertical-align: top;
}

.preview-table td.value {
  color: #333;
  word-break: break-all;
}

.preview-table td.value.description {
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 13px;
  color: #555;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.tag-channel {
  background: #f0f5ff;
  color: #1677ff;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.result-card.success {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.result-card.error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.result-card p {
  font-size: 14px;
}

.result-msg {
  color: #333;
}

.letter-no {
  color: #1677ff;
  font-weight: 500;
  margin-top: 4px;
  font-family: monospace;
  font-size: 14px;
}

@media (max-width: 768px) {
  .write-layout {
    grid-template-columns: 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
