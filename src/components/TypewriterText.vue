<template>
  <div class="typewriter-container" ref="containerRef" @scroll="onScroll" @wheel="onWheel">
    <div class="typewriter-content">
      <span class="typewriter-text">{{ displayText }}</span>
      <span v-if="isTyping" class="typewriter-cursor">▌</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  typing: { type: Boolean, default: false },
  speed: { type: Number, default: 25 } // ms per character
})

const emit = defineEmits(['done'])

const containerRef = ref(null)
const displayText = ref('')
const isTyping = ref(false)
const userScrolled = ref(false)
const typeQueue = ref([])
const typeTimer = ref(null)

// Process the character queue
function processQueue() {
  if (typeQueue.value.length === 0) {
    isTyping.value = false
    typeTimer.value = null
    emit('done')
    return
  }
  isTyping.value = true
  displayText.value += typeQueue.value.shift()
  scrollToBottom()
  typeTimer.value = setTimeout(processQueue, props.speed)
}

// Watch for new text
watch(() => props.text, (newText) => {
  if (!newText) return
  // Find the delta: what characters are new?
  const oldLen = displayText.value.length
  const newChars = [...newText].slice(oldLen)
  if (newChars.length === 0) return
  typeQueue.value.push(...newChars)
  if (!typeTimer.value) processQueue()
}, { immediate: true })

// Also reset if text changes completely (new transcription)
watch(() => props.text, (newText, oldText) => {
  if (newText && oldText && newText.length < oldText.length) {
    // Text was reset, clear
    displayText.value = ''
    typeQueue.value = [...newText]
    if (typeTimer.value) clearTimeout(typeTimer.value)
    processQueue()
  }
})

// Auto-scroll logic
function scrollToBottom() {
  if (userScrolled.value) return
  nextTick(() => {
    const el = containerRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

let scrollTimeout = null
function onScroll() {
  const el = containerRef.value
  if (!el) return
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
  if (atBottom) {
    userScrolled.value = false
  } else {
    userScrolled.value = true
    // Auto-resume after 3 seconds of no manual scrolling
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      userScrolled.value = false
      scrollToBottom()
    }, 3000)
  }
}

function onWheel(e) {
  if (e.deltaY < 0) {
    // Scrolling up - pause auto-scroll
    userScrolled.value = true
  }
}

onBeforeUnmount(() => {
  clearTimeout(typeTimer.value)
  clearTimeout(scrollTimeout)
})
</script>

<style scoped>
.typewriter-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 12px 16px;
  background: #1a1a2e;
  border-radius: 8px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #e0e0e0;
}

.typewriter-content {
  white-space: pre-wrap;
  word-break: break-all;
}

.typewriter-cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
  color: #4fc3f7;
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.typewriter-container::-webkit-scrollbar {
  width: 6px;
}

.typewriter-container::-webkit-scrollbar-track {
  background: transparent;
}

.typewriter-container::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
</style>
