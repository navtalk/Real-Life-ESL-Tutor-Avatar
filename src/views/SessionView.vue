<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { findGoal } from '../data/goals'
import { findAvatar } from '../data/avatars'
import { useNavTalkRealtime, type ChatMessage } from '../composables/useNavTalkRealtime'
import MovableCamera from '../components/MovableCamera.vue'
import type { SessionFeedback, CorrectionItem } from '../types/sessionFeedback'
import { assetUrl } from '../utils/assetUrl'

const DEFAULT_FEEDBACK: SessionFeedback = {
  score: 0,
  fluency: 0,
  pronunciation: 0,
  vocabulary: 0,
  corrections: [],
}

const PAST_INDICATORS = ['yesterday', 'last night', 'last week', 'earlier', 'this morning', 'this afternoon', 'recently']
const PAST_VERB_CASES = [
  { anchor: 'go to', replacement: 'went to' },
  { anchor: 'go', replacement: 'went' },
  { anchor: 'have', replacement: 'had' },
  { anchor: 'eat', replacement: 'ate' },
  { anchor: 'see', replacement: 'saw' },
  { anchor: 'come', replacement: 'came' },
  { anchor: 'buy', replacement: 'bought' },
  { anchor: 'take', replacement: 'took' },
  { anchor: 'meet', replacement: 'met' },
  { anchor: 'watch', replacement: 'watched' },
  { anchor: 'talk', replacement: 'talked' },
  { anchor: 'visit', replacement: 'visited' },
  { anchor: 'bring', replacement: 'brought' },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const iconPath = (name: string) => assetUrl(`icons/${name}`)

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
    return { ...DEFAULT_FEEDBACK }
  }

  const evaluations = userMessages.map((msg) => evaluateSentence(msg.text))
  const averageMetric = (key: keyof Omit<SentenceScore, 'normalized'>) =>
    clamp(
      Math.round(evaluations.reduce((sum, entry) => sum + entry[key], 0) / evaluations.length),
      1,
      5
    )

  const fluency = averageMetric('fluency')
  const pronunciation = averageMetric('pronunciation')
  const vocabulary = averageMetric('vocabulary')
  const normalized = (fluency + pronunciation + vocabulary) / 15

  return {
    score: clamp(Math.round(normalized * 100), 0, 100),
    fluency,
    pronunciation,
    vocabulary,
    corrections: buildCorrections(messages),
  }
}

function buildCorrections(messages: ChatMessage[]): CorrectionItem[] {
  const corrections: CorrectionItem[] = []
  const practiceQueue: PracticeTarget[] = []

  for (const message of messages) {
    const trimmed = message.text.trim()
    if (!trimmed) continue

    if (message.role === 'assistant') {
      practiceQueue.push(...extractPracticeTargets(trimmed))
      continue
    }

    if (message.role !== 'user') continue

    const correctionItems = createCorrectionFromPractice(trimmed)
    if (correctionItems.length) {
      corrections.push(...correctionItems)
      continue
    }

    const practiceTarget = practiceQueue.shift()
    if (practiceTarget && shouldCreatePracticeCorrection(trimmed, practiceTarget.text)) {
      corrections.push(createPracticeCorrection(trimmed, practiceTarget))
      continue
    }

    corrections.push(createNeutralCorrection(trimmed))
  }

  return corrections
}

interface PracticeTarget {
  text: string
  cue?: string
}

const PRACTICE_HINT = /(practice|say|repeat|read|try|speak|respond|answer|dialogue)/i

function extractPracticeTargets(text: string): PracticeTarget[] {
  const targets: PracticeTarget[] = []
  const cleaned = text.trim()
  if (!cleaned) return targets

  const add = (value: string, cue?: string) => {
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (!normalized) return
    targets.push({ text: normalized, cue })
  }

  const directiveMatch = cleaned.match(
    /(?:say|repeat|practice|read|try|speak|answer|respond)\s+(?:the following\s+)?(?:sentence|phrase|line|dialogue|text|example|response)?\s*[:\-–—]\s*(.+)/i
  )

  if (directiveMatch) {
    splitIntoSentences(directiveMatch[1]).forEach((sentence) => add(sentence, 'Tutor prompt'))
  }

  const quoteRegex = /["“”](.+?)["“”]/g
  let quoteMatch: RegExpExecArray | null = null
  while ((quoteMatch = quoteRegex.exec(cleaned))) {
    add(quoteMatch[1], 'Tutor example')
  }

  if (!targets.length && PRACTICE_HINT.test(cleaned)) {
    const sentences = splitIntoSentences(cleaned).filter(
      (sentence) => sentence.length > 5 && !PRACTICE_HINT.test(sentence.toLowerCase())
    )
    sentences.forEach((sentence) => add(sentence, 'Practice sentence'))
  }

  return targets
}

