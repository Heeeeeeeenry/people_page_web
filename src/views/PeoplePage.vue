<template>
  <div class="people-page">
    <!-- Header -->
    <div class="page-header">
      <h1>AI 民意助手</h1>
      <p class="subtitle">智能填写群众来信，快速生成规范信件</p>
    </div>

    <div class="chat-layout">
      <!-- Left: Chat Messages -->
      <div class="chat-section card">
        <div class="chat-messages" ref="messagesRef">
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            :class="['message', msg.role]"
          >
            <div class="message-avatar">
              <i v-if="msg.role === 'assistant'" class="fas fa-robot"></i>
              <i v-else class="fas fa-user"></i>
            </div>
            <div class="message-content">
              <div class="message-bubble" v-html="renderContent(msg.content)"></div>
              <div class="message-actions" v-if="msg.actions && msg.actions.length > 0">
                <button
                  v-for="(action, aidx) in msg.actions"
                  :key="aidx"
                  class="btn btn-sm"
                  :class="action.class || 'btn-primary'"
                  @click="handleAction(action)"
                >
                  <i :class="action.icon"></i>
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Loading indicator -->
          <div v-if="isLoading" class="message assistant">
            <div class="message-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-wrapper">
            <textarea
              v-model="inputText"
              placeholder="描述您要反映的问题..."
              @keydown.enter.exact="sendMessage"
              rows="2"
              class="form-input chat-input"
            ></textarea>
            <button
              class="btn btn-primary send-btn"
              :disabled="isLoading || !inputText.trim()"
              @click="sendMessage"
            >
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          <p class="input-hint">按 Enter 发送，Shift+Enter 换行</p>
        </div>
      </div>

      <!-- Right: AI Icon & Info -->
      <div class="info-section">
        <div class="ai-icon-card card">
          <div class="ai-icon-container" ref="aiIconRef">
            <div class="ai-icon-ring ring-1"></div>
            <div class="ai-icon-ring ring-2"></div>
            <div class="ai-icon-ring ring-3"></div>
            <div class="ai-icon-core">
              <i class="fas fa-robot"></i>
            </div>
          </div>
          <p class="ai-status">{{ aiStatusText }}</p>
        </div>

        <div class="tips-card card">
          <h3><i class="fas fa-lightbulb"></i> 使用提示</h3>
          <ul>
            <li>描述您要反映的群众诉求</li>
            <li>AI会自动提取关键信息</li>
            <li>确认信息后可提交生成信件</li>
            <li>提交后信件将进入处理流程</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import { getPrompt, getChatStreamUrl } from '../utils/api.js'
import { useRouter } from 'vue-router'

