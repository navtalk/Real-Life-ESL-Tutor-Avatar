<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCameraRecognition } from '../composables/useCameraRecognition'

const props = defineProps<{
  active: boolean
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const panelRef = ref<HTMLDivElement | null>(null)
const cameraStream = ref<MediaStream | null>(null)
const cameraReady = ref(false)
const cameraError = ref('')
const isDragging = ref(false)

const {
  isRecognitionActive,
  recognitionLabels,
  recognitionStatus,
  recognitionError,
  toggleRecognition: toggleCameraRecognition,
  stopRecognition,
} = useCameraRecognition(videoRef, { intervalMs: 4500 })

const recognitionPlaceholder = computed(() => {
  if (recognitionError.value) {
    return 'Unable to analyze the scene.'
  }
  switch (recognitionStatus.value) {
    case 'preparing':
      return 'Preparing scene analysis...'
    case 'analyzing':
      return 'Analyzing the latest frame...'
    case 'capturing':
      return 'Scene analysis is active.'
    default:
      return 'Enable scene analysis to describe what the camera sees.'
  }
})

const position = ref({
  x: 24,
  y: 24,
})

const dragOffset = {
  x: 0,
  y: 0,
}

const panelStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px)`,
}))

function clampPosition(nextX: number, nextY: number) {
  if (typeof window === 'undefined') {
    position.value = { x: nextX, y: nextY }
    return
  }
  const panel = panelRef.value
  const width = panel?.offsetWidth ?? 220
  const height = panel?.offsetHeight ?? 140
  const maxX = Math.max(0, window.innerWidth - width - 16)
  const maxY = Math.max(0, window.innerHeight - height - 16)
  position.value = {
    x: Math.min(Math.max(16, nextX), maxX),
    y: Math.min(Math.max(16, nextY), maxY),
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  clampPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y)
}

function stopDragging() {
  isDragging.value = false
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopDragging)
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  event.stopPropagation()
  dragOffset.x = event.clientX - position.value.x
  dragOffset.y = event.clientY - position.value.y
  isDragging.value = true
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopDragging)
}

async function startCamera() {
  if (typeof navigator === 'undefined' || cameraStream.value || !props.active) {
    return
  }
  cameraError.value = ''
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 360 },
      },
      audio: false,
    })
    cameraStream.value = stream
    const video = videoRef.value
    if (video) {
      video.srcObject = stream
      await video.play().catch(() => null)
    }
    cameraReady.value = true
  } catch (error) {
    console.error('Camera access denied', error)
    cameraError.value = 'Unable to access the camera. Please review browser permissions.'
    cameraReady.value = false
  }
}

function stopCamera() {
  cameraReady.value = false
  cameraError.value = ''
  const stream = cameraStream.value
  if (stream) {
    stream.getTracks().forEach((track) => {
      try {
        track.stop()
      } catch {
        /* ignore */
      }
    })
  }
  cameraStream.value = null
  const video = videoRef.value
  if (video) {
    video.pause()
    video.removeAttribute('src')
    video.srcObject = null
    video.load()
  }
  stopRecognition()
}

function handleResize() {
  clampPosition(position.value.x, position.value.y)
}

function handleRecognitionToggle() {
  if (!cameraReady.value) {
    cameraError.value = 'Camera feed is not ready.'
    return
  }
  toggleCameraRecognition()
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      startCamera()
    } else {
      stopCamera()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
    clampPosition(position.value.x, position.value.y)
  }
})

onBeforeUnmount(() => {
  stopCamera()
  stopDragging()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
})
</script>

<template>
  <div
    v-if="active"
    ref="panelRef"
    class="movable-camera"
    :style="panelStyle"
    role="region"
    aria-label="User camera preview"
  >
    <header class="camera-bar" @pointerdown="handlePointerDown">
      <span>My Camera</span>
      <span class="drag-hint">Drag anywhere</span>
    </header>
    <div class="camera-stage">
      <video v-show="cameraReady" ref="videoRef" autoplay playsinline muted></video>
      <p v-if="!cameraReady && !cameraError" class="camera-tip">Awaiting camera permission…</p>
      <p v-if="cameraError" class="camera-error">{{ cameraError }}</p>
    </div>
    <div class="camera-intel">
      <div class="intel-header">
        <span>Scene analysis</span>
        <button
          type="button"
          class="intel-toggle"
          :disabled="!cameraReady"
          @click="handleRecognitionToggle"
        >
          {{ isRecognitionActive ? 'Stop analysis' : 'Analyze scene' }}
        </button>
      </div>
      <ul v-if="recognitionLabels.length" class="intel-list">
        <li v-for="label in recognitionLabels" :key="label.id">
          <div>
            <span class="label-name">{{ label.title }}</span>
            <small v-if="label.detail" class="label-detail">{{ label.detail }}</small>
          </div>
          <span class="label-score">{{ (label.confidence * 100).toFixed(0) }}%</span>
        </li>
      </ul>
      <p v-else class="intel-placeholder">
        {{ recognitionPlaceholder }}
      </p>
      <p v-if="recognitionError" class="intel-error">{{ recognitionError }}</p>
    </div>
  </div>
</template>

<style scoped>
.movable-camera {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  width: min(320px, 26vw);
  max-width: 360px;
  min-width: 220px;
  background: rgba(17, 19, 39, 0.8);
  border-radius: 20px;
  box-shadow: 0 18px 35px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  color: #fff;
  user-select: none;
  transition: box-shadow 0.2s ease;
}

.movable-camera:active {
  box-shadow: 0 22px 40px rgba(0, 0, 0, 0.45);
}

.camera-bar {
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  cursor: grab;
}

.camera-bar:active {
  cursor: grabbing;
}

.drag-hint {
  opacity: 0.6;
  font-size: 0.75rem;
}

.camera-stage {
  padding: 8px;
  border-radius: 0 0 20px 20px;
  overflow: hidden;
}

.camera-stage video {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 16px;
  object-fit: cover;
  background: #0f172a;
}

.camera-intel {
  padding: 12px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.intel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.9;
}

.intel-toggle {
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  padding: 4px 12px;
  background: transparent;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
}

.intel-toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.intel-toggle:not(:disabled):hover {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.15);
}

.intel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.intel-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.label-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.label-detail {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
}

.label-score {
  font-weight: 600;
  font-size: 0.85rem;
}

.intel-placeholder {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.7;
}

.intel-error {
  margin: 0;
  font-size: 0.8rem;
  color: #fecaca;
}

.camera-tip,
.camera-error {
  margin: 16px;
  font-size: 0.85rem;
  text-align: center;
}

.camera-error {
  color: #fecaca;
}

@media (max-width: 768px) {
  .movable-camera {
    width: min(240px, 45vw);
  }
}
</style>
