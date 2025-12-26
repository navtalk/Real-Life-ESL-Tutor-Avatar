import { computed, onBeforeUnmount, reactive, ref, watch, type Ref } from 'vue'

export type ChatRole = 'user' | 'assistant'
export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  streaming?: boolean
  timestamp: number
}

interface NavTalkConfig {
  license: string
  model: string
  characterName: string
  voice: string
  prompt: string
  baseUrl: string
}

const HISTORY_KEY = 'edu-navtalk-history'
const DEFAULT_PROMPT = `You are Navi, a patient NavTalk AI language tutor that adapts to the learner's goal.
Keep responses concise (1-3 sentences), always encourage real-time speaking practice,
and offer micro-corrections that do not break learner confidence.`
const DEFAULT_REALTIME_PATH = '/wss/v2/realtime-chat'
const DEFAULT_MODEL = 'gpt-realtime'

const NavTalkMessageType = Object.freeze({
  CONNECTED_SUCCESS: 'conversation.connected.success',
  CONNECTED_FAIL: 'conversation.connected.fail',
  CONNECTED_CLOSE: 'conversation.connected.close',
  INSUFFICIENT_BALANCE: 'conversation.connected.insufficient_balance',
  WEB_RTC_OFFER: 'webrtc.signaling.offer',
  WEB_RTC_ANSWER: 'webrtc.signaling.answer',
  WEB_RTC_ICE_CANDIDATE: 'webrtc.signaling.iceCandidate',
  REALTIME_SESSION_CREATED: 'realtime.session.created',
  REALTIME_SESSION_UPDATED: 'realtime.session.updated',
  REALTIME_SPEECH_STARTED: 'realtime.input_audio_buffer.speech_started',
  REALTIME_SPEECH_STOPPED: 'realtime.input_audio_buffer.speech_stopped',
  REALTIME_CONVERSATION_ITEM_COMPLETED:
    'realtime.conversation.item.input_audio_transcription.completed',
  REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA: 'realtime.response.audio_transcript.delta',
  REALTIME_RESPONSE_AUDIO_DELTA: 'realtime.response.audio.delta',
  REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE: 'realtime.response.audio_transcript.done',
  REALTIME_RESPONSE_AUDIO_DONE: 'realtime.response.audio.done',
  REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DELTA:
    'realtime.response.function_call_arguments.delta',
  REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE:
    'realtime.response.function_call_arguments.done',
  REALTIME_RESPONSE_COMPLETED: 'realtime.response.completed',
  REALTIME_RESPONSE_ERROR: 'realtime.response.error',
  ERROR: 'error',

  LEGACY_RESPONSE_AUDIO_TRANSCRIPT_DELTA: 'response.audio_transcript.delta',
  LEGACY_RESPONSE_AUDIO_TRANSCRIPT_DONE: 'response.audio_transcript.done',
  LEGACY_RESPONSE_AUDIO_DELTA: 'response.audio.delta',
  LEGACY_RESPONSE_COMPLETED: 'response.completed',
  LEGACY_FUNCTION_CALL_DELTA: 'response.function_call_arguments.delta',
  LEGACY_FUNCTION_CALL_DONE: 'response.function_call_arguments.done',
  LEGACY_RESPONSE_ERROR: 'response.error',
})

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  const trimmed = messages.slice(-40)
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function floatTo16BitPCM(float32Array: Float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  let offset = 0
  for (let i = 0; i < float32Array.length; i += 1, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

function base64Encode(uint8Array: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < uint8Array.length; i += chunk) {
    const segment = uint8Array.subarray(i, i + chunk)
    binary += String.fromCharCode(...segment)
  }
  return btoa(binary)
}

let playbackContext: AudioContext | null = null
let playbackSource: AudioBufferSourceNode | null = null
const playbackQueue: ArrayBuffer[] = []
let isPlaybackActive = false

function base64ToArrayBuffer(base64: string) {
  let binaryString = ''
  const atobGlobal =
    (typeof globalThis !== 'undefined' && (globalThis as unknown as { atob?: (value: string) => string }).atob) ||
    (typeof window !== 'undefined' ? window.atob : undefined)
  const bufferCtor = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined
  if (atobGlobal) {
    binaryString = atobGlobal(base64)
  } else if (bufferCtor) {
    binaryString = bufferCtor.from(base64, 'base64').toString('binary')
  } else {
    throw new Error('No base64 decoder available')
  }
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function createWavFromPCM(pcmBuffer: ArrayBuffer, sampleRate = 24000) {
  const wavBuffer = new ArrayBuffer(44 + pcmBuffer.byteLength)
  const view = new DataView(wavBuffer)
  let offset = 0

  const writeString = (value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
    offset += value.length
  }

  writeString('RIFF')
  view.setUint32(offset, 36 + pcmBuffer.byteLength, true)
  offset += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(offset, 16, true)
  offset += 4
  view.setUint16(offset, 1, true)
  offset += 2
  view.setUint16(offset, 1, true)
  offset += 2
  view.setUint32(offset, sampleRate, true)
  offset += 4
  view.setUint32(offset, sampleRate * 2, true)
  offset += 4
  view.setUint16(offset, 2, true)
  offset += 2
  view.setUint16(offset, 16, true)
  offset += 2
  writeString('data')
  view.setUint32(offset, pcmBuffer.byteLength, true)
  offset += 4

  new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcmBuffer))
  return wavBuffer
}

