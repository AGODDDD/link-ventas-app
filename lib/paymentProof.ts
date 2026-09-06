import sharp from 'sharp'
import { InvalidRequestBody } from './requestBody'

export const MAX_PROOF_BYTES = 5 * 1024 * 1024

export async function normalizePaymentProof(file: File) {
  if (file.size < 1 || file.size > MAX_PROOF_BYTES) throw new InvalidRequestBody(400)
  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const image = sharp(bytes, { limitInputPixels: 20_000_000, failOn: 'warning' })
    const info = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(info.format || '') || (info.pages || 1) !== 1) throw new Error()
    // Decode, strip EXIF and re-encode. The declared MIME is not trusted.
    return await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }).toBuffer()
  } catch { throw new InvalidRequestBody(400, 'Comprobante inválido. Usa una imagen JPG, PNG o WEBP de hasta 5 MB.') }
}
