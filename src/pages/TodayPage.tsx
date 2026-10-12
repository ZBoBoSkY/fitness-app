import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/store'
import { dayIndexForDate, toDateKey, countTotalSets } from '../lib/plan'
import { formatFull, weekdayName } from '../lib/date'
import * as db from '../lib/db'
import DayStrip from '../components/DayStrip'
import ProgressRing from '../components/ProgressRing'
import ExerciseAnimation from '../components/ExerciseAnimation'

export default function TodayPage() {
  const { plan, planLoaded, selectedDate, setSelectedDate, records, toggleSet } = useApp()
  const [choice, setChoice] = useState<Record<number, number>>({})

  if (!planLoaded || !plan) {
    return <div className="empty">加载中…</div>
  }

  const dayIndex = dayIndexForDate(plan, selectedDate)
  const day = dayIndex != null ? plan.days.find((d) => d.dayIndex === dayIndex) : null

  if (!day) {
    return (
      <div className="empty">
        当前日期不在计划范围内
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => setSelectedDate(new Date())}>
            回到今天
          </button>
        </div>
      </div>
    )
  }

  const dateKey = toDateKey(selectedDate)
  const totalSets = countTotalSets(day)

  // 统计已完成组数
  let doneSets = 0
  for (const sec of day.sections) {
    for (const it of sec.items) {
      const key = db.makeRecordKey(dateKey, day.dayIndex, it.id)
      const rec = records[key]
      if (rec) doneSets += rec.completedSets.length
    }
  }

  const isRestDay = day.type === 'rest'
  const allDone = !isRestDay && totalSets > 0 && doneSets >= totalSets

  const typeLabel: Record<string, string> = {
    strength: '力量',
    cardio: '有氧',
    recovery: '恢复',
    rest: '休息',
  }

  return (
    <div>
      {/* 大标题 */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>本日计划</div>
        <div className="text-2" style={{ fontSize: 14, marginTop: 4 }}>
          {formatFull(selectedDate)} {weekdayName(selectedDate)}
        </div>
      </div>

      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      {/* 计划卡片 */}
      <div className="card plan-card">
        <div className="plan-main">
          <div className="plan-title">
            {day.title}
            <span style={{ marginLeft: 8 }} className="badge">
              DAY {day.dayIndex} · {typeLabel[day.type]}
            </span>
          </div>
          <div className="plan-subtitle">{day.subtitle}</div>
          <div className="plan-meta">
            {day.durationMin[0]}-{day.durationMin[1]} 分钟
          </div>
          {isRestDay ? (
            <div className="done-msg" style={{ textAlign: 'left', marginTop: 8 }}>
              今天是休息日，好好恢复。
            </div>
          ) : allDone ? (
            <div className="done-msg" style={{ textAlign: 'left', marginTop: 8 }}>
              今天的计划已完成，好好恢复。
            </div>
          ) : null}
        </div>
        {!isRestDay && <ProgressRing done={doneSets} total={totalSets} />}
      </div>

      {/* 训练提醒 */}
      {day.reminder && (
        <div className="card reminder-card">
          <div className="reminder-title">训练提醒</div>
          <div className="reminder-text">{day.reminder}</div>
          {day.choices.length > 0 && (
            <div className="choice-toggle">
              {day.choices.map((c, i) => (
                <button key={i} className={(choice[day.dayIndex] ?? 0) === i ? 'on' : ''} onClick={() => setChoice((prev) => ({ ...prev, [day.dayIndex]: i }))}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 按 sections 分组列出动作 */}
      {day.sections.map((sec, si) => (
        <div key={si}>
          <div className="section-title">{sec.name}</div>
          {sec.items.map((it) => {
            const key = db.makeRecordKey(dateKey, day.dayIndex, it.id)
            const rec = records[key]
            const doneArr = rec?.completedSets ?? []
            const isTimed = it.timed
            return (
              <div className="exercise-card" key={it.id}>
                <div className="thumb" onClick={() => undefined}>
                  <ExerciseAnimation
                    exerciseId={it.id}
                    view={it.animation.view}
                    highlight={it.animation.highlight}
                    playing={false}
                  />
                </div>
                <div className="info">
                  <Link to={`/exercise/${day.dayIndex}/${it.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="name">{it.name}</div>
                  </Link>
                  <div className="spec">
                    {isTimed ? `${it.durationSec}秒 · ` : `${it.sets} 组 × ${it.reps ?? '-'} 次 · `}
                    {it.load}
                  </div>
                  {it.note && <div className="note">{it.note}</div>}
                  <div className="sets-row">
                    {isTimed
                      ? [1].map((n) => (
                          <button
                            key={n}
                            className={`set-btn ${doneArr.includes(n) ? 'done' : ''}`}
                            onClick={() => toggleSet(day.dayIndex, it.id, n, 1, 0)}
                          >
                            ✓
                          </button>
                        ))
                      : Array.from({ length: it.sets }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            className={`set-btn ${doneArr.includes(n) ? 'done' : ''}`}
                            onClick={() => toggleSet(day.dayIndex, it.id, n, it.sets, it.restSec)}
                          >
                            {n}
                          </button>
                        ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {day.sections.length === 0 && <div className="empty">今天没有安排动作，休息即可。</div>}
    </div>
  )
}