function ensurePlaybackContext() {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null
  if (!playbackContext) {
    playbackContext = new AudioCtx()
  } else if (playbackContext.state === 'suspended') {
    playbackContext.resume().catch(() => null)
  }
  return playbackContext
}

function stopPlayback() {
  if (playbackSource) {
    try {
      playbackSource.stop()
      playbackSource.disconnect()
    } catch {
      /* ignore */
    }
    playbackSource = null
  }
  playbackQueue.length = 0
  isPlaybackActive = false
  if (playbackContext) {
    playbackContext.close().catch(() => null)
    playbackContext = null
  }
}

function playQueuedAudio() {
  if (isPlaybackActive || !playbackQueue.length) return
  const ctx = ensurePlaybackContext()
  if (!ctx) return
  const wavBuffer = playbackQueue.shift()
  if (!wavBuffer) return
  isPlaybackActive = true
  ctx
    .decodeAudioData(wavBuffer.slice(0))
    .then((audioBuffer) => {
      if (!ctx) return
      playbackSource = ctx.createBufferSource()
      playbackSource.buffer = audioBuffer
      playbackSource.connect(ctx.destination)
      playbackSource.onended = () => {
        playbackSource = null
        isPlaybackActive = false
        playQueuedAudio()
      }
      playbackSource.start(0)
    })
    .catch((err) => {
      console.error('Failed to decode NavTalk audio chunk', err)
      isPlaybackActive = false
      playQueuedAudio()
    })
}

function enqueueAudioChunk(base64: string) {
  const pcmBuffer = base64ToArrayBuffer(base64)
  const wavBuffer = createWavFromPCM(pcmBuffer)
  playbackQueue.push(wavBuffer)
  playQueuedAudio()
}

function resumePlaybackContext() {
  if (!playbackContext) {
    ensurePlaybackContext()
  } else if (playbackContext.state === 'suspended') {
    playbackContext.resume().catch(() => null)
  }
}

function buildRealtimeUrl(config: NavTalkConfig) {
  const rawBase = (config.baseUrl || 'transfer.navtalk.ai').trim() || 'transfer.navtalk.ai'
  const withProtocol = /^wss?:\/\//i.test(rawBase) ? rawBase : `wss://${rawBase}`
  let target: URL
  try {
    target = new URL(withProtocol)
  } catch {
    target = new URL('wss://transfer.navtalk.ai')
  }
  if (!target.pathname || target.pathname === '/') {
    target.pathname = DEFAULT_REALTIME_PATH
  }
  target.searchParams.set('license', config.license)
  target.searchParams.set('name', config.characterName)
  target.searchParams.set('model', config.model || DEFAULT_MODEL)
  return target
}