export default {
  name: 'PeoplePage',
  setup() {
    const router = useRouter()
    const messages = ref([])
    const inputText = ref('')
    const isLoading = ref(false)
    const messagesRef = ref(null)
    const aiIconRef = ref(null)
    const aiStatusText = ref('AI 已就绪')
    let systemPrompt = ''

    const renderContent = (content) => {
      // Convert markdown-like formatting to HTML
      return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)(:<br>|：<br>|: |：)/g, '<h4>$1</h4>')
        .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    }

    const handleAction = (action) => {
      if (action.type === 'route') {
        router.push(action.payload)
      } else if (action.type === 'fill') {
        // Fill the write form via localStorage
        localStorage.setItem('letterDraft', JSON.stringify(action.payload))
        router.push('/write')
      }
    }

    const sendMessage = async () => {
      const text = inputText.value.trim()
      if (!text || isLoading.value) return

      inputText.value = ''
      messages.value.push({ role: 'user', content: text })
      scrollToBottom()

      isLoading.value = true
      aiStatusText.value = 'AI 思考中...'

      try {
        // Build messages array
        const chatMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.value
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content })),
        ]

        const response = await fetch(getChatStreamUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatMessages }),
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''

        messages.value.push({ role: 'assistant', content: '' })
        let currentIdx = messages.value.length - 1

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data)
                if (parsed.done) {
                  // Check for actions
                  await processAIResponse(fullContent)
                  scrollToBottom()
                  break
                }
                if (parsed.chunk) {
                  fullContent += parsed.chunk
                  messages.value[currentIdx].content = fullContent
                  scrollToBottom()
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        messages.value.push({
          role: 'assistant',
          content: `❌ 请求失败：${error.message}。请检查网络连接后重试。`,
        })
      } finally {
        isLoading.value = false
        aiStatusText.value = 'AI 已就绪'
      }
    }

    const processAIResponse = async (content) => {
      // Check if AI suggests submitting a letter
      const submitMatch = content.match(/建议提交信件|生成信件|提交|生成信件格式/)
      const hasData = content.includes('姓名') && content.includes('描述')

      if (submitMatch || hasData) {
        // Try to extract structured data
        const draft = extractDraft(content)
        const lastMsg = messages.value[messages.value.length - 1]
        if (draft && Object.keys(draft).length > 0) {
          lastMsg.actions = [
            {
              label: '填写信件',
              icon: 'fas fa-pen',
              class: 'btn-primary',
              type: 'fill',
              payload: draft,
            },
          ]
        }
      }
    }

    const extractDraft = (content) => {
      const draft = {}
      const patterns = [
        { key: '姓名', regex: /姓名[：:]\s*([^\n,，]+)/ },
        { key: '手机号', regex: /手机号?[：:]\s*(\d{11})/ },
        { key: '身份证号', regex: /身份证[：:]\s*(\d{17}[\dXx])/ },
        { key: '一级分类', regex: /一级分类[：:]\s*([^\n,，]+)/ },
        { key: '二级分类', regex: /二级分类[：:]\s*([^\n,，]+)/ },
        { key: '三级分类', regex: /三级分类[：:]\s*([^\n,，]+)/ },
        { key: '描述', regex: /描述|诉求内容[：:]\s*([\s\S]+?)(?=\n\n|\n###|$)/ },
      ]

      for (const { key, regex } of patterns) {
        const match = content.match(regex)
        if (match) {
          draft[key] = match[1].trim()
        }
      }

      return draft
    }

    const scrollToBottom = async () => {
      await nextTick()
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight
      }
    }

    onMounted(async () => {
      try {
        const res = await getPrompt()
        systemPrompt = res.data.prompt

        messages.value = [
          {
            role: 'assistant',
            content: `👋 您好！我是民意智感 AI 助手。请问您要反映什么问题？请尽量详细描述事件的经过、涉及的单位或人员等信息，我会帮您整理成规范的群众来信。`,
          },
        ]
      } catch (error) {
        messages.value = [
          {
            role: 'assistant',
            content: `⚠️ 系统初始化失败，请检查后端服务是否已启动。`,
          },
        ]
      }
    })

    return {
      messages,
      inputText,
      isLoading,
      messagesRef,
      aiIconRef,
      aiStatusText,
      renderContent,
      handleAction,
      sendMessage,
    }
  },
}
</script>

<style scoped>
/* ==========================================================================
   首页 — 完整样式重写（保持功能不变，全面提升视觉质感）
   ========================================================================== */

.people-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100vh - 56px);
  background: linear-gradient(180deg, #f0f5ff 0%, #f5f7fa 40%, #f5f7fa 100%);
}

/* ---- 页面头部 ---- */
.page-header {
  text-align: center;
  padding: 12px 0 6px;
  position: relative;
}

.page-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #1677ff, #69b1ff);
  border-radius: 4px;
}

.page-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #1677ff, #0958d9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #8c8c8c;
  font-size: 14px;
  margin-bottom: 8px;
}

/* ---- 聊天布局 ---- */
.chat-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: start;
  flex: 1;
}

/* ---- 卡片通用样式 ---- */
.card {
  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.06),
    0 8px 24px rgba(0, 0, 0, 0.08);
}

/* ---- 聊天区域 ---- */
.chat-section {
  height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  position: relative;
}

/* ---- 消息列表 ---- */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

