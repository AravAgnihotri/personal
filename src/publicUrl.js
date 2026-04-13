/** Files from `public/` — prefix with Vite `base` (e.g. `/personal/` on GitHub Pages). */
export function publicUrl(path) {
  const p = path.startsWith('/') ? path.slice(1) : path
  return `${import.meta.env.BASE_URL}${p}`
}
