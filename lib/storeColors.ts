/** Only accept a single CSS color, never markup or arbitrary CSS declarations. */
export function storeColor(value: unknown, fallback = '#bdbefe') {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}
