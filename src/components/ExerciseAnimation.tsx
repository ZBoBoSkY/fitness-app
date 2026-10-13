// 动作动画：关键帧插值循环播放 + 道具绘制
// 2026-10-13：相邻关键帧改用 smoothstep 缓动（消除线性插值的生硬起止）；
// 时钟抽取为 useAnimationClock 供双视图复用；新增速度参数。
import { useEffect, useState } from 'react'
import StickFigure, { type Pose, type BodyPartHighlight, HIGHLIGHT_COLOR } from './StickFigure'
import { EXERCISE_KEYFRAMES, hasKeyframes, defaultKeyframes, type ExerciseKeyframes } from '../animations/keyframes'

interface Props {
  exerciseId: string
  view: 'front' | 'side'
  highlight: string[]
  playing: boolean
  /** 一次循环时长（秒） */
  cycleSec?: number
  /** 播放速度倍率（1=常速） */
  speed?: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const keys = Object.keys(a) as (keyof Pose)[]
  const out = { ...a }
  for (const k of keys) {
    out[k] = lerp(a[k] ?? 0, b[k] ?? 0, t)
  }
  return out
}

/** smoothstep 缓动：段首段末减速，动作起止更自然 */
function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

/** 在关键帧序列中采样（首尾循环，段内缓动） */
export function samplePose(frames: Pose[], t01: number): Pose {
  const n = frames.length
  if (n === 1) return frames[0]
  const seg = t01 * n
  const i = Math.floor(seg) % n
  const j = (i + 1) % n
  const local = easeInOut(seg - Math.floor(seg))
  return lerpPose(frames[i], frames[j], local)
}

/** 动画时钟：rAF 驱动的 0..1 循环进度。playing/cycleSec 变化时干净重启，不跳帧；resetKey 变化时回到起点 */
export function useAnimationClock(playing: boolean, cycleSec: number, resetKey = 0): number {
  const [t, setT] = useState(0)
  useEffect(() => {
    setT(0)
  }, [resetKey])
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = 0
    const loop = (ts: number) => {
      if (!last) last = ts
      const dt = (ts - last) / 1000
      last = ts
      setT((prev) => (prev + dt / cycleSec) % 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, cycleSec])
  return t
}

/** 动作对应的道具 SVG 节点 */
export function getPropNode(kf: ExerciseKeyframes, pose: Pose): React.ReactNode {
  return renderProp(kf, pose)
}

/** 取动作关键帧（无定义时回退默认呼吸动画） */
export function getKeyframes(exerciseId: string): ExerciseKeyframes {
  return hasKeyframes(exerciseId) ? EXERCISE_KEYFRAMES[exerciseId] : defaultKeyframes('front')
}

function toHighlight(parts: string[]): BodyPartHighlight {
  const map: BodyPartHighlight = {}
  for (const part of parts) {
    // 把解剖名映射到骨骼部件
    map[part] = true
    if (part === 'glutes') map.core = true
    if (part === 'hamstrings' || part === 'quads') map.quads = true
    if (part === 'calves' || part === 'gastrocnemius' || part === 'soleus' || part === 'tibialis-anterior') map.calves = true
    if (part === 'chest' || part === 'triceps' || part === 'deltoids' || part === 'anterior-deltoids' || part === 'rear-deltoids' || part === 'rhomboids' || part === 'lats' || part === 'pectoralis-major') map.shoulders = true
  }
  return map
}

/** 道具绘制（返回 SVG 元素，作为 children 注入） */
function renderProp(kf: ExerciseKeyframes, pose: Pose): React.ReactNode {
  const c = HIGHLIGHT_COLOR
  switch (kf.prop) {
    case 'kettlebell': {
      // 画在身体前方下方（侧视）
      return (
        <g>
          <line x1="100" y1="118" x2="100" y2="138" stroke={c} strokeWidth="4" />
          <circle cx="100" cy="145" r="11" fill="none" stroke={c} strokeWidth="4" />
          <rect x="95" y="136" width="10" height="6" rx="2" fill={c} />
        </g>
      )
    }
    case 'dumbbell': {
      // 画在身体上方（双手位置）
      const y = pose.shoulderL > 80 ? 48 : 60
      return (
        <g>
          <line x1="82" y1={y} x2="118" y2={y} stroke={c} strokeWidth="4" />
          <rect x="74" y={y - 10} width="8" height="20" rx="2" fill={c} />
          <rect x="118" y={y - 10} width="8" height="20" rx="2" fill={c} />
        </g>
      )
    }
    case 'band': {
      return (
        <g>
          <line x1="40" y1="80" x2="70" y2="86" stroke={c} strokeWidth="3" strokeDasharray="3 3" />
          <line x1="40" y1="100" x2="70" y2="94" stroke={c} strokeWidth="3" strokeDasharray="3 3" />
        </g>
      )
    }
    case 'chair': {
      return (
        <g>
          <rect x="118" y="128" width="34" height="8" rx="2" fill="#3A3D44" />
          <line x1="120" y1="136" x2="120" y2="175" stroke="#3A3D44" strokeWidth="4" />
          <line x1="150" y1="136" x2="150" y2="175" stroke="#3A3D44" strokeWidth="4" />
        </g>
      )
    }
    default:
      return null
  }
}

export default function ExerciseAnimation({ exerciseId, view, highlight, playing, cycleSec = 2.5, speed = 1 }: Props) {
  const kf = getKeyframes(exerciseId)
  const t = useAnimationClock(playing, cycleSec / Math.max(speed, 0.1))

  const pose = samplePose(kf.frames, t)
  const hl = toHighlight(highlight)

  return (
    <StickFigure pose={pose} view={view} highlight={hl}>
      {renderProp(kf, pose)}
    </StickFigure>
  )
}
