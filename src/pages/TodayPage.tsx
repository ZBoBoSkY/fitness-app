import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/store'
import { dayIndexForDate, toDateKey, countTotalSets } from '../lib/plan'
import { formatFull, weekdayName } from '../lib/date'
import * as db from '../lib/db'
import DayStrip from '../components/DayStrip'
import ProgressRing from '../components/ProgressRing'
import ExerciseAnimation from '../components/ExerciseAnimation'

function AlarmIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="7" />
      <path d="M12 10v3.5l2.5 1.8" />
      <path d="M5.2 4.2 3.4 6" />
      <path d="M18.8 4.2 20.6 6" />
    </svg>
  )
}

export default function TodayPage() {
  const { plan, planLoaded, selectedDate, setSelectedDate, records, toggleSet, settings, updateSettings, startTickTimer } = useApp()
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
      {/* 大标题 + 节拍器开关 */}
      <div className="page-head">
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>本日计划</div>
          <div className="text-2" style={{ fontSize: 14, marginTop: 4 }}>
            {formatFull(selectedDate)} {weekdayName(selectedDate)}
          </div>
        </div>
        <button
          className={`icon-btn ${settings.metronomeOn ? 'on' : ''}`}
          onClick={() => updateSettings({ metronomeOn: !settings.metronomeOn })}
          aria-label="节拍器开关"
        >
          <AlarmIcon />
        </button>
      </div>

      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

      {/* 计划卡片 */}
      <div className="card plan-card">
        <div className="plan-top">
          <span className="plan-kicker">TRAINING PLAN</span>
          <span className="plan-day">DAY {String(day.dayIndex).padStart(2, '0')}</span>
        </div>
        <div className="plan-body">
          <div className="plan-main">
            <div className="plan-title">{day.title}</div>
            <div className="plan-subtitle">{day.subtitle}</div>
            {!isRestDay && (
              <div className="plan-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                约 {day.durationMin[0]}-{day.durationMin[1]} 分钟 · {typeLabel[day.type]}
              </div>
            )}
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
      </div>

      {/* 计划要点 */}
      {!isRestDay && (
        <div className="card summary-card">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h10M4 18h13" />
          </svg>
          <div>
            <div className="s-title">计划要点</div>
            <div className="s-text">各部分合计 {day.durationMin[0]}-{day.durationMin[1]} 分钟，按需分配时间。</div>
          </div>
        </div>
      )}

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
              <div className={`exercise-card ${isTimed ? 'has-timer' : ''}`} key={it.id}>
                {isTimed && it.durationSec != null && (
                  <button
                    className="icon-btn small quick-timer"
                    onClick={(e) => {
                      e.stopPropagation()
                      startTickTimer(it.durationSec!, it.name)
                    }}
                    aria-label={`开始计时 ${it.durationSec} 秒`}
                  >
                    <AlarmIcon size={18} />
                  </button>
                )}
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
                    {(() => {
                      const setsTotal = isTimed ? 1 : it.sets
                      const exAllDone = setsTotal > 0 && doneArr.length >= setsTotal
                      if (exAllDone) {
                        return (
                          <button
                            className="alldone-btn"
                            onClick={() =>
                              isTimed
                                ? toggleSet(day.dayIndex, it.id, 1, 1, 0)
                                : toggleSet(day.dayIndex, it.id, doneArr[doneArr.length - 1], it.sets, it.restSec)
                            }
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            已完成
                          </button>
                        )
                      }
                      return isTimed
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
                          ))
                    })()}
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
