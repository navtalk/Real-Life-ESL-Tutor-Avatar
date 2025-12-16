import { ref, type Ref } from 'vue'

export type RecognitionStatus = 'idle' | 'preparing' | 'capturing' | 'analyzing' | 'error'

export interface VisionLabel {
  id: string
  title: string
  confidence: number
  detail?: string
}

interface UseCameraRecognitionOptions {
  intervalMs?: number
}

const DEFAULT_INTERVAL = 5000

export function useCameraRecognition(
  videoRef: Ref<HTMLVideoElement | null>,
  options?: UseCameraRecognitionOptions
) {
  const labels = ref<VisionLabel[]>([])
  const status = ref<RecognitionStatus>('idle')
  const errorMessage = ref('')
  const lastUpdated = ref<number | null>(null)
  const isActive = ref(false)

  let captureTimer: ReturnType<typeof setTimeout> | null = null
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  const interval = options?.intervalMs ?? DEFAULT_INTERVAL

  const visionEndpoint = import.meta.env.VITE_VISION_ENDPOINT ?? ''
  const visionKey = import.meta.env.VITE_VISION_API_KEY ?? ''

  function ensureCanvas() {
    if (typeof window === 'undefined') return false
    if (!canvas) {
      canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d')
    }
    return Boolean(ctx)
  }

  function clearTimer() {
    if (captureTimer) {
      clearTimeout(captureTimer)
      captureTimer = null
    }
  }

  function stopRecognition() {
    clearTimer()
    isActive.value = false
    labels.value = []
    status.value = 'idle'
    errorMessage.value = ''
  }

  function scheduleNext() {
    clearTimer()
    if (!isActive.value) return
    captureTimer = setTimeout(async () => {
      await captureAndAnalyze()
      if (isActive.value) {
        scheduleNext()
      }
    }, interval) as ReturnType<typeof setTimeout>
  }

  async function captureAndAnalyze() {
    const video = videoRef.value
    if (!video || video.readyState < 2) {
      errorMessage.value = 'Camera stream is not ready.'
      status.value = 'error'
      return
    }
    if (!ensureCanvas() || !ctx || !canvas) {
      errorMessage.value = 'Canvas context is unavailable.'
      status.value = 'error'
      return
    }
    const width = video.videoWidth || video.clientWidth || 640
    const height = video.videoHeight || video.clientHeight || 360
    canvas.width = width
    canvas.height = height
    ctx.drawImage(video, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)

    try {
      status.value = 'analyzing'
      let parsedLabels: VisionLabel[] = []
      if (visionEndpoint && visionKey) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas?.toBlob((result) => {
            if (result) resolve(result)
            else reject(new Error('Unable to capture camera frame.'))
          }, 'image/jpeg', 0.8)
        })
        const payload = await analyzeWithRemote(blob)
        parsedLabels = normalizeRemoteResponse(payload)
      } else {
        parsedLabels = analyzeLocally(imageData.data)
      }
      labels.value = parsedLabels
      lastUpdated.value = Date.now()
      status.value = 'capturing'
      errorMessage.value = ''
    } catch (error) {
      console.error('Camera recognition failed', error)
      errorMessage.value = error instanceof Error ? error.message : 'Camera recognition failed.'
      status.value = 'error'
    }
  }

  async function analyzeWithRemote(blob: Blob) {
    const base64 = await blobToBase64(blob)
    const response = await fetch(visionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${visionKey}`,
      },
      body: JSON.stringify({ image: base64 }),
    })
    if (!response.ok) {
      throw new Error(`Vision API responded with ${response.status}`)
    }
    return response.json()
  }

  function normalizeRemoteResponse(payload: any): VisionLabel[] {
    const sourceLabels =
      (Array.isArray(payload?.labels) && payload.labels) ||
      (Array.isArray(payload?.data?.labels) && payload.data.labels) ||
      []
    if (!Array.isArray(sourceLabels)) return []
    return sourceLabels
      .map((item: any, index: number) => {
        const name = typeof item?.name === 'string' ? item.name : item?.title
        const confidenceValue =
          typeof item?.confidence === 'number'
            ? item.confidence
            : typeof item?.score === 'number'
            ? item.score
            : 0
        if (!name) return null
        return {
          id: item?.id ?? `label-${Date.now()}-${index}`,
          title: name,
          confidence: Math.max(0, Math.min(1, confidenceValue)),
          detail: typeof item?.detail === 'string' ? item.detail : undefined,
        } as VisionLabel
      })
      .filter(Boolean) as VisionLabel[]
  }

  function analyzeLocally(pixels: Uint8ClampedArray): VisionLabel[] {
    if (!pixels.length) {
      return []
    }
    let brightnessSum = 0
    let redSum = 0
    let greenSum = 0
    let blueSum = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      brightnessSum += 0.2126 * r + 0.7152 * g + 0.0722 * b
      redSum += r
      greenSum += g
      blueSum += b
    }
    const pixelCount = pixels.length / 4
    const avgBrightness = brightnessSum / pixelCount / 255
    const avgRed = redSum / pixelCount / 255
    const avgGreen = greenSum / pixelCount / 255
    const avgBlue = blueSum / pixelCount / 255

    const lightingLabel =
      avgBrightness >= 0.7
        ? 'Bright lighting'
        : avgBrightness <= 0.35
        ? 'Low lighting'
        : 'Neutral lighting'

    const colorLabel = dominantColorLabel(avgRed, avgGreen, avgBlue)

    return [
      {
        id: 'lighting',
        title: lightingLabel,
        confidence: Math.min(1, Math.max(0.35, Math.abs(avgBrightness - 0.5) + 0.5)),
        detail: `Average brightness ${(avgBrightness * 100).toFixed(1)}%`,
      },
      {
        id: 'color',
        title: colorLabel,
        confidence: 0.65,
        detail: `Avg RGB (${(avgRed * 255).toFixed(0)}, ${(avgGreen * 255).toFixed(0)}, ${(avgBlue * 255).toFixed(0)})`,
      },
    ]
  }

  function dominantColorLabel(r: number, g: number, b: number) {
    const max = Math.max(r, g, b)
    if (max === r) return 'Red-heavy scene'
    if (max === g) return 'Green-heavy scene'
    if (max === b) return 'Blue-heavy scene'
    return 'Mixed colors'
  }

  function blobToBase64(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === 'string') {
          resolve(result.split(',')[1] ?? '')
        } else {
          reject(new Error('Unable to read blob.'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read camera frame.'))
      reader.readAsDataURL(blob)
    })
  }

  function startRecognition() {
    if (typeof window === 'undefined') return
    if (isActive.value) return
    if (!videoRef.value) {
      errorMessage.value = 'Camera stream is unavailable.'
      status.value = 'error'
      return
    }
    errorMessage.value = ''
    status.value = 'preparing'
    isActive.value = true
    captureAndAnalyze().finally(() => {
      if (isActive.value) {
        scheduleNext()
      }
    })
  }

  function toggleRecognition() {
    if (isActive.value) {
      stopRecognition()
    } else {
      startRecognition()
    }
  }

  return {
    isRecognitionActive: isActive,
    recognitionLabels: labels,
    recognitionStatus: status,
    recognitionError: errorMessage,
    recognitionLastUpdated: lastUpdated,
    startRecognition,
    stopRecognition,
    toggleRecognition,
  }
}
