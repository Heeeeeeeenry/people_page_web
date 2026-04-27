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

  <!-- 提交确认弹窗 -->
  <Teleport to="body">
    <div v-if="showSubmitDialog" class="modal-overlay" @click.self="showSubmitDialog = false">
      <div class="modal-card">
        <div class="modal-header">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z" fill="#52c41a"/></svg>
          <h3>信件已为您准备好</h3>
          <button class="modal-close" @click="showSubmitDialog = false">&times;</button>
        </div>
        <div class="modal-body">
          <table class="preview-table">
            <tbody>
              <tr><td class="label">群众姓名</td><td class="value">{{ submitDraft.姓名 || '（未填写）' }}</td></tr>
              <tr><td class="label">手机号</td><td class="value">{{ submitDraft.手机号 || '（未填写）' }}</td></tr>
              <tr><td class="label">身份证号</td><td class="value">{{ submitDraft.身份证号 || '（未填写）' }}</td></tr>
              <tr><td class="label">诉求分类</td><td class="value">{{ submitDraft['一级分类'] || '' }}{{ submitDraft['二级分类'] ? ' / ' + submitDraft['二级分类'] : '' }}{{ submitDraft['三级分类'] ? ' / ' + submitDraft['三级分类'] : '' }}</td></tr>
              <tr><td class="label">诉求描述</td><td class="value description">{{ submitDraft.描述 || '（未填写）' }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleEditDraft">修改</button>
          <button class="btn btn-primary" @click="handleSubmitDraft">确认提交</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import { getPrompt, getChatStreamUrl } from '../utils/api.js'
import api from '../utils/api.js'
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
    const devCode = ref('')

    // 提交确认弹窗
    const showSubmitDialog = ref(false)
    const submitDraft = ref({})
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

    // 打开编辑页修改草稿
    const handleEditDraft = () => {
      localStorage.setItem('letterDraft', JSON.stringify(submitDraft.value))
      showSubmitDialog.value = false
      router.push('/write')
    }

    // 直接提交信件
    const handleSubmitDraft = async () => {
      const token = localStorage.getItem('citizen_token')
      if (!token) {
        router.push('/login')
        return
      }
      try {
        const { default: api } = await import('../utils/api.js')
        const res = await api.post('/letter/submit', submitDraft.value)
        if (res.data?.letter_no) {
          messages.value.push({
            role: 'assistant',
            content: `✅ 信件已成功提交！信件编号：**${res.data.letter_no}**`
          })
          submitDraft.value = {}
        } else {
          messages.value.push({
            role: 'assistant',
            content: `❌ 提交失败：${res.data?.error || '未知错误'}`
          })
        }
      } catch (e) {
        messages.value.push({
          role: 'assistant',
          content: `❌ 提交失败：${e.response?.data?.error || e.message || '网络错误'}`
        })
      }
      showSubmitDialog.value = false
    }

    const sendMessage = async () => {
      const text = inputText.value.trim()
      if (!text || isLoading.value) return

      // 重置工具命令计数器
      toolCommandCount = 0

      inputText.value = ''
      messages.value.push({ role: 'user', content: text })
      saveMessages()
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
                  // Check for actions and tool commands
                  const toolResult = await processToolCommands(fullContent)
                  if (toolResult) {
                    // 有工具命令需要执行，重新发起AI请求
                    await continueWithToolResult(toolResult)
                  } else {
                    // 没有工具命令，正常处理
                    await processAIResponse(fullContent)
                    saveMessages()
                  }
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

    // ===== 工具命令处理（:["command","params"]） =====

    const toolCommandRegex = /:\["(map-search|classify|check-phone)",\s*"([^"]+)"\]/g
    let toolCommandCount = 0  // 防止无限循环

    // 解析并执行工具命令，返回需要继续对话的结果
    const processToolCommands = async (content) => {
      const commands = [...content.matchAll(toolCommandRegex)]
      if (commands.length === 0) return null

      // 最多执行 3 次工具命令，防止无限循环
      toolCommandCount++
      if (toolCommandCount > 3) {
        console.warn('工具命令执行次数过多，停止')
        return null
      }

      // 从聊天内容中移除命令文本
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg) {
        lastMsg.content = content.replace(toolCommandRegex, '').trim()
      }

      const results = []
      for (const match of commands) {
        const [, command, param] = match
        aiStatusText.value = `🔍 正在${command === 'map-search' ? '查询地址' : command === 'classify' ? '分析分类' : '验证信息'}...`
        const result = await executeToolCommand(command, param)
        if (result) results.push(result)
      }
      return results.length > 0 ? results.join('\n') : null
    }

    // 执行具体工具命令
    const executeToolCommand = async (command, param) => {
      try {
        if (command === 'map-search') {
          const res = await api.get('/amap/poi/search', { params: { keywords: param } })
          const pois = res.data?.pois || []
          if (pois.length > 0) {
            const poi = pois[0]
            return `[map-search结果] 查询"${param}"结果：${poi.name}，地址：${poi.address}，坐标：${poi.location}`
          }
          return `[map-search结果] 未找到"${param}"的相关信息`
        }
        if (command === 'classify') {
          const res = await api.post('/letter/classify', { 描述: param })
          const data = res.data?.data
          if (data) {
            return `[classify结果] 分类建议：${data.category_l1 || ''}/${data.category_l2 || ''}/${data.category_l3 || ''}，处理单位：${data.suggested_unit || ''}`
          }
          return `[classify结果] 分类分析完成`
        }
      } catch (e) {
        return `[${command}错误] ${e.response?.data?.error || e.message}`
      }
      return null
    }

    // 将工具执行结果回传给AI，继续对话
    const continueWithToolResult = async (toolResult) => {
      isLoading.value = true
      try {
        // 构建新的消息列表，追加工具执行结果
        const chatMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.value
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content })),
          { role: 'system', content: `工具执行结果：\n${toolResult}\n\n请根据以上结果继续处理。` },
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
                  // 递归处理嵌套的工具命令
                  const nestedResult = await processToolCommands(fullContent)
                  if (nestedResult) {
                    await continueWithToolResult(nestedResult)
                  } else {
                    await processAIResponse(fullContent)
                    saveMessages()
                  }
                  break
                }
                if (parsed.chunk) {
                  fullContent += parsed.chunk
                  messages.value[currentIdx].content = fullContent
                  scrollToBottom()
                }
              } catch (e) { /* skip */ }
            }
          }
        }
      } catch (error) {
        messages.value.push({
          role: 'assistant',
          content: `❌ 工具调用失败：${error.message}`,
        })
      } finally {
        isLoading.value = false
        aiStatusText.value = 'AI 已就绪'
      }
    }

    const processAIResponse = async (content) => {
      // Check if AI suggests submitting a letter
      const submitMatch = content.match(/建议提交信件|生成信件|提交|生成信件格式|信件已经为您准备好/)
      const hasData = content.includes('姓名') && content.includes('描述')

      if (submitMatch || hasData) {
        // Try to extract structured data
        const draft = extractDraft(content)
        // 即使提取不完整，只要 AI 表示"准备好"就弹出
        if (submitMatch) {
          // 补全缺失字段
          if (!draft['姓名']) draft['姓名'] = content.match(/群众姓名[|:：]\s*([^|\n]+)/)?.[1]?.trim() || content.match(/姓名[|:：]\s*([^|\n]+)/)?.[1]?.trim() || ''
          if (!draft['描述']) draft['描述'] = content.match(/描述[|:：]\s*([^|\n]+(?:\n[^|\n]+)*)/)?.[1]?.trim() || ''
          // 弹窗
          submitDraft.value = draft
          setTimeout(() => { showSubmitDialog.value = true }, 500)
        }
        if (draft && Object.keys(draft).length > 0) {
          // 保留填写信件按钮
          const lastMsg = messages.value[messages.value.length - 1]
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
      // 标准 key:value 格式
      const patterns = [
        { key: '姓名', regex: /姓名[：:]\s*([^\n,，]+)/ },
        { key: '手机号', regex: /手机号?[：:]\s*(\d{11})/ },
        { key: '身份证号', regex: /身份证[：:]\s*(\d{17}[\dXx])/ },
        { key: '一级分类', regex: /一级分类[：:]\s*([^\n,，]+)/ },
        { key: '二级分类', regex: /二级分类[：:]\s*([^\n,，]+)/ },
        { key: '三级分类', regex: /三级分类[：:]\s*([^\n,，]+)/ },
        { key: '描述', regex: /描述[：:]\s*([\s\S]+?)(?=\n\n|\n###|$)/ },
      ]

      for (const { key, regex } of patterns) {
        const match = content.match(regex)
        if (match) {
          draft[key] = match[1].trim()
        }
      }

      // 兼容 markdown 表格格式：| 项目 | 内容 |
      const tableRowRegex = /\|\s*([^|]+)\s*\|\s*([^|]+)\s*(?:\|)?/g
      let tableMatch
      while ((tableMatch = tableRowRegex.exec(content)) !== null) {
        const label = tableMatch[1].trim()
        const value = tableMatch[2].trim()
        if (value && value !== '-') {
          if (label.includes('分类')) {
            const parts = value.split('/').map(s => s.trim()).filter(Boolean)
            if (parts.length >= 1 && !draft['一级分类']) draft['一级分类'] = parts[0]
            if (parts.length >= 2 && !draft['二级分类']) draft['二级分类'] = parts[1]
            if (parts.length >= 3 && !draft['三级分类']) draft['三级分类'] = parts[2]
          } else if (label.includes('姓名') && !draft['姓名']) {
            draft['姓名'] = value
          } else if ((label.includes('手机') || label.includes('电话')) && !draft['手机号']) {
            draft['手机号'] = value
          } else if (label.includes('身份证') && !draft['身份证号']) {
            draft['身份证号'] = value
          } else if (label.includes('描述') || label.includes('诉求')) {
            draft['描述'] = value
          }
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

    // 保存聊天记录到 sessionStorage（刷新/关闭即清空）
    const STORAGE_KEY = 'chat_messages'
    const saveMessages = () => {
      try {
        const data = messages.value.filter(m => m.content && m.role)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {}
    }

    onMounted(async () => {
      // 优先从 sessionStorage 恢复对话
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const restored = JSON.parse(saved)
          if (Array.isArray(restored) && restored.length > 0) {
            messages.value = restored
          }
        } catch {}
      }

      // 如果没有历史记录，加载提示词并显示欢迎消息
      if (messages.value.length === 0) {
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
        saveMessages()
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

/* ---- 提交确认弹窗 ---- */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}
.modal-card {
  background: #fff;
  border-radius: 16px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease;
}
.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px 0;
}
.modal-header h3 {
  flex: 1;
  font-size: 17px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}
.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  color: #8c8c8c;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.modal-close:hover {
  background: #f5f5f5;
  color: #262626;
}
.modal-body {
  padding: 16px 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-body .preview-table {
  width: 100%;
  border-collapse: collapse;
}
.modal-body .preview-table td {
  padding: 8px 10px;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: top;
}
.modal-body .preview-table td.label {
  color: #8c8c8c;
  white-space: nowrap;
  width: 80px;
}
.modal-body .preview-table td.value {
  color: #262626;
}
.modal-body .preview-table td.description {
  white-space: pre-wrap;
  line-height: 1.6;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
}
.modal-footer .btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}
.modal-footer .btn-primary {
  background: #1677ff;
  color: #fff;
}
.modal-footer .btn-primary:hover {
  background: #0958d9;
}
.modal-footer .btn-secondary {
  background: #f5f5f5;
  color: #595959;
}
.modal-footer .btn-secondary:hover {
  background: #e8e8e8;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
