<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { findGoal } from '../data/goals'
import { findAvatar } from '../data/avatars'
import { useNavTalkRealtime } from '../composables/useNavTalkRealtime'

const props = defineProps<{
  goalId: string
  avatarId: string
}>()

const router = useRouter()
const videoRef = ref<HTMLVideoElement | null>(null)
const navtalk = useNavTalkRealtime(videoRef)
const {
  chatMessages,
  manualMessage,
  isVideoStreaming,
  isCallActive,
  isConnecting,
  assistantThinking,
  userSpeaking,
  errorMessage,
  sessionStatus,
  clearHistory,
  toggleSession,
  sendTextMessage,
} = navtalk

const goal = computed(() => findGoal(props.goalId))
const avatar = computed(() => findAvatar(props.avatarId))

watchEffect(() => {
  if (!goal.value || !avatar.value) {
    router.replace('/')
  }
})

const sessionPrompt = computed(() => {
  if (!goal.value || !avatar.value) return navtalk.config.prompt
  return `You are ${avatar.value.name}, a ${avatar.value.persona.toLowerCase()} for English learners.
Focus on the "${goal.value.title}" pathway: ${goal.value.description}.
Ask short, coaching questions, give vivid examples, and correct mistakes gently.
Always end each turn with a suggestion for the learner to speak next.`
})

watchEffect(() => {
  if (sessionPrompt.value) {
    navtalk.setPrompt(sessionPrompt.value)
  }
})

const sessionLabel = computed(() => {
  switch (sessionStatus.value) {
    case 'connected':
      return 'Live'
    case 'connecting':
      return 'Connecting'
    case 'error':
      return 'Issue'
    default:
      return 'Idle'
  }
})

function handleManualSubmit(event: Event) {
  event.preventDefault()
  sendTextMessage()
}

function goBack() {
  router.push({ name: 'avatars', params: { goalId: props.goalId } })
}
</script>

<template>
  <section v-if="goal && avatar" class="session-layout">
    <div class="video-panel app-panel">
      <div class="breadcrumbs">
        <button class="link-like" @click="goBack">Back to Avatars</button>
        <span> / </span>
        <strong>Live Lesson</strong>
      </div>
      <div class="session-meta">
        <div>
          <span class="text-pill">{{ goal.title }}</span>
          <h2>{{ avatar.name }}</h2>
          <p>{{ avatar.persona }} - {{ avatar.description }}</p>
        </div>
        <div class="status-chip" :class="sessionStatus">
          <span class="dot"></span>
          {{ sessionLabel }}
        </div>
      </div>

      <div class="video-wrapper">
        <video ref="videoRef" autoplay playsinline></video>
        <div v-if="!isVideoStreaming" class="video-placeholder">
          <img :src="avatar.photo" :alt="avatar.name" />
          <div class="overlay">
            <p>Start the session to see {{ avatar.name }} go live.</p>
          </div>
        </div>
      </div>

      <div class="control-row">
        <button class="cta-button" :class="{ danger: isCallActive }" @click="toggleSession">
          <span v-if="isCallActive || isConnecting">Hang Up</span>
          <span v-else>Start call</span>
        </button>
        <div class="secondary-controls">
          <button type="button" class="ghost" disabled>Captions</button>
          <button type="button" class="ghost" disabled>Mute</button>
        </div>
      </div>

      <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
    </div>

    <div class="chat-panel app-panel">
      <header class="chat-header">
        <div>
          <h3>Live transcript</h3>
          <p v-if="assistantThinking">Tutor is thinking...</p>
          <p v-else-if="userSpeaking">Listening...</p>
        </div>
        <button class="ghost" type="button" @click="clearHistory">Clear</button>
      </header>

      <div class="chat-stream" role="log">
        <p v-if="!chatMessages.length" class="empty-state">
          Your conversation history will appear here in real-time.
        </p>
        <article
          v-for="message in chatMessages"
          :key="message.id"
          :class="['chat-bubble', message.role]"
        >
          <span class="role">{{ message.role === 'assistant' ? avatar.name : 'You' }}</span>
          <p>
            {{ message.text }}
            <span v-if="message.streaming" class="typing-dot">...</span>
          </p>
        </article>
      </div>

      <form class="manual-input" @submit="handleManualSubmit">
        <label for="manual-message">Send a text cue</label>
        <div class="input-row">
          <textarea
            id="manual-message"
            v-model="manualMessage"
            placeholder="Type a quick instruction or sentence..."
            rows="2"
          />
          <button class="cta-button" type="submit">Send</button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.session-layout {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.video-panel video {
  width: 100%;
  border-radius: 32px;
  display: block;
  background: #000;
}

.video-wrapper {
  position: relative;
  border-radius: 32px;
  overflow: hidden;
  margin-top: 18px;
}

.video-wrapper video {
  min-height: 320px;
}

.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
}

.video-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder .overlay {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 18px;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.8), transparent);
  color: #fff;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.session-meta p {
  margin-top: 6px;
  color: #4f5662;
}

.status-chip {
  border-radius: 999px;
  padding: 8px 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  background: rgba(29, 30, 44, 0.1);
}

.status-chip.connected {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.status-chip.connecting {
  background: rgba(251, 191, 36, 0.2);
  color: #b45309;
}

.status-chip.error {
  background: rgba(239, 68, 68, 0.2);
  color: #b91c1c;
}

.status-chip .dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.control-row {
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.cta-button.danger {
  background: #f87171;
}

.secondary-controls {
  display: inline-flex;
  gap: 10px;
}

.ghost {
  border-radius: 999px;
  padding: 10px 20px;
  border: 1px solid rgba(29, 30, 44, 0.2);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-weight: 600;
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-header p {
  margin: 0;
  color: #4f5662;
}

.chat-stream {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chat-bubble {
  padding: 16px 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(29, 30, 44, 0.08);
}

.chat-bubble.assistant {
  align-self: flex-start;
}

.chat-bubble.user {
  align-self: flex-end;
  background: rgba(29, 30, 44, 0.9);
  color: #fff;
}

.chat-bubble .role {
  display: block;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 6px;
  color: inherit;
}

.typing-dot {
  margin-left: 6px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.25;
  }
}

.manual-input label {
  font-weight: 600;
}

.manual-input textarea {
  width: 100%;
  border-radius: 20px;
  border: 1px solid rgba(29, 30, 44, 0.12);
  padding: 14px 16px;
  resize: none;
  font-family: inherit;
}

.input-row {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  align-items: stretch;
}

.input-row .cta-button {
  align-self: stretch;
}

.empty-state {
  text-align: center;
  color: #6b7280;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 16px;
  margin-top: 16px;
}
</style>
