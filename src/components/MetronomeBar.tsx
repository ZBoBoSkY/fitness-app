import { useApp } from '../state/store'

/** 全局节拍器状态条：开启后每秒一声；有计时条激活时自动让位 */
export default function MetronomeBar() {
  const { settings, updateSettings, restTimer, tickTimer } = useApp()

  if (!settings.metronomeOn) return null
  if (restTimer || tickTimer) return null

  return (
    <div className="metronome-bar">
      <span className="m-dot" />
      <span className="m-text">滴答声已开启 · 每秒一声</span>
      <button className="m-close" onClick={() => updateSettings({ metronomeOn: false })}>
        关闭
      </button>
    </div>
  )
}
