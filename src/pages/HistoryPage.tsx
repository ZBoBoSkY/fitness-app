import { useState } from 'react'
import { useApp } from '../state/store'
import { planStartDate, toDateKey, countTotalSets } from '../lib/plan'
import { formatMd } from '../lib/date'

export default function HistoryPage() {
  const { plan, records, measures, saveMeasure } = useApp()
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')

  if (!plan) return <div className="empty">加载中…</div>

  // 按周统计完成率
  const weeks = plan.plan.weeks
  const weekStats: { week: number; done: number; total: number; rate: number }[] = []
  for (let w = 1; w <= weeks; w++) {
    const days = plan.days.filter((d) => d.week === w && d.type !== 'rest')
    let done = 0
    let total = 0
    for (const day of days) {
      // 该天的日期 = startDate + (dayIndex-1)
      const start = planStartDate(plan)
      const date = new Date(start)
      date.setDate(start.getDate() + (day.dayIndex - 1))
      const dk = toDateKey(date)
      const t = countTotalSets(day)
      total += t
      for (const sec of day.sections) {
        for (const it of sec.items) {
          const rec = records[`${dk}_${day.dayIndex}_${it.id}`]
          if (rec) done += rec.completedSets.length
        }
      }
    }
    weekStats.push({ week: w, done, total, rate: total > 0 ? done / total : 0 })
  }

  // 体重/腰围折线数据
  const chartData = measures.filter((m) => m.weightKg != null || m.waistCm != null)

  const saveBody = () => {
    const d = new Date()
    saveMeasure({
      date: toDateKey(d),
      weightKg: weight ? parseFloat(weight) : null,
      waistCm: waist ? parseFloat(waist) : null,
    })
    setWeight('')
    setWaist('')
  }

  const exportRecords = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      planName: plan.plan.name,
      weeks,
      weekStats: weekStats.map((w) => ({ week: w.week, done: w.done, total: w.total, rate: Math.round(w.rate * 100) })),
      records: Object.values(records),
      measures,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `训练记录_${toDateKey(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>历史记录</div>
        <div className="text-2" style={{ fontSize: 14, marginTop: 4 }}>
          按周查看完成率，记录体重与腰围
        </div>
      </div>

      {/* 周完成率 */}
      <div className="card history-card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>每周完成率</div>
        {weekStats.map((w) => (
          <div key={w.week} style={{ marginBottom: 14 }}>
            <div className="history-row">
              <span className="text-2" style={{ fontSize: 13 }}>
                第 {w.week} 周
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {w.done}/{w.total} 组 · {Math.round(w.rate * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${w.rate * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* 体重腰围折线 */}
      <div className="card history-card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>体重 / 腰围</div>
        {chartData.length > 0 ? <BodyChart measures={chartData} /> : <div className="empty">暂无数据，先记录一次吧</div>}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="number" placeholder="体重 kg" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
            <input type="number" placeholder="腰围 cm" value={waist} onChange={(e) => setWaist(e.target.value)} inputMode="decimal" />
          </div>
          <button className="btn btn-ghost btn-block" onClick={saveBody}>
            记录今天
          </button>
        </div>
      </div>

      {/* 导出 */}
      <div className="card history-card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>导出本周记录</div>
        <div className="text-2" style={{ fontSize: 13, marginBottom: 12 }}>
          导出完成情况、实际重量、疼痛备注和体重，用于调整下周计划。
        </div>
        <button className="btn btn-primary btn-block" onClick={exportRecords}>
          导出 JSON
        </button>
      </div>
    </div>
  )
}

// 简单折线图（SVG）
function BodyChart({ measures }: { measures: { date: string; weightKg: number | null; waistCm: number | null }[] }) {
  const W = 360
  const H = 160
  const pad = 24

  const weights = measures.map((m) => m.weightKg).filter((v): v is number => v != null)
  const waists = measures.map((m) => m.waistCm).filter((v): v is number => v != null)
  const allVals = [...weights, ...waists]
  if (allVals.length === 0) return <div className="empty">无数据</div>

  const min = Math.min(...allVals) - 2
  const max = Math.max(...allVals) + 2
  const range = max - min || 1

  const x = (i: number) => pad + (i / Math.max(measures.length - 1, 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2)

  const weightPts = measures.map((m, i) => (m.weightKg != null ? `${x(i)},${y(m.weightKg)}` : null)).filter(Boolean) as string[]
  const waistPts = measures.map((m, i) => (m.waistCm != null ? `${x(i)},${y(m.waistCm)}` : null)).filter(Boolean) as string[]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* 网格 */}
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={pad} y1={pad + t * (H - pad * 2)} x2={W - pad} y2={pad + t * (H - pad * 2)} stroke="#2a2d33" strokeWidth="1" />
      ))}
      {weightPts.length > 1 && <polyline points={weightPts.join(' ')} fill="none" stroke="#ff6b2c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {waistPts.length > 1 && <polyline points={waistPts.join(' ')} fill="none" stroke="#4da3ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {measures.map((m, i) => {
        if (m.weightKg != null) return <circle key={'w' + i} cx={x(i)} cy={y(m.weightKg)} r="3.5" fill="#ff6b2c" />
        return null
      })}
      {measures.map((m, i) => {
        if (m.waistCm != null) return <circle key={'c' + i} cx={x(i)} cy={y(m.waistCm)} r="3.5" fill="#4da3ff" />
        return null
      })}
      {/* x 轴标签 */}
      <text x={pad} y={H - 4} fill="#6b7076" fontSize="9">
        {measures[0] ? formatMd(new Date(measures[0].date)) : ''}
      </text>
      <text x={W - pad - 40} y={H - 4} fill="#6b7076" fontSize="9">
        {measures[measures.length - 1] ? formatMd(new Date(measures[measures.length - 1].date)) : ''}
      </text>
    </svg>
  )
}
