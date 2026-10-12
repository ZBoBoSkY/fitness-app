import { useApp } from '../state/store'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimerBar() {
  const { restTimer, tickTimer, dismissRestTimer, dismissTickTimer, settings, updateSettings } = useApp()

  const timer = restTimer ?? tickTimer
  const isTick = !!tickTimer && !restTimer

  if (!timer) return null

  return (
    <div className="timer-bar">
      <div>
        <div className="t-label">{timer.label}</div>
        <div className="t-num">{fmt(timer.remaining)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isTick && (
          <button
            className={`switch ${settings.tickEnabled ? 'on' : ''}`}
            onClick={() => updateSettings({ tickEnabled: !settings.tickEnabled })}
            aria-label="滴答声开关"
          />
        )}
        <button className="close" onClick={() => (restTimer ? dismissRestTimer() : dismissTickTimer())} aria-label="关闭">
          ×
        </button>
      </div>
    </div>
  )
}
