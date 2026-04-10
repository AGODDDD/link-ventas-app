/**
 * optimizeImage — Client-side image optimizer
 * 
 * Converts any image (JPG, PNG, HEIC, etc.) to WebP format
 * with high visual quality and optional max dimension resize.
 * 
 * Runs entirely in the browser using Canvas API — no server needed.
 */

interface OptimizeOptions {
  /** Max width or height in pixels. Default: 1400 */
  maxDimension?: number;
  /** WebP quality 0-1. Default: 0.90 (high quality, good compression) */
  quality?: number;
}

/**
 * Takes a File object and returns an optimized WebP Blob + filename.
 * 
 * @example
 * const { blob, fileName } = await optimizeImage(file)
 * await supabase.storage.from('productos').upload(fileName, blob)
 */
export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<{ blob: Blob; fileName: string }> {
  const { maxDimension = 1400, quality = 0.90 } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        let { width, height } = img

        // Resize if larger than maxDimension (preserve aspect ratio)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        // Draw to canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas context not available')

        // Use high quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'))
              return
            }

            // Generate clean filename with .webp extension
            const baseName = file.name.replace(/\.[^.]+$/, '') // remove old extension
            const timestamp = Date.now()
            const random = Math.random().toString(36).substring(2, 8)
            const fileName = `${timestamp}-${random}.webp`

            resolve({ blob, fileName })
          },
          'image/webp',
          quality
        )
      } catch (err) {
        reject(err)
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    // Load image from file
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
