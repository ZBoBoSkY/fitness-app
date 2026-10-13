import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../state/store'
import { toDateKey } from '../lib/plan'
import * as db from '../lib/db'
import ExerciseAnimation from '../components/ExerciseAnimation'
import DualAnimation from '../components/DualAnimation'
import { DUAL_VIEW_EXERCISES } from '../animations/keyframes'
import MuscleMap from '../components/MuscleMap'

/** 解剖名 → 中文部位名 */
const PART_NAMES: Record<string, string> = {
  calves: '小腿',
  core: '核心',
  glutes: '臀肌',
  hamstrings: '腘绳肌',
  quads: '股四头肌',
  lats: '背阔肌',
  rhomboids: '菱形肌',
  'rear-deltoids': '三角肌后束',
  'transverse-abdominis': '腹横肌',
  obliques: '腹斜肌',
  gastrocnemius: '腓肠肌',
  soleus: '比目鱼肌',
  'tibialis-anterior': '胫前肌',
  chest: '胸部',
  triceps: '肱三头肌',
  deltoids: '三角肌',
  'anterior-deltoids': '三角肌前束',
  'pectoralis-major': '胸大肌',
  multifidus: '多裂肌',
  'hip-stabilizers': '髋稳定肌',
  'cardiorespiratory-system': '心肺',
}

export default function ExercisePage() {
  const { dayIndex: dayIdxStr, exerciseId } = useParams()
  const dayIndex = Number(dayIdxStr)
  const navigate = useNavigate()
  const { plan, selectedDate, records, updateRecord, startTickTimer } = useApp()
  const [playing, setPlaying] = useState(true)
  const [viewOverride, setViewOverride] = useState<'front' | 'side' | null>(null)
  const [speed, setSpeed] = useState(1)
  const [resetCount, setResetCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(true)

  const day = plan?.days.find((d) => d.dayIndex === dayIndex)
  const items = day?.sections.flatMap((s) => s.items) ?? []
  const idx = items.findIndex((i) => i.id === exerciseId)
  const item = items[idx]
  const hasVideo = !!item.video
  // 双视图同步演示（试点：原地踏步类），后续动作加入 DUAL_VIEW_EXERCISES 即可启用
  const isDual = !hasVideo && DUAL_VIEW_EXERCISES.has(exerciseId ?? '')

  const dateKey = toDateKey(selectedDate)
  const key = db.makeRecordKey(dateKey, dayIndex, exerciseId ?? '')
  const rec = records[key]

  // 切换动作时重置视角与播放状态
  useEffect(() => {
    setViewOverride(null)
    setPlaying(true)
  }, [exerciseId])

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

  const view = viewOverride ?? item.animation.view
  const partsLabel = (item.animation.highlight ?? [])
    .slice(0, 2)
    .map((p) => PART_NAMES[p] ?? p)
    .join(' · ')

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
      {/* 顶部：动画 / 真人演示视频 */}
      <div className="card anim-card">
        <div className="anim-stage">
          <div className={isDual ? 'detail-anim dual-wrap' : 'detail-anim'}>
            {hasVideo ? (
              <video
                ref={videoRef}
                className="detail-video"
                src={item.video}
                autoPlay
                loop
                muted
                playsInline
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
              />
            ) : isDual ? (
              <DualAnimation
                exerciseId={item.id}
                playing={playing}
                speed={speed}
                resetKey={resetCount}
              />
            ) : (
              <ExerciseAnimation exerciseId={item.id} view={view} highlight={[]} playing={playing} />
            )}
          </div>
          <button className="done-pill" onClick={() => navigate(-1)}>
            完成
          </button>
          <div className="anim-meta">
            {hasVideo ? (
              <span>真人演示</span>
            ) : isDual ? (
              <>
                <span>正面 + 侧面 · 同步</span>
                {partsLabel && <span> · {partsLabel}</span>}
              </>
            ) : (
              <>
                <span>{view === 'side' ? '侧面示意' : '正面示意'}</span>
                {partsLabel && <span> · {partsLabel}</span>}
              </>
            )}
            <span>
              {' '}· {idx + 1}/{items.length}
            </span>
          </div>
        </div>
        <div className="anim-controls">
          {!hasVideo && !isDual && (
            <button
              onClick={() => setViewOverride(view === 'side' ? 'front' : 'side')}
              aria-label="切换视角"
              title="切换视角"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h13l-3-3" />
                <path d="M20 16H7l3 3" />
              </svg>
            </button>
          )}
          <button
            onClick={() => {
              if (hasVideo && videoRef.current) {
                videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause()
              } else {
                setPlaying((p) => !p)
              }
            }}
            aria-label="暂停/播放"
            title="暂停/播放"
          >
            {hasVideo ? (
              videoPlaying ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="2" width="3.6" height="12" rx="1.2" />
                  <rect x="9.4" y="2" width="3.6" height="12" rx="1.2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2l10 6-10 6z" />
                </svg>
              )
            ) : playing ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="3.6" height="12" rx="1.2" />
                <rect x="9.4" y="2" width="3.6" height="12" rx="1.2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2l10 6-10 6z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              if (hasVideo && videoRef.current) {
                videoRef.current.currentTime = 0
                videoRef.current.play()
              } else if (isDual) {
                setResetCount((c) => c + 1)
              } else {
                setPlaying(false)
                // 重播：短暂置 true 触发重新开始
                setTimeout(() => setPlaying(true), 50)
              }
            }}
            aria-label="重播"
            title="重播"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
          {isDual && (
            <button
              onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 0.5 : 1))}
              aria-label="播放速度"
              title="播放速度"
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{speed === 1 ? '1x' : speed === 1.5 ? '1.5x' : '0.5x'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 目标肌群：解剖肌肉图（前/后视图），替代原 4 桶塌缩高亮 */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
          目标肌群
        </div>
        <MuscleMap highlight={item.animation.highlight} />
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
              开始计时（{item.durationSec >= 60 ? `${Math.round(item.durationSec / 60)} 分钟` : `${item.durationSec} 秒`}）
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
    </div>
  )
}
