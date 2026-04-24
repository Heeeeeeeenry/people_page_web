<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 标题 -->
      <div class="login-header">
        <div class="logo">
          <svg viewBox="0 0 40 40" width="48" height="48">
            <rect x="4" y="10" width="32" height="24" rx="4" fill="#1677ff" opacity="0.15"/>
            <path d="M8 18 L20 12 L32 18 L32 30 L8 30Z" fill="#1677ff" opacity="0.3"/>
            <path d="M12 21 L20 17 L28 21 L28 28 L12 28Z" fill="#1677ff"/>
            <circle cx="20" cy="22" r="2" fill="#fff"/>
          </svg>
        </div>
        <h1>民意直通车</h1>
        <p class="subtitle">市民诉求直达政府，为民服务零距离</p>
      </div>

      <!-- 绑定手机号（微信新用户扫码后） -->
      <div v-if="step === 'bind' && bindWxOpenid" class="form-step">
        <div class="bind-header">
          <svg viewBox="0 0 24 24" width="40" height="40">
            <path d="M8.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="#07c160"/>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#07c160" opacity="0.5"/>
          </svg>
          <h3>绑定手机号</h3>
          <p>微信首次登录，请绑定手机号完成注册</p>
        </div>
        <div class="input-group">
          <label>手机号</label>
          <div class="phone-input">
            <span class="prefix">+86</span>
            <input v-model="bindPhone" type="tel" maxlength="11" placeholder="请输入手机号" />
          </div>
        </div>
        <div class="input-group">
          <label>验证码</label>
          <div class="code-input">
            <input v-model="bindCode" type="text" maxlength="6" placeholder="请输入验证码" inputmode="numeric" />
            <button class="btn-resend" :disabled="bindCountdown > 0" @click="sendBindCode">
              {{ bindCountdown > 0 ? `${bindCountdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>
        <p v-if="bindError" class="error-text">{{ bindError }}</p>
        <button class="btn-primary" :disabled="!bindPhone || bindCode.length < 4 || binding" @click="handleBind">
          {{ binding ? '绑定中...' : '绑定并登录' }}
        </button>
        <button class="btn-text" @click="cancelBind">使用手机号登录</button>
      </div>

      <!-- 步骤1: 输入手机号 -->
      <div v-else-if="step === 'phone'" class="form-step">
        <div class="input-group">
          <label>手机号</label>
          <div class="phone-input">
            <span class="prefix">+86</span>
            <input
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入手机号"
              @input="validatePhone"
            />
          </div>
          <p v-if="phoneError" class="error-text">{{ phoneError }}</p>
        </div>
        <button
          class="btn-primary"
          :disabled="!phoneValid || sendingCode"
          @click="sendCode"
        >
          {{ sendingCode ? '发送中...' : '获取验证码' }}
        </button>
      </div>

      <!-- 步骤2: 输入验证码 -->
      <div v-else-if="step === 'code'" class="form-step">
        <div class="input-group">
          <label>验证码</label>
          <p class="phone-hint">验证码已发送至 {{ phone }}</p>
          <div class="code-input">
            <input
              v-model="code"
              type="text"
              maxlength="6"
              placeholder="请输入6位验证码"
              inputmode="numeric"
              pattern="[0-9]*"
            />
            <button
              class="btn-resend"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '重新发送' }}
            </button>
          </div>
          <p v-if="codeError" class="error-text">{{ codeError }}</p>
          <p v-if="devCode" class="dev-code-hint">
            开发模式验证码：<strong>{{ devCode }}</strong>
          </p>
        </div>
        <button
          class="btn-primary"
          :disabled="code.length < 4 || loggingIn"
          @click="handleLogin"
        >
          {{ loggingIn ? '登录中...' : '登录' }}
        </button>
        <button class="btn-text" @click="step = 'phone'">
          换一个手机号
        </button>
      </div>

      <!-- 微信扫码登录 -->
      <div class="wx-section">
        <div class="divider"><span>或</span></div>
        <button class="btn-wechat" @click="handleWechatLogin" :disabled="wechatLogging">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M8.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="#fff"/>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.3"/>
          </svg>
          <span>{{ wechatLogging ? '跳转中...' : '微信扫码登录' }}</span>
        </button>
      </div>

      <!-- 底部 -->
      <div class="login-footer">
        <p>登录即代表同意 <a href="#">《用户服务协议》</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../utils/api.js'

const router = useRouter()
const route = useRoute()
const userStore = inject('userStore')

// 微信开放平台配置
const WECHAT_OPEN_APPID = 'your_wx_open_appid' // 需替换为实际的开放平台AppID
const WECHAT_CALLBACK_URL = encodeURIComponent('http://localhost:8081/api/auth/wechat/callback')

// 标准密码/验证码登录状态
const step = ref('phone')
const phone = ref('')
const code = ref('')
const phoneValid = ref(false)
const phoneError = ref('')
const codeError = ref('')
const sendingCode = ref(false)
const loggingIn = ref(false)
const countdown = ref(0)
let countdownTimer = null

// 微信扫码登录状态
const wechatLogging = ref(false)

// 微信绑定手机号状态
const bindWxOpenid = ref('')
const bindPhone = ref('')
const bindCode = ref('')
const bindError = ref('')
const binding = ref(false)
const bindCountdown = ref(0)
let bindTimer = null

onMounted(() => {
  // 检查URL参数：是否需要绑定手机号（从微信回调跳转过来）
  if (route.query.need_bind_phone && route.query.wx_openid) {
    bindWxOpenid.value = route.query.wx_openid
    step.value = 'bind'
  }

  // 监听来自 WechatCallback 页面的 postMessage（popup模式）
  window.addEventListener('message', handleWechatMessage)
})

// 手机号验证
function validatePhone() {
  phoneError.value = ''
  phoneValid.value = /^1[3-9]\d{9}$/.test(phone.value)
  if (phone.value.length === 11 && !phoneValid.value) {
    phoneError.value = '请输入正确的手机号'
  }
}

const devCode = ref('')

async function sendCode() {
  if (!phoneValid.value || sendingCode.value) return
  sendingCode.value = true
  devCode.value = ''
  try {
    const res = await api.post('/auth/send-code', { phone: phone.value })
    if (res.data.code) {
      devCode.value = res.data.code
    }
    step.value = 'code'
    startCountdown()
  } catch (e) {
    phoneError.value = e.response?.data?.error || '发送验证码失败，请重试'
  } finally {
    sendingCode.value = false
  }
}

function startCountdown() {
  countdown.value = 60
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)
}

async function handleLogin() {
  if (code.value.length < 4 || loggingIn.value) return
  loggingIn.value = true
  codeError.value = ''
  try {
    const res = await api.post('/auth/login', {
      phone: phone.value,
      code: code.value,
    })
    const { token, user } = res.data
    localStorage.setItem('citizen_token', token)
    localStorage.setItem('citizen_user', JSON.stringify(user))
    userStore.token = token
    userStore.user = user
    userStore.isLoggedIn = true

    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    codeError.value = e.response?.data?.error || '登录失败，请重试'
  } finally {
    loggingIn.value = false
  }
}

// ===== 微信扫码登录 =====
function handleWechatLogin() {
  if (WECHAT_OPEN_APPID === 'your_wx_open_appid') {
    phoneError.value = '微信开放平台尚未配置，请在 config.yaml 中设置 app_id 和 app_secret'
    step.value = 'phone'
    return
  }

  wechatLogging.value = true

  // 打开微信开放平台扫码页面（弹出新窗口）
  const state = 'wx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  localStorage.setItem('wechat_login_state', state)

  // 方式1：弹出窗口（推荐）
  const wechatURL = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_OPEN_APPID}&redirect_uri=${WECHAT_CALLBACK_URL}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`
  window.open(wechatURL, '_blank', 'width=700,height=600,menubar=no,toolbar=no,location=no')

  // 方式2：直接跳转（备选，可以改成直接跳转）
  // window.location.href = wechatURL

  // 恢复按钮状态（实际登录完成在 postMessage 回调中处理）
  setTimeout(() => { wechatLogging.value = false }, 1000)
}

// 处理来自 WechatCallback 页面的消息
function handleWechatMessage(event) {
  // 安全校验：只接受本页面的 postMessage
  if (event.data && event.data.type === 'wechat-login') {
    const { token, user } = event.data
    localStorage.setItem('citizen_token', token)
    localStorage.setItem('citizen_user', JSON.stringify(user))
    userStore.token = token
    userStore.user = user
    userStore.isLoggedIn = true

    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } else if (event.data && event.data.type === 'wechat-need-bind') {
    bindWxOpenid.value = event.data.wx_openid
    step.value = 'bind'
  }
}

// ===== 微信绑定手机号 =====
async function sendBindCode() {
  if (!bindPhone.value || bindCountdown.value > 0) return
  bindError.value = ''
  try {
    const res = await api.post('/auth/send-code', { phone: bindPhone.value })
    bindCountdown.value = 60
    clearInterval(bindTimer)
    bindTimer = setInterval(() => {
      bindCountdown.value--
      if (bindCountdown.value <= 0) clearInterval(bindTimer)
    }, 1000)
  } catch (e) {
    bindError.value = e.response?.data?.error || '发送验证码失败'
  }
}

async function handleBind() {
  if (!bindPhone.value || bindCode.value.length < 4 || binding.value) return
  binding.value = true
  bindError.value = ''
  try {
    const res = await api.post('/auth/wechat/bind-phone', {
      wx_openid: bindWxOpenid.value,
      phone: bindPhone.value,
      code: bindCode.value,
    })
    const { token, user } = res.data
    localStorage.setItem('citizen_token', token)
    localStorage.setItem('citizen_user', JSON.stringify(user))
    userStore.token = token
    userStore.user = user
    userStore.isLoggedIn = true

    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    bindError.value = e.response?.data?.error || '绑定失败，请重试'
  } finally {
    binding.value = false
  }
}

function cancelBind() {
  bindWxOpenid.value = ''
  bindPhone.value = ''
  bindCode.value = ''
  bindError.value = ''
  step.value = 'phone'
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f4ff 0%, #f0f5ff 100%);
  padding: 20px;
}

.login-card {
  width: 400px;
  max-width: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  padding: 40px 32px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  margin-bottom: 12px;
}

.login-header h1 {
  font-size: 24px;
  color: #1a1a2e;
  margin: 0 0 8px;
  font-weight: 600;
}

.subtitle {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
}

.form-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  text-align: left;
}

