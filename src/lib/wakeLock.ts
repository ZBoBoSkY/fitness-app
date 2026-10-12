// 屏幕常亮 (Screen Wake Lock API)
let wakeLock: WakeLockSentinel | null = null
let reacquire = false

export async function requestWakeLock(): Promise<boolean> {
  if (!('wakeLock' in navigator)) return false
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    reacquire = true
    wakeLock.addEventListener('release', () => {
      if (reacquire) {
        // 页面重新可见时自动重新获取
        requestWakeLock()
      }
    })
    return true
  } catch {
    return false
  }
}

export async function releaseWakeLock(): Promise<void> {
  reacquire = false
  try {
    await wakeLock?.release()
  } catch {
    /* ignore */
  }
  wakeLock = null
}

// 页面可见性变化时重新获取（离开再回来）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && reacquire) {
      requestWakeLock()
    }
  })
}
