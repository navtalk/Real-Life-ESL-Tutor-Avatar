<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { findGoal } from '../data/goals'
import { findAvatar } from '../data/avatars'
import { useNavTalkRealtime, type ChatMessage } from '../composables/useNavTalkRealtime'
import type { SessionFeedback, CorrectionItem } from '../types/sessionFeedback'

const DEFAULT_FEEDBACK: SessionFeedback = {
  score: 70,
  fluency: 2,
  pronunciation: 2,
  vocabulary: 2,
  corrections: [],
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function ensureSentenceCase(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}

interface SentenceScore {
  fluency: number
  pronunciation: number
  vocabulary: number
  normalized: number
}

function evaluateSentence(text: string): SentenceScore {
  const cleanedText = text.trim()
  const words = cleanedText.split(/\s+/).filter(Boolean)
  const sanitizedWords = words
    .map((word) => word.toLowerCase().replace(/[^a-z']/gi, ''))
    .filter(Boolean)
  const wordCount = words.length
  const uniqueWordCount = new Set(sanitizedWords).size
  const hasPunctuation = /[.!?]$/.test(cleanedText)
  const hasFiller = /\b(um|uh|erm|like)\b/i.test(cleanedText)

  const fluencyBase = wordCount >= 18 ? 5 : wordCount >= 12 ? 4 : wordCount >= 7 ? 3 : wordCount >= 4 ? 2 : 1
  const fluencyPenalty = hasFiller ? 1 : 0
  const fluency = clamp(fluencyBase - fluencyPenalty, 1, 5)

  const vocabRatio = wordCount ? uniqueWordCount / wordCount : 0
  const vocabulary = clamp(
    vocabRatio >= 0.8 ? 5 : vocabRatio >= 0.6 ? 4 : vocabRatio >= 0.45 ? 3 : vocabRatio >= 0.25 ? 2 : 1,
    1,
    5
  )

  const pronunciationBase = hasPunctuation ? 3 : 2
  const pronunciationBoost = wordCount >= 15 ? 2 : wordCount >= 8 ? 1 : 0
  const pronunciation = clamp(pronunciationBase + pronunciationBoost, 1, 5)

  const normalized = (fluency + vocabulary + pronunciation) / 15

  return { fluency, pronunciation, vocabulary, normalized }
}

function buildSessionFeedbackFromChat(messages: ChatMessage[]): SessionFeedback {
  const userMessages = messages
    .filter((msg) => msg.role === 'user')
    .map((msg) => ({ ...msg, text: msg.text.trim() }))
    .filter((msg) => msg.text.length > 0)

  if (!userMessages.length) {
    return { ...DEFAULT_FEEDBACK, corrections: [] }
  }

  const evaluations = userMessages.map((msg) => evaluateSentence(msg.text))
  const perSentenceValue = 100 / userMessages.length
  const totalScore = clamp(
    Math.round(evaluations.reduce((sum, entry) => sum + entry.normalized * perSentenceValue, 0)),
    0,
    100
  )

  const averageMetric = (key: keyof Omit<SentenceScore, 'normalized'>) =>
    clamp(
      Math.round(evaluations.reduce((sum, entry) => sum + entry[key], 0) / evaluations.length),
      1,
      5
    )

  return {
    score: totalScore,
    fluency: averageMetric('fluency'),
    pronunciation: averageMetric('pronunciation'),
    vocabulary: averageMetric('vocabulary'),
    corrections: buildCorrections(userMessages),
  }
}

function buildCorrections(userMessages: ChatMessage[]): CorrectionItem[] {
  const recent = userMessages.slice(-5)
  const corrections: CorrectionItem[] = []

  for (const message of recent) {
    const correction = createCorrectionFromMessage(message.text)
    if (correction) {
      corrections.push(correction)
    }
    if (corrections.length === 3) {
      break
    }
  }

  if (!corrections.length && recent.length) {
    const fallback = recent[recent.length - 1].text
    const sentence = ensureSentenceCase(fallback)
    corrections.push({
      wrong: fallback,
      right: `${sentence}${/[.!?]$/.test(sentence) ? '' : '.'} Add one concrete example to support this idea.`,
      note: 'You can make this response stronger by adding a brief example or reason after the main sentence.',
    })
  }

  return corrections
}

function createCorrectionFromMessage(text: string): CorrectionItem | null {
  const original = text.trim()
  if (!original) return null
  let suggestion = original
  const notes: string[] = []

  if (!/^[A-Z]/.test(original)) {
    suggestion = `${suggestion.charAt(0).toUpperCase()}${suggestion.slice(1)}`
    notes.push('Capitalize the first word.')
  }

  if (/\bi\b/.test(suggestion)) {
    suggestion = suggestion.replace(/\bi\b/g, 'I')
    notes.push('Use uppercase “I” when referring to yourself.')
  }

  if (/\s{2,}/.test(suggestion)) {
    suggestion = suggestion.replace(/\s{2,}/g, ' ')
    notes.push('Use single spaces between words.')
  }

  if (!/[.!?]$/.test(suggestion) && suggestion.split(/\s+/).length > 3) {
    suggestion = suggestion.replace(/[.!?]+$/, '')
    suggestion = `${suggestion}.`
    notes.push('Finish the thought with punctuation.')
  }

  if (notes.length === 0) {
    return null
  }

  return {
    wrong: original,
    right: suggestion,
    note: notes.join(' '),
  }
}

const props = defineProps<{
  goalId: string
  avatarId: string
}>()

const router = useRouter()
const videoRef = ref<HTMLVideoElement | null>(null)
const navtalk = useNavTalkRealtime(videoRef)
const {
  chatMessages,
  isVideoStreaming,
  isCallActive,
  isConnecting,
  assistantThinking,
  userSpeaking,
  errorMessage,
  sessionStatus,
  toggleSession,
  disconnect,
  clearHistory,
  resumePlaybackAudio,
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

function handleToggleCall() {
  if (isCallActive.value || isConnecting.value) {
    if (goal.value && avatar.value) {
      const summary = buildSessionFeedbackFromChat(chatMessages.value)
      clearHistory()
      router.push({
        name: 'summary',
        params: { goalId: goal.value.id, avatarId: avatar.value.id },
        query: { data: encodeURIComponent(JSON.stringify(summary)) },
      })
    }
    disconnect()
    return
  }

  resumePlaybackAudio()
  toggleSession()
  const video = videoRef.value
  if (video) {
    video.muted = false
    video.play().catch(() => {
      /* autoplay may still need a manual tap */
    })
  }
}

</script>

<template>
  <section v-if="goal && avatar" class="session-screen">
    <div class="stage-row">
      <div class="video-column">
        <div class="video-stage">
          <div class="video-frame">
            <video ref="videoRef" autoplay playsinline></video>
            <div v-if="!isVideoStreaming" class="video-placeholder">
              <img :src="avatar.photo" :alt="avatar.name" />
            </div>
            <div class="status-overlay">
              <span class="status-chip" :class="sessionStatus">
                <span class="dot"></span>
                {{ sessionLabel }}
              </span>
              <span v-if="assistantThinking" class="status-note">Tutor is thinking...</span>
              <span v-else-if="userSpeaking" class="status-note">Listening...</span>
            </div>
          </div>
        </div>

        <div class="control-deck">
          <button type="button" class="icon-button ghosted" disabled>
            <span class="icon-circle">
              <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
                <path
                  d="M1 11.5h20M3 2.5h16c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2v-5c0-1.1.9-2 2-2Zm4 3h4m2 0h4"
                  fill="none"
                  stroke="#111"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span>Captions</span>
          </button>

          <button
            type="button"
            class="icon-button hangup"
            :class="{ active: isCallActive || isConnecting }"
            @click="handleToggleCall"
          >
            <span class="icon-circle">
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <path
                  d="M6 11c2.7-2.2 11.3-2.2 14 0M6 11v4m14-4v4"
                  fill="none"
                  stroke="#fff"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span>{{ isCallActive || isConnecting ? 'Hang up' : 'Start call' }}</span>
          </button>

          <button type="button" class="icon-button ghosted" disabled>
            <span class="icon-circle">
              <svg width="16" height="22" viewBox="0 0 16 22" aria-hidden="true">
                <path
                  d="M8 1a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3Zm6 9c0 3.9-3.1 7-7 7s-7-3.1-7-7m7 7v4"
                  fill="none"
                  stroke="#111"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span>Microphone</span>
          </button>
        </div>

        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
      </div>

      <aside class="chat-panel">
        <header>
          <h3>Chat Log</h3>
        </header>
        <div class="chat-stream">
          <p v-if="!chatMessages.length" class="empty-state">No messages yet.</p>
          <article
            v-for="message in chatMessages"
            :key="message.id"
            :class="['chat-entry', message.role]"
          >
            <span class="role">{{ message.role === 'assistant' ? avatar.name : 'You' }}</span>
            <p>{{ message.text }}</p>
          </article>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.session-screen {
  height: 100%;
  padding: clamp(16px, 4vw, 40px) clamp(12px, 5vw, 32px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(20px, 3vw, 32px);
  --stage-height: clamp(320px, 58vh, 540px);
}

.stage-row {
  display: grid;
  grid-template-columns: minmax(420px, 1.35fr) minmax(300px, 0.65fr);
  gap: clamp(16px, 3vw, 32px);
  align-items: stretch;
  width: 100%;
}

.video-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(16px, 2vw, 28px);
  width: 100%;
}

.video-stage {
  display: flex;
  justify-content: center;
  width: 100%;
}

.video-frame {
  position: relative;
  width: 100%;
  border-radius: 44px;
  overflow: hidden;
  background: #0b0d18;
  height: var(--stage-height);
}

.video-frame video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-placeholder {
  position: absolute;
  inset: 0;
}

.video-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-chip {
  border-radius: 999px;
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  background: rgba(17, 19, 39, 0.1);
}

.status-chip.connected {
  background: rgba(34, 197, 94, 0.18);
  color: #10753a;
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

.status-note {
  color: #4f5662;
  font-weight: 600;
}

.status-overlay {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.chat-panel {
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(17, 19, 39, 0.1);
  box-shadow: 0 12px 30px rgba(17, 19, 39, 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: var(--stage-height);
  min-height: var(--stage-height);
}

.chat-panel header h3 {
  margin: 0 0 12px;
}

.chat-stream {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-entry {
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(17, 19, 39, 0.08);
  background: #fff;
}

.chat-entry.assistant {
  align-self: flex-start;
}

.chat-entry.user {
  align-self: flex-end;
  background: #111327;
  color: #fff;
}

.chat-entry .role {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.control-deck {
  display: flex;
  justify-content: center;
  gap: clamp(16px, 3vw, 32px);
  flex-wrap: wrap;
  padding: 0 12px;
  width: min(640px, 100%);
}

.icon-button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: #111327;
}

.icon-button.ghosted {
  opacity: 0.55;
  cursor: not-allowed;
}

.icon-button .icon-circle {
  width: 74px;
  height: 74px;
  border-radius: 999px;
  background: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 12px 30px rgba(15, 18, 34, 0.15);
}

.icon-button.hangup .icon-circle {
  background: #2563eb;
  transition: background 0.2s ease;
}

.icon-button.hangup span {
  color: #2563eb;
  transition: color 0.2s ease;
}

.icon-button.hangup.active .icon-circle {
  background: #f25050;
}

.icon-button.hangup.active span {
  color: #f25050;
}

.error-banner {
  align-self: center;
  margin-top: 0;
  padding: 12px 18px;
  border-radius: 18px;
  background: rgba(242, 80, 80, 0.12);
  color: #b91c1c;
  text-align: center;
  width: min(480px, 100%);
}

@media (max-width: 1024px) {
  .stage-row {
    grid-template-columns: 1fr;
  }

  .session-screen {
    min-height: auto;
  }

  .chat-panel {
    width: min(520px, 100%);
    justify-self: center;
  }

  .video-frame {
    border-radius: 32px;
  }
}

@media (max-width: 640px) {
  .session-screen {
    padding-bottom: 24px;
    --stage-height: clamp(260px, 65vw, 360px);
  }

  .video-frame {
    border-radius: 24px;
  }

  .control-deck {
    flex-direction: column;
    align-items: center;
  }

  .icon-button .icon-circle {
    width: 60px;
    height: 60px;
  }
}
</style>

