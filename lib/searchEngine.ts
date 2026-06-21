import { Product } from '@/types/tienda'

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Populate matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

export function normalizeStr(str: string): string {
  if (!str) return ''
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export interface SearchResult {
  product: Product
  score: number
  isFuzzy: boolean
}

export function fuzzySearch(query: string, products: Product[]): SearchResult[] {
  const normalizedQuery = normalizeStr(query)
  if (!normalizedQuery) {
    return products.map(p => ({ product: p, score: 0, isFuzzy: false }))
  }

  const queryTerms = normalizedQuery.split(/\s+/)

  // 1. Busqueda exacta / parcial por tokens
  const exactMatches: SearchResult[] = []

  for (const product of products) {
    const normName = normalizeStr(product.name)
    const normCat = normalizeStr(product.category || '')
    const normDesc = normalizeStr(product.description || '')

    // Check if ALL terms are included somewhere (name, category, or description)
    const allTermsMatch = queryTerms.every(term => 
      normName.includes(term) || normCat.includes(term) || normDesc.includes(term)
    )

    if (allTermsMatch) {
      // Score heuristic: exact match = 100, partial match = 80
      let score = 80
      if (normName === normalizedQuery) score = 100
      else if (normName.startsWith(normalizedQuery)) score = 90
      
      exactMatches.push({ product, score, isFuzzy: false })
    }
  }

  // 2. Si hay resultados exactos, los retornamos sin fuzzy, ordenados por score
  if (exactMatches.length > 0) {
    return exactMatches.sort((a, b) => b.score - a.score)
  }

  // 3. Si NO hay resultados exactos, aplicamos Levenshtein
  const fuzzyMatches: SearchResult[] = []
  const maxDistance = normalizedQuery.length <= 5 ? 2 : 3

  for (const product of products) {
    const normName = normalizeStr(product.name)
    const normCat = normalizeStr(product.category || '')

    // Split product name into words to compare word by word
    const nameWords = normName.split(/\s+/)
    const catWords = normCat.split(/\s+/)
    const allWords = [...nameWords, ...catWords]

    let bestDistance = Infinity

    // Compare each query term against each product word
    for (const queryTerm of queryTerms) {
      for (const word of allWords) {
        // Only compare words of similar length to avoid weird matches
        if (Math.abs(word.length - queryTerm.length) <= maxDistance) {
          const dist = levenshteinDistance(queryTerm, word)
          if (dist < bestDistance) {
            bestDistance = dist
          }
        }
      }
    }

    // 4. Incluir solo productos con distancia aceptable
    if (bestDistance <= maxDistance) {
      // Score is inversely proportional to distance
      const score = 50 - (bestDistance * 10) 
      fuzzyMatches.push({ product, score, isFuzzy: true })
    }
  }

  // 5. Ordenar por score descendente
  return fuzzyMatches.sort((a, b) => b.score - a.score)
}
