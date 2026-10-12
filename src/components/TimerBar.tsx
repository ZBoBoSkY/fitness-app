import { useApp } from '../state/store'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimerBar() {
  const { restTimer, tickTimer, dismissRestTimer, dismissTickTimer, settings, updateSettings, timerPaused, toggleTimerPause } = useApp()

  const timer = restTimer ?? tickTimer
  if (!timer) return null

  const isTick = !!tickTimer && !restTimer
  const sub = isTick ? `单次 ${timer.total} 秒 · 每秒滴答 · 到点三声` : `休息 ${timer.total} 秒 · 结束三声提示`

  return (
    <div className="timer-bar">
      <div className="t-info">
        <div className="t-label">
          {timer.label}
          {timerPaused ? ' · 已暂停' : ' · 计时中'}
        </div>
        <div className="t-sub">{sub}</div>
      </div>
      <div className="t-num">{fmt(timer.remaining)}</div>
      <div className="t-actions">
        {isTick && (
          <button
            className={`switch ${settings.tickEnabled ? 'on' : ''}`}
            onClick={() => updateSettings({ tickEnabled: !settings.tickEnabled })}
            aria-label="滴答声开关"
          />
        )}
        <button className="t-btn" onClick={toggleTimerPause} aria-label={timerPaused ? '继续' : '暂停'}>
          {timerPaused ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2l10 6-10 6z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="3.6" height="12" rx="1.2" />
              <rect x="9.4" y="2" width="3.6" height="12" rx="1.2" />
            </svg>
          )}
        </button>
        <button className="close" onClick={() => (restTimer ? dismissRestTimer() : dismissTickTimer())} aria-label="关闭">
          ×
        </button>
      </div>
    </div>
  )
}