.input-group label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
}

.phone-input {
  display: flex;
  align-items: center;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.phone-input:focus-within {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22,119,255,0.1);
}

.phone-input .prefix {
  padding: 10px 12px;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
  border-right: 1px solid #d9d9d9;
}

.phone-input input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-size: 16px;
}

.phone-input input::placeholder {
  color: #bfbfbf;
}

.code-input {
  display: flex;
  gap: 8px;
}

.code-input input {
  flex: 1;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.code-input input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22,119,255,0.1);
}

.btn-resend {
  white-space: nowrap;
  padding: 10px 16px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-resend:hover:not(:disabled) {
  color: #1677ff;
  border-color: #1677ff;
}

.btn-resend:disabled {
  cursor: not-allowed;
  color: #bfbfbf;
}

.phone-hint {
  font-size: 12px;
  color: #8c8c8c;
  margin: -4px 0 12px;
}

.error-text {
  font-size: 12px;
  color: #ff4d4f;
  margin: 4px 0 0;
}

.dev-code-hint {
  font-size: 13px;
  color: #fa8c16;
  background: #fff7e6;
  border: 1px dashed #ffd591;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 8px 0 0;
  text-align: center;
}

.dev-code-hint strong {
  font-size: 18px;
  letter-spacing: 3px;
  color: #d46b08;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #4096ff;
}

.btn-primary:disabled {
  background: #d9d9d9;
  color: #999;
  cursor: not-allowed;
}

.btn-text {
  background: none;
  border: none;
  color: #1677ff;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

.btn-text:hover {
  color: #4096ff;
}

.wx-section {
  margin-top: 24px;
}

.divider {
  text-align: center;
  margin-bottom: 16px;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: #f0f0f0;
}

.divider span {
  position: relative;
  background: #fff;
  padding: 0 12px;
  color: #bfbfbf;
  font-size: 12px;
}

.btn-wechat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-wechat:hover:not(:disabled) {
  background: #06ad56;
  box-shadow: 0 2px 8px rgba(7,193,96,0.3);
}

.btn-wechat:disabled {
  background: #95e5b0;
  cursor: not-allowed;
}

.bind-header {
  text-align: center;
  margin-bottom: 8px;
}

.bind-header h3 {
  font-size: 18px;
  color: #1a1a2e;
  margin: 8px 0 4px;
}

.bind-header p {
  font-size: 13px;
  color: #8c8c8c;
  margin: 0;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
}

.login-footer p {
  font-size: 12px;
  color: #bfbfbf;
  margin: 0;
}

.login-footer a {
  color: #1677ff;
  text-decoration: none;
}
</style>
