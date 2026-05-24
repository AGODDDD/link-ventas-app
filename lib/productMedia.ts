import { supabase } from '@/lib/supabase'
import { ProductMedia } from '@/types/tienda'
import { optimizeImage } from '@/lib/optimizeImage'

type OptimizedMedia = Omit<ProductMedia, 'url' | 'poster_url'> & {
  blob: Blob;
  fileName: string;
  contentType: string;
  posterBlob?: Blob;
  posterFileName?: string;
}

const MAX_VIDEO_SECONDS = 8
const VIDEO_MAX_DIMENSION = 1280
const VIDEO_BITRATE = 1_800_000
const VIDEO_FPS = 30

export function normalizeProductMedia(media: unknown, fallbackImageUrl?: string | null, gallery?: unknown): ProductMedia[] {
  const parsed = Array.isArray(media)
    ? media.filter((item): item is ProductMedia => {
        const candidate = item as Partial<ProductMedia>
        return !!candidate?.url && (candidate.type === 'image' || candidate.type === 'video')
      })
    : []

  if (parsed.length > 0) return parsed

  const parsedGallery = parseGalleryMedia(gallery)
  if (parsedGallery.length > 0) return parsedGallery

  return fallbackImageUrl ? [{ type: 'image', url: fallbackImageUrl }] : []
}

export function serializeProductMedia(media: ProductMedia[]) {
  return media.map(item => JSON.stringify(item))
}

export function getProductMediaThumbnail(media: ProductMedia[]) {
  const firstImage = media.find(item => item.type === 'image')
  const firstItem = media[0]
  return firstImage?.url || firstItem?.poster_url || firstItem?.url || null
}

export async function uploadProductMediaFiles(files: File[]): Promise<ProductMedia[]> {
  const uploaded: ProductMedia[] = []

  for (const file of files) {
    const optimized = await optimizeProductMedia(file)

    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(optimized.fileName, optimized.blob, { contentType: optimized.contentType })

    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage
      .from('productos')
      .getPublicUrl(optimized.fileName)

    let posterUrl: string | undefined
    if (optimized.posterBlob && optimized.posterFileName) {
      const { error: posterError } = await supabase.storage
        .from('productos')
        .upload(optimized.posterFileName, optimized.posterBlob, { contentType: 'image/webp' })

      if (posterError) throw posterError

      const { data: posterData } = supabase.storage
        .from('productos')
        .getPublicUrl(optimized.posterFileName)
      posterUrl = posterData.publicUrl
    }

    uploaded.push({
      id: crypto.randomUUID(),
      type: optimized.type,
      url: publicData.publicUrl,
      ...(posterUrl ? { poster_url: posterUrl } : {}),
      ...(optimized.width ? { width: optimized.width } : {}),
      ...(optimized.height ? { height: optimized.height } : {}),
      ...(optimized.duration ? { duration: optimized.duration } : {}),
      mime_type: optimized.contentType,
      size: optimized.blob.size,
    })
  }

  return uploaded
}

async function optimizeProductMedia(file: File): Promise<OptimizedMedia> {
  if (file.type.startsWith('image/')) {
    const image = await optimizeImage(file, { maxDimension: 1400, quality: 0.9 })
    return {
      type: 'image',
      blob: image.blob,
      fileName: image.fileName,
      contentType: 'image/webp',
      size: image.blob.size,
    }
  }

  if (file.type.startsWith('video/')) {
    return optimizeVideo(file)
  }

  throw new Error('Formato no soportado. Sube fotos o clips de video.')
}