/* ---- 消息气泡 ---- */
.message {
  display: flex;
  gap: 10px;
  max-width: 85%;
  animation: messageIn 0.35s ease-out both;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

/* 头像 */
.message-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 15px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.message.assistant .message-avatar {
  background: linear-gradient(135deg, #e6f0ff, #bae0ff);
  color: #1677ff;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: white;
}

/* 气泡 */
.message-bubble {
  padding: 12px 18px;
  border-radius: 16px;
  line-height: 1.75;
  font-size: 14px;
  word-break: break-word;
}

.message.assistant .message-bubble {
  background: #f7f8fc;
  border: 1px solid #e8ecf2;
  border-top-left-radius: 4px;
  color: #262626;
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: white;
  border-bottom-right-radius: 4px;
}

/* 气泡内标题和代码 */
.message-bubble :deep(h4) {
  font-size: 14px;
  font-weight: 600;
  margin: 10px 0 4px;
  color: inherit;
}

.message-bubble :deep(h4:first-child) {
  margin-top: 0;
}

.message-bubble :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}

.message.user .message-bubble :deep(pre) {
  background: rgba(255, 255, 255, 0.15);
}

.message-bubble :deep(code) {
  font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
}

.message-bubble :deep(strong) {
  font-weight: 600;
}

/* 操作按钮 */
.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-sm {
  padding: 7px 16px;
  font-size: 12px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-sm:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.25);
}

/* ---- 打字指示器 ---- */
.typing-indicator {
  display: flex;
  gap: 5px;
  padding: 14px 8px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #1677ff;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: 0s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1.15); }
}

/* ---- 输入区域 ---- */
.chat-input-area {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fafbfc;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  min-height: 46px;
  max-height: 120px;
  resize: none;
  padding: 12px 16px;
  border: 1.5px solid #e0e4ea;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  transition: all 0.25s ease;
  background: #fff;
  outline: none;
  font-family: inherit;
}

.chat-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.1);
}

.chat-input::placeholder {
  color: #bfbfbf;
}

.send-btn {
  height: 46px;
  width: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 18px;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.3);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(22, 119, 255, 0.4);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  background: #d9d9d9;
  color: #fff;
  cursor: not-allowed;
  box-shadow: none;
}

.input-hint {
  color: #a8a8a8;
  font-size: 11px;
  margin-top: 8px;
  text-align: right;
}

/* ---- 右侧信息区 ---- */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 80px;
}

/* AI 图标卡片 */
.ai-icon-card {
  text-align: center;
  padding: 36px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.ai-icon-container {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 0 auto 18px;
}

.ai-icon-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2.5px solid transparent;
}

.ring-1 {
  width: 110px;
  height: 110px;
  border-top-color: #1677ff;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-left-color: transparent;
  animation: spin 3s linear infinite;
}

.ring-2 {
  width: 90px;
  height: 90px;
  border-top-color: transparent;
  border-right-color: #52c41a;
  border-bottom-color: transparent;
  border-left-color: transparent;
  animation: spin 2.2s linear infinite reverse;
}

.ring-3 {
  width: 70px;
  height: 70px;
  border-top-color: transparent;
  border-right-color: transparent;
  border-bottom-color: #faad14;
  border-left-color: transparent;
  animation: spin 1.6s linear infinite;
}

@keyframes spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

.ai-icon-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #1677ff, #0958d9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 22px;
  box-shadow: 0 4px 16px rgba(22, 119, 255, 0.35);
}

.ai-status {
  color: #8c8c8c;
  font-size: 13px;
  font-weight: 500;
}

/* 使用提示卡片 */
.tips-card {
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.06);
}

.tips-card h3 {
  font-size: 15px;
  margin-bottom: 14px;
  color: #262626;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tips-card h3 i {
  color: #faad14;
  font-size: 16px;
}

.tips-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-card li {
  padding: 7px 0 7px 20px;
  color: #595959;
  font-size: 13px;
  position: relative;
  line-height: 1.6;
  border-bottom: 1px solid #f5f5f5;
}

.tips-card li:last-child {
  border-bottom: none;
}

.tips-card li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 14px;
  width: 6px;
  height: 6px;
  background: #1677ff;
  border-radius: 50%;
  opacity: 0.6;
}

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .people-page {
    padding: 16px;
    gap: 16px;
  }

  .page-header h1 {
    font-size: 22px;
  }

  .chat-layout {
    grid-template-columns: 1fr;
  }

  .info-section {
    display: none;
  }

  .chat-section {
    height: calc(100vh - 160px);
  }

  .message {
    max-width: 92%;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .chat-layout {
    grid-template-columns: 1fr 260px;
    gap: 16px;
  }

  .info-section {
    gap: 12px;
  }

  .ai-icon-card {
    padding: 24px 16px;
  }
}
</style>
