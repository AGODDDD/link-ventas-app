export class InvalidRequestBody extends Error {
  constructor(public status: number, message = 'Solicitud inválida.') { super(message) }
}

/** Enforce the actual bytes received, including requests without Content-Length. */
export async function boundedBody(request: Request, maximum: number) {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maximum) throw new InvalidRequestBody(413)
  const reader = request.body?.getReader()
  if (!reader) throw new InvalidRequestBody(400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximum) {
        await reader.cancel()
        throw new InvalidRequestBody(413)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks, size)
}

export async function boundedJson(request: Request, maximum = 128 * 1024): Promise<Record<string, unknown>> {
  const bytes = await boundedBody(request, maximum)
  try {
    const result = JSON.parse(bytes.toString('utf8'))
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error()
    return result
  } catch { throw new InvalidRequestBody(400) }
}