function shouldCreatePracticeCorrection(user: string, target: string) {
  return normalizeForComparison(user) !== normalizeForComparison(target)
}

function createPracticeCorrection(user: string, practiceTarget: PracticeTarget): CorrectionItem {
  const normalizedTarget = ensureSentenceCase(practiceTarget.text)
  const grammarNote = describeGrammarNoteForText(normalizedTarget)
  const contextNote = practiceTarget.cue ? ` (${practiceTarget.cue})` : ''
  return {
    wrong: user,
    right: normalizedTarget,
    note: `${grammarNote}${contextNote}`,
  }
}

function splitIntoSentences(input: string) {
  return input
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const matches = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      return matches ? matches.map((sentence) => sentence.trim()) : []
    })
}

function normalizeForComparison(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/gi, '')
}

function createCorrectionFromPractice(text: string): CorrectionItem[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const corrections: CorrectionItem[] = []
  const detectors = [detectPastTenseMistake, detectThirdPersonMistake, detectTravelMistake]
  for (const detector of detectors) {
    const result = detector(trimmed)
    if (result) {
      corrections.push(result)
    }
  }
  return corrections
}

function detectPastTenseMistake(text: string): CorrectionItem | null {
  const lowercase = text.toLowerCase()
  if (!PAST_INDICATORS.some((indicator) => lowercase.includes(indicator))) {
    return null
  }

  for (const verbCase of PAST_VERB_CASES) {
    const anchorRegex = new RegExp(`\\bI\\s+(?:am\\s+)?${verbCase.anchor.replace(/\s+/g, '\\s+')}(?=\\b)`, 'i')
    const match = anchorRegex.exec(text)
    if (!match) continue

    const originalSegment = match[0]
    const verbRegex = new RegExp(verbCase.anchor, 'i')
    const replacedSegment = originalSegment.replace(verbRegex, verbCase.replacement)
    const suggestion =
      text.slice(0, match.index) + replacedSegment + text.slice(match.index + originalSegment.length)

    const indicator = PAST_INDICATORS.find((marker) => lowercase.includes(marker)) ?? 'that moment'
    return {
      wrong: text,
      right: ensureSentenceCase(suggestion),
      note: `Grammar: Use the past tense "${verbCase.replacement}" when referring to ${indicator}. Pronunciation: Past-tense endings help listeners hear the completed action clearly.`,
    }
  }

  return null
}

