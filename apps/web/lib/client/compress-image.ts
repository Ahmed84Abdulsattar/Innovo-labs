import 'client-only' // Build fails if this browser-only module is ever pulled into a server bundle.
// ── Client-side image compression ──────────────────────────────────────────
// Shared by the collaborations and news pages (was previously copy-pasted
// in four places). Browser-only: relies on Image/canvas.

// Refuse to decode absurdly large source files — the whole file is loaded
// into memory before compression.
export const MAX_SOURCE_IMAGE_MB = 15

export function compressImage(file: File, maxW = 1280, maxH = 720, q = 0.82): Promise<string> {
  if (file.size > MAX_SOURCE_IMAGE_MB * 1024 * 1024) {
    return Promise.reject(new Error(`"${file.name}" is larger than ${MAX_SOURCE_IMAGE_MB} MB.`))
  }
  return new Promise((res, rej) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width: w, height: h } = img
      if (w > maxW || h > maxH) { const r = Math.min(maxW / w, maxH / h); w = Math.round(w * r); h = Math.round(h * r) }
      const c = document.createElement('canvas'); c.width = w; c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      res(c.toDataURL('image/jpeg', q))
    }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`Could not read "${file.name}" as an image.`)) }
    img.src = url
  })
}
