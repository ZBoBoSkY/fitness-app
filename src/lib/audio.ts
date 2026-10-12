// Web Audio 声音：滴答声 + 提示音
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtx = new AC()
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

/** 播放短促滴答声 */
export function playTick() {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = 1000
  gain.gain.setValueAtTime(0.12, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** 播放提示音（完成一组 / 倒计时结束） */
export function playChime() {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime
  const notes = [660, 880]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = t + i * 0.12
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.32)
  })
}

/** 到点三声（连续三声提示音） */
export function playChimeTriple() {
  const ctx = getCtx()
  if (!ctx) return
  for (let i = 0; i < 3; i++) {
    const t = ctx.currentTime + i * 0.3
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.26)
  }
}

/** 震动（若支持） */
export function vibrate(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