async function optimizeVideo(file: File): Promise<OptimizedMedia> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'

  const objectUrl = URL.createObjectURL(file)

  try {
    await loadVideo(video, objectUrl)
    if (video.duration > MAX_VIDEO_SECONDS + 0.25) {
      throw new Error(`El clip "${file.name}" dura ${video.duration.toFixed(1)}s. El maximo permitido es ${MAX_VIDEO_SECONDS}s.`)
    }

    const { width, height } = fitDimensions(video.videoWidth || 720, video.videoHeight || 720, VIDEO_MAX_DIMENSION)
    const posterBlob = await createPoster(video, width, height)

    if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) {
      return {
        type: 'video',
        blob: file,
        fileName: uniqueFileName(file.name),
        contentType: file.type || 'video/mp4',
        width,
        height,
        duration: video.duration,
        size: file.size,
        posterBlob,
        posterFileName: uniqueFileName(`${file.name}-poster.webp`, 'webp'),
      }
    }

    const mimeType = getSupportedVideoMimeType()
    if (!mimeType) {
      return {
        type: 'video',
        blob: file,
        fileName: uniqueFileName(file.name),
        contentType: file.type || 'video/mp4',
        width,
        height,
        duration: video.duration,
        size: file.size,
        posterBlob,
        posterFileName: uniqueFileName(`${file.name}-poster.webp`, 'webp'),
      }
    }

    const blob = await transcodeVideo(video, width, height, mimeType)

    return {
      type: 'video',
      blob,
      fileName: uniqueFileName(file.name, mimeType.includes('mp4') ? 'mp4' : 'webm'),
      contentType: mimeType,
      width,
      height,
      duration: video.duration,
      size: blob.size,
      posterBlob,
      posterFileName: uniqueFileName(`${file.name}-poster.webp`, 'webp'),
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadVideo(video: HTMLVideoElement, objectUrl: string) {
  return new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('No se pudo leer el video. Prueba con MP4 o WebM.'))
    video.src = objectUrl
  })
}

function fitDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) return { width, height }
  const ratio = width > height ? maxDimension / width : maxDimension / height
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

async function createPoster(video: HTMLVideoElement, width: number, height: number) {
  await seekVideo(video, Math.min(0.1, Math.max(video.duration - 0.1, 0)))
  const canvas = drawVideoFrame(video, width, height)
  return canvasToBlob(canvas, 'image/webp', 0.82)
}

async function transcodeVideo(video: HTMLVideoElement, width: number, height: number, mimeType: string) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar la compresion del video.')

  const stream = canvas.captureStream(VIDEO_FPS)
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: VIDEO_BITRATE,
  })
  const chunks: BlobPart[] = []

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  await seekVideo(video, 0)
  video.muted = true
  video.playbackRate = 1

  const draw = () => {
    if (!video.paused && !video.ended) {
      ctx.drawImage(video, 0, 0, width, height)
      requestAnimationFrame(draw)
    }
  }

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('No se pudo comprimir el video.'))
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
  })

  recorder.start(250)
  await video.play()
  draw()

  await new Promise<void>((resolve) => {
    video.onended = () => resolve()
  })

  if (recorder.state !== 'inactive') recorder.stop()
  stream.getTracks().forEach(track => track.stop())
  return finished
}

function drawVideoFrame(video: HTMLVideoElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el poster del video.')
  ctx.drawImage(video, 0, 0, width, height)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('No se pudo generar el archivo optimizado.'))
    }, type, quality)
  })
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve()
      return
    }
    const done = () => {
      video.removeEventListener('seeked', done)
      resolve()
    }
    video.addEventListener('seeked', done)
    video.currentTime = time
  })
}

function getSupportedVideoMimeType() {
  const options = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return options.find(type => MediaRecorder.isTypeSupported(type)) || ''
}

function uniqueFileName(originalName: string, forcedExtension?: string) {
  const extension = forcedExtension || originalName.split('.').pop()?.toLowerCase() || 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}.${extension}`
}

function parseGalleryMedia(gallery: unknown): ProductMedia[] {
  if (!Array.isArray(gallery)) return []

  return gallery
    .map((item): ProductMedia | null => {
      if (typeof item !== 'string') {
        const candidate = item as Partial<ProductMedia>
        return candidate?.url && (candidate.type === 'image' || candidate.type === 'video') ? candidate as ProductMedia : null
      }

      try {
        const parsed = JSON.parse(item) as Partial<ProductMedia>
        return parsed?.url && (parsed.type === 'image' || parsed.type === 'video') ? parsed as ProductMedia : null
      } catch {
        return item ? { type: 'image', url: item } : null
      }
    })
    .filter((item): item is ProductMedia => Boolean(item))
}
