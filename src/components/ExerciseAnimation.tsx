// 动作动画：关键帧插值循环播放 + 道具绘制
import { useEffect, useRef, useState } from 'react'
import StickFigure, { type Pose, type BodyPartHighlight, HIGHLIGHT_COLOR } from './StickFigure'
import { EXERCISE_KEYFRAMES, hasKeyframes, defaultKeyframes, type ExerciseKeyframes } from '../animations/keyframes'

interface Props {
  exerciseId: string
  view: 'front' | 'side'
  highlight: string[]
  playing: boolean
  /** 一次循环时长（秒） */
  cycleSec?: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const keys = Object.keys(a) as (keyof Pose)[]
  const out = { ...a }
  for (const k of keys) {
    out[k] = lerp(a[k], b[k], t)
  }
  return out
}

/** 在关键帧序列中采样（首尾循环） */
function sampleAt(frames: Pose[], t01: number): Pose {
  const n = frames.length
  if (n === 1) return frames[0]
  const seg = t01 * n
  const i = Math.floor(seg) % n
  const j = (i + 1) % n
  const local = seg - Math.floor(seg)
  return lerpPose(frames[i], frames[j], local)
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

export default function ExerciseAnimation({ exerciseId, view, highlight, playing, cycleSec = 2.5 }: Props) {
  const kf: ExerciseKeyframes = hasKeyframes(exerciseId) ? EXERCISE_KEYFRAMES[exerciseId] : defaultKeyframes(view)
  const [t, setT] = useState(0)
  const rafRef = useRef<number>()
  const lastRef = useRef<number>(0)

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    let frame = 0
    const loop = (ts: number) => {
      if (!lastRef.current) lastRef.current = ts
      const dt = (ts - lastRef.current) / 1000
      lastRef.current = ts
      setT((prev) => (prev + dt / cycleSec) % 1)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    rafRef.current = frame
    return () => cancelAnimationFrame(frame)
  }, [playing, cycleSec])

  const pose = sampleAt(kf.frames, t)
  const hl = toHighlight(highlight)

  return (
    <StickFigure pose={pose} view={view} highlight={hl}>
      {renderProp(kf, pose)}
    </StickFigure>
  )
}
