// 双视图同步动画：正面 + 侧面共用同一动画时间轴
// 同一 Pose 关键帧同时驱动两个视角；播放/暂停/重置/速度对两个视图同步生效
import StickFigure from './StickFigure'
import { useAnimationClock, samplePose, getPropNode, getKeyframes } from './ExerciseAnimation'

interface Props {
  exerciseId: string
  playing: boolean
  /** 一次循环时长（秒） */
  cycleSec?: number
  /** 播放速度倍率（1=常速） */
  speed?: number
  /** 数值变化时两个视图一起回到起始帧 */
  resetKey?: number
}

export default function DualAnimation({ exerciseId, playing, cycleSec = 2.4, speed = 1, resetKey = 0 }: Props) {
  const kf = getKeyframes(exerciseId)
  const t = useAnimationClock(playing, cycleSec / Math.max(speed, 0.1), resetKey)
  const pose = samplePose(kf.frames, t)
  const prop = getPropNode(kf, pose)

  return (
    <div className="dual-grid">
      <div className="dual-cell">
        <StickFigure pose={pose} view="front">
          {prop}
        </StickFigure>
        <div className="dual-label">正面</div>
      </div>
      <div className="dual-cell">
        <StickFigure pose={pose} view="side">
          {prop}
        </StickFigure>
        <div className="dual-label">侧面</div>
      </div>
    </div>
  )
}
