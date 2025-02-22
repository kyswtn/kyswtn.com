const cache = new Map<string, Blob>()
export async function fetchBlobAndCache(filePath: string) {
  if (cache.has(filePath)) return cache.get(filePath) as Blob
  const response = await fetch(filePath)
  const blob = await response.blob()
  cache.set(filePath, blob)
  return blob
}
