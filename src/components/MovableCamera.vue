<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  active: boolean
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const panelRef = ref<HTMLDivElement | null>(null)
const cameraStream = ref<MediaStream | null>(null)
const cameraReady = ref(false)
const cameraError = ref('')
const isDragging = ref(false)
const position = ref({
  x: 24,
  y: 24,
})

const panelWidth = ref(280)
const MIN_PANEL_WIDTH = 220
const MAX_PANEL_WIDTH = 540

const dragOffset = {
  x: 0,
  y: 0,
}

const panelStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px)`,
  width: `${panelWidth.value}px`,
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
}

function handleResize() {
  panelWidth.value = clampWidth(panelWidth.value)
  clampPosition(position.value.x, position.value.y)
}

function clampWidth(nextWidth: number) {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : MAX_PANEL_WIDTH
  const limit = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, nextWidth))
  const maxAllowed = Math.max(MIN_PANEL_WIDTH, viewportWidth - 48)
  return Math.min(limit, maxAllowed)
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
    panelWidth.value = clampWidth(panelWidth.value)
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
    @pointerdown="handlePointerDown"
  >
    <div class="camera-stage">
      <video v-show="cameraReady" ref="videoRef" autoplay playsinline muted></video>
      <p v-if="!cameraReady && !cameraError" class="camera-tip">Awaiting camera permission...</p>
      <p v-if="cameraError" class="camera-error">{{ cameraError }}</p>
    </div>
  </div>
</template>

<style scoped>
.movable-camera {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  width: auto;
  min-width: 220px;
  max-width: 320px;
  background: rgba(17, 19, 39, 0.92);
  border-radius: 24px;
  padding: 12px;
  box-shadow: 0 18px 35px rgba(0, 0, 0, 0.25);
  color: #fff;
  user-select: none;
  transition: box-shadow 0.2s ease;
}

.movable-camera:active {
  box-shadow: 0 22px 40px rgba(0, 0, 0, 0.45);
}

.camera-stage {
  padding: 0;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  aspect-ratio: 16 / 9;
  background: #0f111a;
}

.camera-stage video {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 18px;
  object-fit: cover;
  background: #0f172a;
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
    max-width: 90vw;
    min-width: 200px;
  }
}
</style>
