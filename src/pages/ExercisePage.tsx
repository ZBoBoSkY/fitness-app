import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/store'
import { toDateKey } from '../lib/plan'
import * as db from '../lib/db'
import ExerciseAnimation from '../components/ExerciseAnimation'

export default function ExercisePage() {
  const { dayIndex: dayIdxStr, exerciseId } = useParams()
  const dayIndex = Number(dayIdxStr)
  const navigate = useNavigate()
  const { plan, selectedDate, records, updateRecord, startTickTimer } = useApp()
  const [playing, setPlaying] = useState(true)

  const day = plan?.days.find((d) => d.dayIndex === dayIndex)
  const item = day?.sections.flatMap((s) => s.items).find((i) => i.id === exerciseId)

  const dateKey = toDateKey(selectedDate)
  const key = db.makeRecordKey(dateKey, dayIndex, exerciseId ?? '')
  const rec = records[key]

  // 进入时请求屏幕常亮
  useEffect(() => {
    import('../lib/wakeLock').then((m) => {
      m.requestWakeLock()
    })
    return () => {
      import('../lib/wakeLock').then((m) => {
        m.releaseWakeLock()
      })
    }
  }, [])

  if (!item) {
    return (
      <div className="empty">
        未找到动作
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </div>
    )
  }

  const isTimed = item.timed
  const specText = isTimed ? `${item.durationSec} 秒` : `${item.sets} 组 × ${item.reps ?? '-'} 次`

  const savePatch = (patch: Partial<typeof rec>) => {
    const base = rec ?? {
      key,
      date: dateKey,
      dayIndex,
      exerciseId: item.id,
      completedSets: [],
      actualLoad: '',
      actualReps: '',
      pain: false,
      painNote: '',
      updatedAt: Date.now(),
    }
    updateRecord({ ...base, ...patch, updatedAt: Date.now() })
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* 顶部：动画 */}
      <div className="card" style={{ padding: 16 }}>
        <div className="detail-anim">
          <ExerciseAnimation exerciseId={item.id} view={item.animation.view} highlight={item.animation.highlight} playing={playing} />
        </div>
        <div className="detail-view-hint">
          {item.animation.view === 'side' ? '侧面视角' : '正面视角'}
        </div>
        <div className="anim-controls">
          <button onClick={() => setPlaying((p) => !p)} aria-label="暂停/播放">
            {playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => {
              setPlaying(false)
              // 重播：短暂置 true 触发重新开始
              setTimeout(() => setPlaying(true), 50)
            }}
            aria-label="重播"
          >
            ↺
          </button>
        </div>
      </div>

      {/* 醒目的组数次 */}
      <div style={{ padding: '0 16px' }}>
        <div className="big-spec">{specText}</div>
        <div className="text-2" style={{ textAlign: 'center', fontSize: 13 }}>
          {item.load}
        </div>
        {isTimed && item.durationSec != null && (
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-block" onClick={() => startTickTimer(item.durationSec!, item.name)}>
              开始计时（{Math.round(item.durationSec / 60)} 分钟）
            </button>
          </div>
        )}
      </div>

      {/* 动作要点四张卡 */}
      <div style={{ padding: '16px 16px 0' }}>
        <div className="section-title" style={{ margin: '0 0 10px' }}>
          动作要点
        </div>
        <div className="cue-card">
          <div className="cue-label">准备姿势</div>
          <div className="cue-text">{item.cues.setup}</div>
        </div>
        <div className="cue-card">
          <div className="cue-label">如何发力</div>
          <div className="cue-text">{item.cues.drive}</div>
        </div>
        <div className="cue-card">
          <div className="cue-label">节奏与控制</div>
          <div className="cue-text">{item.cues.tempo}</div>
        </div>
        <div className="cue-card">
          <div className="cue-label">常见错误</div>
          <div className="cue-text">{item.cues.mistakes}</div>
        </div>
      </div>

      {/* 替代动作 */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>替代动作</div>
        <div style={{ fontSize: 15 }}>{item.alt}</div>
      </div>

      {/* 记录 */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>本次记录</div>
        <div className="field">
          <label>实际重量</label>
          <input type="text" placeholder="例如 5kg" value={rec?.actualLoad ?? ''} onChange={(e) => savePatch({ actualLoad: e.target.value })} />
        </div>
        <div className="field">
          <label>实际次数</label>
          <input type="text" placeholder="例如 10" value={rec?.actualReps ?? ''} onChange={(e) => savePatch({ actualReps: e.target.value })} />
        </div>
        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ margin: 0, flex: 1 }}>有疼痛</label>
          <button className={`switch ${rec?.pain ? 'on' : ''}`} onClick={() => savePatch({ pain: !rec?.pain })} aria-label="标记疼痛" />
        </div>
        {rec?.pain && (
          <div className="field">
            <label>疼痛备注</label>
            <textarea rows={2} placeholder="描述疼痛部位与程度" value={rec?.painNote ?? ''} onChange={(e) => savePatch({ painNote: e.target.value })} />
          </div>
        )}
      </div>

      {/* 完成按钮 */}
      <div style={{ padding: '0 16px' }}>
        <button className="btn btn-primary btn-block" onClick={() => navigate(-1)}>
          完成
        </button>
      </div>
    </div>
  )
}
