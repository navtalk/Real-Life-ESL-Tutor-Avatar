const base = (() => {
  const raw = import.meta.env.BASE_URL || '/'
  return raw.endsWith('/') ? raw : `${raw}/`
})()

export function assetUrl(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${base}${normalized}`
}