export function useNavTalkRealtime(videoElement: Ref<HTMLVideoElement | null>) {
  const config = reactive<NavTalkConfig>({
    license: import.meta.env.VITE_NAVTALK_LICENSE ?? '',
    model: import.meta.env.VITE_NAVTALK_MODEL ?? DEFAULT_MODEL,
    characterName: import.meta.env.VITE_NAVTALK_CHARACTER ?? 'navtalk.Brain',
    voice: import.meta.env.VITE_NAVTALK_VOICE ?? 'cedar',
    prompt: import.meta.env.VITE_NAVTALK_PROMPT ?? DEFAULT_PROMPT,
    baseUrl: import.meta.env.VITE_NAVTALK_BASE_URL ?? 'transfer.navtalk.ai',
  })

  const chatMessages = ref<ChatMessage[]>(loadHistory())
  const sessionStatus = ref<SessionStatus>('idle')
  const assistantThinking = ref(false)
  const userSpeaking = ref(false)
  const errorMessage = ref('')
  const manualMessage = ref('')
  const isVideoStreaming = ref(false)

  const isConfigured = computed(() => Boolean(config.license))
  const isCallActive = computed(() => sessionStatus.value === 'connected')
  const isConnecting = computed(() => sessionStatus.value === 'connecting')

  const assistantSegments = new Map<string, string>()
  const functionCallBuffers = new Map<string, string>()
  const AUTO_HANGUP_DELAY = 5000
  let realtimeSocket: WebSocket | null = null
  let peerConnection: RTCPeerConnection | null = null
  let audioContext: AudioContext | null = null
  let audioProcessor: ScriptProcessorNode | null = null
  let audioSourceNode: MediaStreamAudioSourceNode | null = null
  let audioStream: MediaStream | null = null
  let recordingToken = 0
  const activeMicTracks = new Set<MediaStreamTrack>()
  const isMicMuted = ref(false)
  let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
  let pendingUserMessageId: string | null = null
  let pendingHangupReason: string | null = null
  let hangupTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    chatMessages,
    (messages) => {
      saveHistory(messages)
    },
    { deep: true }
  )

  function appendMessage(role: ChatRole, text: string, opts?: { streaming?: boolean; id?: string }) {
    const id = opts?.id ?? createId(role)
    chatMessages.value.push({
      id,
      role,
      text,
      streaming: opts?.streaming ?? false,
      timestamp: Date.now(),
    })
    return id
  }

  function updateMessage(id: string, text: string, streaming?: boolean) {
    const index = chatMessages.value.findIndex((msg) => msg.id === id)
    if (index === -1) return
    chatMessages.value[index].text = text
    if (typeof streaming === 'boolean') {
      chatMessages.value[index].streaming = streaming
    }
  }

  function removeMessage(id: string) {
    const index = chatMessages.value.findIndex((msg) => msg.id === id)
    if (index === -1) return
    chatMessages.value.splice(index, 1)
  }

  function handleUserPlaceholder() {
    if (pendingUserMessageId) return
    pendingUserMessageId = appendMessage('user', 'Listening...', { streaming: true })
  }

  function resolveUserPlaceholder(transcript: string) {
    if (!pendingUserMessageId) return
    const trimmed = transcript.trim()
    if (!trimmed) {
      removeMessage(pendingUserMessageId)
    } else {
      updateMessage(pendingUserMessageId, trimmed, false)
    }
    pendingUserMessageId = null
  }

  function handleAssistantDelta(responseId: string, delta: string) {
    assistantThinking.value = true
    const next = `${assistantSegments.get(responseId) ?? ''}${delta}`
    assistantSegments.set(responseId, next)
    const existingIndex = chatMessages.value.findIndex((msg) => msg.id === responseId)
    if (existingIndex === -1) {
      chatMessages.value.push({
        id: responseId,
        role: 'assistant',
        text: next,
        streaming: true,
        timestamp: Date.now(),
      })
    } else {
      chatMessages.value[existingIndex].text = next
      chatMessages.value[existingIndex].streaming = true
    }
  }

  function finalizeAssistantResponse(responseId: string) {
    const index = chatMessages.value.findIndex((msg) => msg.id === responseId)
    if (index !== -1) {
      chatMessages.value[index].streaming = false
    }
    assistantThinking.value = false
  }

  async function handleOffer(message: any) {
    const incomingSdp = message?.sdp
    if (!incomingSdp) return
    if (peerConnection) {
      peerConnection.close()
    }
    peerConnection = new RTCPeerConnection({ iceServers })

    peerConnection.ontrack = (event) => {
      const video = videoElement.value
      if (!video) return
      video.srcObject = event.streams[0]
      video.muted = false
      video
        .play()
        .then(() => {
          video.classList.add('is-streaming')
          isVideoStreaming.value = true
        })
        .catch(() => {
          /* autoplay may still require a gesture */
        })
      isVideoStreaming.value = true
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN) {
        realtimeSocket.send(
          JSON.stringify({
            type: 'webrtc.signaling.iceCandidate',
            data: { candidate: event.candidate },
          })
        )
      }
    }

    peerConnection.onconnectionstatechange = () => {
      if (!peerConnection) return
      if (peerConnection.connectionState === 'failed') {
        peerConnection.restartIce()
      }
    }

    const remoteDesc = new RTCSessionDescription(incomingSdp)
    await peerConnection.setRemoteDescription(remoteDesc)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    if (realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN) {
      realtimeSocket.send(
        JSON.stringify({
          type: 'webrtc.signaling.answer',
          data: { sdp: peerConnection.localDescription },
        })
      )
    }
  }

  function handleAnswer(message: any) {
    if (!peerConnection || !message?.sdp) return
    const answer = new RTCSessionDescription(message.sdp)
    peerConnection
      .setRemoteDescription(answer)
      .catch((err) => console.error('Failed to set remote answer', err))
  }

  function handleIceCandidate(message: any) {
    if (!peerConnection || !message?.candidate) return
    const candidate = new RTCIceCandidate(message.candidate)
    peerConnection
      .addIceCandidate(candidate)
      .catch((err) => console.error('ICE candidate error', err))
  }

  async function sendSessionUpdate() {
    if (!realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) return

    const payload = {
      type: 'session.update',
      session: {
        instructions: config.prompt,
        voice: config.voice,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
        },
        temperature: 0.9,
        max_response_output_tokens: 4096,
        modalities: ['text', 'audio'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        tools: [
          {
            type: 'function',
            name: 'end_conversation',
            description:
              'Call this when the learner signs off or when practice goals are met so we can hang up politely.',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Brief explanation of why the call should end.',
                },
              },
              required: ['reason'],
            },
          },
        ],
      },
    }

    realtimeSocket.send(JSON.stringify(payload))

    const recentUserMessages = chatMessages.value.filter((msg) => msg.role === 'user').slice(-3)
    recentUserMessages.forEach((msg) => {
      realtimeSocket?.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: msg.text,
              },
            ],
          },
        })
      )
    })
  }

  function setMicEnabled(enabled: boolean) {
    const next = !!enabled
    activeMicTracks.forEach((track) => {
      try {
        track.enabled = next
      } catch {
        /* noop */
      }
    })
    if (audioStream) {
      audioStream.getTracks().forEach((track) => {
        try {
          track.enabled = next
        } catch {
          /* noop */
        }
      })
    }
  }

  function muteMicrophone() {
    if (!audioStream) return
    isMicMuted.value = true
    setMicEnabled(false)
  }

  function unmuteMicrophone() {
    if (!audioStream) return
    isMicMuted.value = false
    setMicEnabled(true)
  }

  function toggleMicrophone() {
    if (!audioStream) return
    if (isMicMuted.value) {
      unmuteMicrophone()
    } else {
      muteMicrophone()
    }
  }

  async function startRecording() {
    if (audioStream || typeof navigator === 'undefined') {
      return
    }

    const attemptToken = ++recordingToken

    try {
      const pendingStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (attemptToken !== recordingToken) {
        pendingStream.getTracks().forEach((track) => {
          try {
            track.stop()
          } catch {
            /* noop */
          }
        })
        return
      }

      audioStream = pendingStream
      activeMicTracks.clear()
      audioStream.getTracks().forEach((track) => activeMicTracks.add(track))
      isMicMuted.value = false
      setMicEnabled(true)

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      audioContext = new AudioCtx({ sampleRate: 24000 })
      audioSourceNode = audioContext.createMediaStreamSource(audioStream)
      audioProcessor = audioContext.createScriptProcessor(4096, 1, 1)
      audioProcessor.onaudioprocess = (event) => {
        if (!realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) {
          return
        }
        const inputBuffer = event.inputBuffer.getChannelData(0)
        const pcmBuffer = floatTo16BitPCM(inputBuffer)
        const base64Audio = base64Encode(new Uint8Array(pcmBuffer))
        const chunkSize = 4096
        for (let i = 0; i < base64Audio.length; i += chunkSize) {
          const chunk = base64Audio.slice(i, i + chunkSize)
          realtimeSocket.send(
            JSON.stringify({ type: 'realtime.input_audio_buffer.append', data: { audio: chunk } })
          )
        }
      }
      audioSourceNode.connect(audioProcessor)
      audioProcessor.connect(audioContext.destination)
    } catch (error) {
      console.error('Microphone permission denied', error)
      handleError('Unable to access the microphone. Please check browser permissions.')
    }
  }

  function stopRecording() {
    recordingToken += 1
    isMicMuted.value = false
    if (audioProcessor) {
      audioProcessor.disconnect()
      audioProcessor.onaudioprocess = null
      audioProcessor = null
    }
    if (audioSourceNode) {
      try {
        audioSourceNode.disconnect()
      } catch {
        /* noop */
      }
      audioSourceNode = null
    }
    if (audioContext) {
      audioContext.close().catch(() => null)
      audioContext = null
    }
    activeMicTracks.forEach((track) => {
      try {
        track.enabled = false
        track.stop()
      } catch {
        /* noop */
      }
    })
    activeMicTracks.clear()
    if (audioStream) {
      audioStream.getTracks().forEach((track) => {
        try {
          track.enabled = false
          track.stop()
        } catch {
          /* noop */
        }
      })
      audioStream = null
    }
  }

  function clearVideoElement() {
    const video = videoElement.value
    if (!video) return
    video.pause()
    video.removeAttribute('src')
    video.srcObject = null
    video.load()
    video.classList.remove('is-streaming')
    isVideoStreaming.value = false
  }

  function teardown(nextStatus: SessionStatus, reason?: string) {
    stopRecording()
    stopPlayback()
    if (realtimeSocket) {
      realtimeSocket.onclose = null
      realtimeSocket.onerror = null
      realtimeSocket.onmessage = null
      realtimeSocket.close()
      realtimeSocket = null
    }
    if (peerConnection) {
      peerConnection.ontrack = null
      peerConnection.onicecandidate = null
      peerConnection.onconnectionstatechange = null
      peerConnection.close()
      peerConnection = null
    }
    clearVideoElement()
    assistantSegments.clear()
    functionCallBuffers.clear()
    pendingUserMessageId = null
    pendingHangupReason = null
    if (hangupTimer) {
      clearTimeout(hangupTimer)
      hangupTimer = null
    }
    userSpeaking.value = false
    assistantThinking.value = false
    if (reason) {
      errorMessage.value = reason
    } else {
      errorMessage.value = ''
    }
    sessionStatus.value = nextStatus
  }

  function handleError(message: string) {
    teardown('error', message)
  }

  function disconnect() {
    teardown('idle')
  }

  function handleFunctionCallDelta(event: any) {
    if (!event?.call_id || typeof event.delta !== 'string') {
      return
    }
    const callId = String(event.call_id)
    functionCallBuffers.set(callId, `${functionCallBuffers.get(callId) ?? ''}${event.delta}`)
  }

  function handleFunctionCallDone(event: any) {
    const name = typeof event?.name === 'string' ? event.name : ''
    const callId = event?.call_id ? String(event.call_id) : undefined

    let rawArguments: string | undefined
    if (typeof event?.arguments === 'string' && event.arguments.trim()) {
      rawArguments = event.arguments
    } else if (callId && functionCallBuffers.has(callId)) {
      rawArguments = functionCallBuffers.get(callId)
    }
    if (callId) {
      functionCallBuffers.delete(callId)
    }

    let parsedArgs: Record<string, unknown> = {}
    if (rawArguments) {
      try {
        parsedArgs = JSON.parse(rawArguments)
      } catch (err) {
        console.error('Failed to parse function call arguments', err)
      }
    }

    if (!name) {
      if (callId) {
        sendFunctionCallResult(callId, { status: 'ignored', reason: 'Function name missing.' })
      }
      return
    }

    handleFunctionCallRequest(name, parsedArgs, callId)
  }

  function handleFunctionCallRequest(name: string, args: Record<string, unknown>, callId?: string) {
    switch (name) {
      case 'end_conversation':
        scheduleAutoHangup(args, callId)
        break
      default:
        if (callId) {
          sendFunctionCallResult(callId, { status: 'ignored', reason: `Unhandled function: ${name}` })
        }
    }
  }

  function scheduleAutoHangup(args: Record<string, unknown>, callId?: string) {
    const reasonInput = typeof args?.reason === 'string' ? args.reason.trim() : ''
    const reason = reasonInput || 'Learner requested to end the conversation.'
    pendingHangupReason = reason
    if (hangupTimer) {
      clearTimeout(hangupTimer)
      hangupTimer = null
    }
    if (callId) {
      sendFunctionCallResult(callId, { action: 'end_conversation', status: 'acknowledged', reason })
    }
  }

  function sendFunctionCallResult(callId: string, output: unknown) {
    if (!realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) {
      return
    }
    const payload = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: typeof output === 'string' ? output : JSON.stringify(output),
      },
    }
    realtimeSocket.send(JSON.stringify(payload))
    realtimeSocket.send(JSON.stringify({ type: 'response.create' }))
  }

  function attemptAutoHangup() {
    if (!pendingHangupReason || sessionStatus.value !== 'connected') {
      return
    }
    if (hangupTimer) {
      clearTimeout(hangupTimer)
    }
    const schedule = typeof window === 'undefined' ? setTimeout : window.setTimeout
    hangupTimer = schedule(() => {
      hangupTimer = null
      pendingHangupReason = null
      disconnect()
    }, AUTO_HANGUP_DELAY) as ReturnType<typeof setTimeout>
  }

  function setPrompt(prompt: string) {
    config.prompt = prompt || DEFAULT_PROMPT
    if (sessionStatus.value === 'connected') {
      sendSessionUpdate()
    }
  }

  function setCharacter(characterName: string) {
    if (!characterName) return
    config.characterName = characterName
  }

  function setVoice(voice: string) {
    if (!voice) return
    config.voice = voice
    if (sessionStatus.value === 'connected') {
      sendSessionUpdate()
    }
  }

  async function handleRealtimePayload(data: any) {
    const type = data?.type
    const nav = data?.data ?? {}
    switch (type) {
      case NavTalkMessageType.CONNECTED_SUCCESS:
        if (Array.isArray(nav?.iceServers)) {
          iceServers = nav.iceServers
        }
        break
      case NavTalkMessageType.INSUFFICIENT_BALANCE:
        handleError('Insufficient balance for NavTalk realtime call.')
        break
      case NavTalkMessageType.CONNECTED_FAIL:
      case NavTalkMessageType.CONNECTED_CLOSE:
        handleError(data?.message ?? 'NavTalk connection closed.')
        break
      case NavTalkMessageType.REALTIME_SESSION_CREATED:
        await sendSessionUpdate()
        break
      case NavTalkMessageType.REALTIME_SESSION_UPDATED:
        sessionStatus.value = 'connected'
        startRecording()
        break
      case NavTalkMessageType.WEB_RTC_OFFER:
        await handleOffer(nav)
        break
      case NavTalkMessageType.WEB_RTC_ANSWER:
        handleAnswer(nav)
        break
      case NavTalkMessageType.WEB_RTC_ICE_CANDIDATE:
        handleIceCandidate(nav)
        break
      case NavTalkMessageType.REALTIME_SPEECH_STARTED:
        userSpeaking.value = true
        handleUserPlaceholder()
        stopPlayback()
        break
      case NavTalkMessageType.REALTIME_SPEECH_STOPPED:
        userSpeaking.value = false
        break
      case NavTalkMessageType.REALTIME_CONVERSATION_ITEM_COMPLETED:
        resolveUserPlaceholder(nav?.content ?? data?.transcript ?? '')
        break
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DELTA:
      case NavTalkMessageType.LEGACY_RESPONSE_AUDIO_TRANSCRIPT_DELTA: {
        const transcript = nav?.content ?? nav?.delta ?? data?.delta ?? ''
        const responseId = nav?.id ?? data?.response_id ?? createId('assistant')
        handleAssistantDelta(responseId, transcript)
        break
      }
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_TRANSCRIPT_DONE:
      case NavTalkMessageType.LEGACY_RESPONSE_AUDIO_TRANSCRIPT_DONE: {
        const responseId = nav?.id ?? data?.response_id ?? ''
        if (responseId) {
          finalizeAssistantResponse(responseId)
        } else {
          assistantThinking.value = false
        }
        break
      }
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_DELTA:
      case NavTalkMessageType.LEGACY_RESPONSE_AUDIO_DELTA:
        if (typeof nav?.delta === 'string') {
          enqueueAudioChunk(nav.delta)
        }
        break
      case NavTalkMessageType.REALTIME_RESPONSE_AUDIO_DONE:
        assistantThinking.value = false
        attemptAutoHangup()
        break
      case NavTalkMessageType.REALTIME_RESPONSE_COMPLETED:
      case NavTalkMessageType.LEGACY_RESPONSE_COMPLETED:
        assistantThinking.value = false
        attemptAutoHangup()
        break
      case NavTalkMessageType.REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DELTA:
      case NavTalkMessageType.LEGACY_FUNCTION_CALL_DELTA:
        handleFunctionCallDelta({ call_id: nav?.call_id ?? data?.call_id, delta: nav?.delta ?? data?.delta })
        break
      case NavTalkMessageType.REALTIME_RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE:
      case NavTalkMessageType.LEGACY_FUNCTION_CALL_DONE:
        handleFunctionCallDone({
          name: nav?.name ?? data?.name,
          call_id: nav?.call_id ?? data?.call_id,
          arguments: nav?.arguments ?? data?.arguments,
        })
        break
      case NavTalkMessageType.REALTIME_RESPONSE_ERROR:
      case NavTalkMessageType.LEGACY_RESPONSE_ERROR:
      case NavTalkMessageType.ERROR:
        handleError(data?.message ?? data?.error?.message ?? 'NavTalk realtime service reported an error.')
        break
      default:
        break
    }
  }
  async function connect() {
    if (!isConfigured.value) {
      errorMessage.value = 'Please configure the NavTalk license in your .env file.'
      return
    }
    if (sessionStatus.value === 'connecting' || sessionStatus.value === 'connected') {
      return
    }

    errorMessage.value = ''
    sessionStatus.value = 'connecting'
    assistantSegments.clear()
    pendingUserMessageId = null

    const url = buildRealtimeUrl(config)

    try {
      realtimeSocket = new WebSocket(url)
      realtimeSocket.binaryType = 'arraybuffer'

      realtimeSocket.onopen = () => {
        console.info('Realtime socket connected')
      }

      realtimeSocket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return
        }
        try {
          const payload = JSON.parse(event.data)
          void handleRealtimePayload(payload)
        } catch (err) {
          console.error('Failed to parse realtime payload', err)
        }
      }

      realtimeSocket.onerror = () => {
        handleError('Realtime connection encountered an issue. Please try again.')
      }

      realtimeSocket.onclose = () => {
        if (sessionStatus.value === 'connected') {
          teardown('idle', 'Session closed.')
        } else {
          teardown('idle')
        }
      }
    } catch (error) {
      console.error('Unable to start realtime session', error)
      handleError('Unable to connect to the NavTalk service.')
    }
  }

  async function sendTextMessage() {
    const text = manualMessage.value.trim()
    if (!text) return
    if (!realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) {
      errorMessage.value = 'Not connected to NavTalk, unable to send messages.'
      return
    }
    manualMessage.value = ''
    appendMessage('user', text)
    realtimeSocket.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text,
            },
          ],
        },
      })
    )
    realtimeSocket.send(JSON.stringify({ type: 'response.create' }))
  }

  function toggleSession() {
    if (isCallActive.value || isConnecting.value) {
      disconnect()
    } else {
      connect()
    }
  }

  function clearHistory() {
    chatMessages.value = []
    saveHistory([])
  }

  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    config,
    chatMessages,
    sessionStatus,
    assistantThinking,
    userSpeaking,
    isVideoStreaming,
    errorMessage,
    manualMessage,
    isCallActive,
    isConnecting,
    isConfigured,
    isMicMuted,
    connect,
    disconnect,
    toggleSession,
    toggleMicrophone,
    muteMicrophone,
    unmuteMicrophone,
    sendTextMessage,
    clearHistory,
    setPrompt,
    setCharacter,
    setVoice,
    resumePlaybackAudio: resumePlaybackContext,
  }
}
