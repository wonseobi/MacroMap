import clickUrl from "@/assets/log-click.mp3"

let audioCtx: AudioContext | null = null
let buffer: AudioBuffer | null = null
let loadPromise: Promise<void> | null = null
let lastPlayTime = 0

function getCtx(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  audioCtx = audioCtx ?? new Ctor()
  return audioCtx
}

/** Fetch + decode the click mp3 once, then reuse the buffer for every play. */
async function ensureBuffer(ctx: AudioContext): Promise<void> {
  if (buffer) return
  loadPromise =
    loadPromise ??
    fetch(clickUrl)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((decoded) => {
        buffer = decoded
      })
  await loadPromise
}

/**
 * Plays the food-log "click" (a bundled mp3) via the Web Audio API. The decoded
 * buffer is cached after first load so repeated logs are cheap, and a short
 * debounce drops rapid repeat clicks so they can't pile up audio nodes.
 */
export function playLogSound() {
  const now = performance.now()
  if (now - lastPlayTime < 50) return
  lastPlayTime = now

  try {
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === "suspended") void ctx.resume()

    void ensureBuffer(ctx).then(() => {
      if (!buffer) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = 0.8
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start()
    })
  } catch {
    /* audio unavailable — fail silently */
  }
}