function detectThirdPersonMistake(text: string): CorrectionItem | null {
  const match = text.match(/\b(She|He|It)\s+don'?t\b\s+([a-zA-Z]+)/i)
  if (!match) return null
  const [, subject, rawVerb] = match
  const baseVerb = rawVerb.replace(/s$/i, '')
  const suggestion = text
    .replace(/don'?t/i, "doesn't")
    .replace(new RegExp(`\\b${rawVerb}\\b`, 'i'), baseVerb)

  return {
    wrong: text,
    right: ensureSentenceCase(suggestion),
    note: `Grammar: Pair "${subject} doesn't" with the base verb "${baseVerb}" to stay grammatically correct. Pronunciation: "doesn't" ends with a voiced /z/, not the sharp /t/ sound.`,
  }
}

function detectTravelMistake(text: string): CorrectionItem | null {
  const match = text.match(/\b(She|He|It)\b[^.!?]*?\btravel\b(?!ing)/i)
  if (!match) return null
  const suggestion = text.replace(/\btravel\b(?!ing)/gi, 'traveling')

  return {
    wrong: text,
    right: ensureSentenceCase(suggestion),
    note: 'Grammar: Use "traveling" (with -ing) to keep the third-person phrase consistent when describing a habit.',
  }
}

function createNeutralCorrection(text: string): CorrectionItem {
  return {
    wrong: text,
    right: refineNeutralSentence(text),
    note: describeGrammarNoteForText(text),
  }
}

const GREETINGS = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening']
const QUESTION_WORDS = ['how', 'what', 'where', 'when', 'why', 'who', 'which', 'whose', 'whom']

function refineNeutralSentence(text: string) {
  const polishedGreeting = polishGreetingSentence(text)
  if (polishedGreeting) {
    return polishedGreeting
  }

  const normalized = ensureSentenceCase(text)
  if (/[.!?]$/.test(normalized)) {
    return normalized
  }

  return detectLikelyQuestion(text) ? `${normalized}?` : `${normalized}.`
}

function polishGreetingSentence(text: string) {
  const pattern = new RegExp(`^(${GREETINGS.join('|')})[,!.]*\\s+(.+)$`, 'i')
  const match = text.match(pattern)
  if (!match) return null

  const greeting = ensureSentenceCase(match[1])
  let rest = match[2].trim()
  if (!rest) {
    return `${greeting}!`
  }

  rest = ensureSentenceCase(rest)
  if (!/[.!?]$/.test(rest)) {
    rest = detectLikelyQuestion(rest) ? `${rest}?` : `${rest}.`
  }

  return `${greeting}! ${rest}`
}

function detectLikelyQuestion(text: string) {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false

  if (QUESTION_WORDS.some((word) => normalized.startsWith(`${word} `))) {
    return true
  }

  return /\b(are|is|do|does|did|can|could|will|would|should|am|was|were)\b.*\b(you|i|we|they|he|she|it)\b/.test(
    normalized
  )
}

function describeGrammarNoteForText(text: string) {
  const trimmed = text.trim()
  if (!trimmed) {
    return 'Grammar: Provide a full sentence with a clear subject and verb so the feedback stays useful.'
  }

  const lower = trimmed.toLowerCase()
  if (/\?$/.test(trimmed)) {
    const questionWord = QUESTION_WORDS.find((word) => lower.startsWith(`${word} `))
    if (questionWord) {
      return `Grammar: ${capitalizeWord(questionWord)}-questions put the question word before an auxiliary verb and subject (for example, "${capitalizeWord(
        questionWord
      )} are you..."). That inversion signals you are asking for information.`
    }
    return 'Grammar: Yes/no questions begin with an auxiliary verb (do/are/can) before the subject so listeners know it is a question.'
  }

  if (/^(i am|i'm)\b/.test(lower)) {
    return 'Grammar: Use "I am" + -ing to describe what is happening right now—keeping the -ing form keeps the present progressive correct.'
  }

  if (/\b(can|could|should|would|will|might)\b/.test(lower)) {
    return 'Grammar: Modal verbs (can/could/should) follow the subject and sit before the base verb to show ability, permission, or advice.'
  }

  return 'Grammar: Keep subjects and verbs in the same tense and finish with punctuation so your sentences stay clear and natural.'
}

function capitalizeWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
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
  setCharacter,
  setVoice,
  toggleMicrophone,
  isMicMuted,
} = navtalk

const chatVisible = ref(false)
const captionsEnabled = ref(true)
const chatStreamRef = ref<HTMLDivElement | null>(null)
const chatScrollSignature = computed(() =>
  chatMessages.value.map((msg) => `${msg.id}:${msg.text.length}`).join('|')
)

const goal = computed(() => findGoal(props.goalId))
const avatar = computed(() => findAvatar(props.avatarId))

watchEffect(() => {
  if (!goal.value || !avatar.value) {
    router.replace('/')
  }
})

onMounted(() => {
  if (!goal.value || !avatar.value) return
  if (isCallActive.value || isConnecting.value) return
  toggleSession()
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

watchEffect(() => {
  if (avatar.value?.characterName) {
    setCharacter(avatar.value.characterName)
  }
})

watchEffect(() => {
  if (avatar.value?.voice) {
    setVoice(avatar.value.voice)
  }
})

watch(
  () => isCallActive.value,
  (active) => {
    chatVisible.value = active && captionsEnabled.value
  }
)

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
    chatVisible.value = false
    return
  }

  resumePlaybackAudio()
  toggleSession()
  chatVisible.value = captionsEnabled.value
  const video = videoRef.value
  if (video) {
    video.muted = false
    video.play().catch(() => {
      /* autoplay may still need a manual tap */
    })
  }
}

function handleMicToggle() {
  if (!isCallActive.value) return
  toggleMicrophone()
}

function handleCaptionsToggle() {
  if (!isCallActive.value) return
  captionsEnabled.value = !captionsEnabled.value
  chatVisible.value = captionsEnabled.value
}

async function scrollChatToBottom() {
  if (!captionsEnabled.value || !chatVisible.value) return
  await nextTick()
  const container = chatStreamRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

watch(
  () => chatMessages.value.length,
  () => {
    scrollChatToBottom()
  }
)

watch(chatScrollSignature, () => {
  scrollChatToBottom()
})

watch(
  () => [captionsEnabled.value, chatVisible.value],
  ([captionsOn, visible]) => {
    if (captionsOn && visible) {
      scrollChatToBottom()
    }
  }
)

</script>

<template>
  <section v-if="goal && avatar" class="session-screen">
    <div class="stage-stack">
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
          <button
            type="button"
            class="icon-button captions"
            :class="{ active: captionsEnabled }"
            :disabled="!isCallActive"
            @click="handleCaptionsToggle"
          >
            <span class="icon-circle">
              <img
                :src="
                  captionsEnabled ? iconPath('Captions.svg') : iconPath('NoCaptions.svg')
                "
                :alt="captionsEnabled ? 'Captions on' : 'Captions off'"
                loading="lazy"
              />
            </span>
            <span class="icon-label">{{ captionsEnabled ? 'Hide captions' : 'Show captions' }}</span>
          </button>

          <button
            type="button"
            class="icon-button hangup"
            :class="{ active: isCallActive || isConnecting }"
            @click="handleToggleCall"
          >
            <span class="icon-circle">
              <img :src="iconPath('Hang-up.svg')" alt="Hang up" loading="lazy" />
            </span>
            <span class="icon-label">{{ isCallActive || isConnecting ? 'Hang up' : 'Start call' }}</span>
          </button>

          <button
            type="button"
            class="icon-button mic"
            :class="{ muted: isMicMuted }"
            :disabled="!isCallActive"
            @click="handleMicToggle"
          >
            <span class="icon-circle">
              <img
                :src="isMicMuted ? iconPath('NoMicrophone.svg') : iconPath('Microphone.svg')"
                alt="Microphone"
                loading="lazy"
              />
            </span>
            <span class="icon-label">{{ isMicMuted ? 'Unmute mic' : 'Mute mic' }}</span>
          </button>
        </div>

        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
      </div>

      <Transition name="chat-fly">
        <aside v-if="chatVisible" class="chat-panel">
          <header>
            <h3>Chat Log</h3>
          </header>
          <div ref="chatStreamRef" class="chat-stream">
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
      </Transition>
    </div>
  </section>
  <MovableCamera :active="isCallActive" />
</template>

<style scoped>
.session-screen {
  height: 100%;
  padding: clamp(16px, 4vw, 40px) clamp(12px, 5vw, 32px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(20px, 3vw, 32px);
  --stage-size: clamp(320px, 58vh, 540px);
}

.stage-stack {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: clamp(20px, 4vw, 48px);
  width: 100%;
  position: relative;
}

.video-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(16px, 2vw, 28px);
  width: 100%;
  max-width: var(--stage-size);
}

.video-stage {
  display: flex;
  justify-content: center;
  width: 100%;
}

.video-frame {
  position: relative;
  width: min(100%, var(--stage-size));
  max-width: var(--stage-size);
  aspect-ratio: 1 / 1;
  border-radius: 44px;
  overflow: hidden;
  background-color: #fff;
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
  height: var(--stage-size);
  min-height: var(--stage-size);
  width: clamp(300px, 34vw, 460px);
  margin-top: 0;
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
  gap: clamp(18px, 3vw, 32px);
  flex-wrap: wrap;
  padding: 0 12px;
  width: min(640px, 100%);
}

.icon-button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: #4b4b4b;
  transition: color 0.2s ease;
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.icon-button .icon-label {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: inherit;
}

.icon-button .icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: transparent;
  border: none;
  display: grid;
  place-items: center;
  position: relative;
}

.icon-button .icon-circle img {
  width: 52px;
  height: auto;
  display: block;
}

.icon-button.captions.active .icon-label {
  color: #111327;
}

.icon-button.hangup .icon-label {
  color: #ec4d52;
}

.icon-button.mic.muted {
  color: #b91c1c;
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
  .stage-stack {
    flex-direction: column;
  }

  .session-screen {
    min-height: auto;
  }

  .video-frame {
    border-radius: 32px;
  }
}

@media (max-width: 640px) {
  .session-screen {
    padding-bottom: 24px;
    --stage-size: clamp(260px, 65vw, 360px);
  }

  .video-frame {
    border-radius: 24px;
  }

  .control-deck {
    flex-direction: column;
    align-items: center;
  }

  .chat-panel {
    width: min(360px, 100%);
  }

  .icon-button .icon-circle {
    width: 68px;
    height: 68px;
  }
}

.chat-fly-enter-from,
.chat-fly-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.98);
}

.chat-fly-enter-active,
.chat-fly-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
</style>
