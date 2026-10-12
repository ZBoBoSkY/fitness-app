// 每个动作 id 的关节角度关键帧定义
// 约定：关键帧数组循环播放，相邻关键帧之间插值；节奏约 2.5s 一轮。
import type { Pose } from '../components/StickFigure'

export interface ExerciseKeyframes {
  view: 'front' | 'side'
  /** 一组循环的关键帧（首尾自动衔接） */
  frames: Pose[]
  /** 每个动作的可视道具 */
  prop?: 'dumbbell' | 'kettlebell' | 'band' | 'chair' | 'bike' | 'none'
}

// 中立站姿
const stand: Pose = {
  hip: 0, kneeL: 5, kneeR: 5, shoulderL: 0, shoulderR: 0,
  elbowL: 0, elbowR: 0, hipFlexL: 0, hipFlexR: 0,
  torsoLean: 0, footLift: 0, armSwing: 0,
}

function p(partial: Partial<Pose>): Pose {
  return { ...stand, ...partial }
}

export const EXERCISE_KEYFRAMES: Record<string, ExerciseKeyframes> = {
  // 原地轻松踏步 / 轻松踏步（正面）
  'easy-march': {
    view: 'front',
    frames: [
      p({ kneeL: 8, kneeR: 8, elbowL: 12, elbowR: 12, footLift: 0 }),
      p({ kneeL: 55, kneeR: 8, hipFlexL: 35, elbowL: 40, elbowR: 12, footLift: 0.7 }),
      p({ kneeL: 8, kneeR: 8, elbowL: 12, elbowR: 12, footLift: 0 }),
      p({ kneeR: 55, kneeL: 8, hipFlexR: 35, elbowR: 40, elbowL: 12, footLift: 0.7 }),
    ],
    prop: 'none',
  },
  // 徒手髋铰链练习（侧视）
  'hip-hinge-drill': {
    view: 'side',
    frames: [
      p({ torsoLean: 0, hipFlexL: 0, hipFlexR: 0, kneeL: 5, kneeR: 5 }),
      p({ torsoLean: 55, hipFlexL: 15, hipFlexR: 15, kneeL: 25, kneeR: 25, shoulderL: -20, shoulderR: -20 }),
      p({ torsoLean: 0, hipFlexL: 0, hipFlexR: 0, kneeL: 5, kneeR: 5 }),
    ],
    prop: 'none',
  },
  // 凳子坐站（侧视）
  'chair-sit-to-stand': {
    view: 'side',
    frames: [
      p({ torsoLean: 0, kneeL: 95, kneeR: 95, hipFlexL: 80, hipFlexR: 80, shoulderL: 25, shoulderR: 25 }),
      p({ torsoLean: 30, kneeL: 60, kneeR: 60, hipFlexL: 55, hipFlexR: 55, shoulderL: 10, shoulderR: 10 }),
      p({ torsoLean: 0, kneeL: 5, kneeR: 5, hipFlexL: 0, hipFlexR: 0 }),
      p({ torsoLean: 0, kneeL: 95, kneeR: 95, hipFlexL: 80, hipFlexR: 80, shoulderL: 25, shoulderR: 25 }),
    ],
    prop: 'chair',
  },
  // 壶铃罗马尼亚硬拉（侧视）
  'kettlebell-romanian-deadlift': {
    view: 'side',
    frames: [
      p({ torsoLean: 0, kneeL: 5, kneeR: 5, shoulderL: 15, shoulderR: 15, elbowL: 10, elbowR: 10 }),
      p({ torsoLean: 60, kneeL: 20, kneeR: 20, hipFlexL: 10, hipFlexR: 10, shoulderL: -10, shoulderR: -10, elbowL: 10, elbowR: 10 }),
      p({ torsoLean: 0, kneeL: 5, kneeR: 5, shoulderL: 15, shoulderR: 15, elbowL: 10, elbowR: 10 }),
    ],
    prop: 'kettlebell',
  },
  // 凳上斜板俯卧撑（侧视）
  'incline-push-up': {
    view: 'side',
    frames: [
      p({ torsoLean: -15, kneeL: 5, kneeR: 5, shoulderL: 60, shoulderR: 60, elbowL: 20, elbowR: 20, hipFlexL: 5, hipFlexR: 5 }),
      p({ torsoLean: -15, kneeL: 5, kneeR: 5, shoulderL: 40, shoulderR: 40, elbowL: 110, elbowR: 110, hipFlexL: 5, hipFlexR: 5 }),
      p({ torsoLean: -15, kneeL: 5, kneeR: 5, shoulderL: 60, shoulderR: 60, elbowL: 20, elbowR: 20, hipFlexL: 5, hipFlexR: 5 }),
    ],
    prop: 'chair',
  },
  // 弹力带坐姿划船（正面，坐姿）
  'band-seated-row': {
    view: 'front',
    frames: [
      p({ kneeL: 90, kneeR: 90, hipFlexL: 80, hipFlexR: 80, shoulderL: 55, shoulderR: 55, elbowL: 15, elbowR: 15 }),
      p({ kneeL: 90, kneeR: 90, hipFlexL: 80, hipFlexR: 80, shoulderL: 20, shoulderR: 20, elbowL: 110, elbowR: 110 }),
      p({ kneeL: 90, kneeR: 90, hipFlexL: 80, hipFlexR: 80, shoulderL: 55, shoulderR: 55, elbowL: 15, elbowR: 15 }),
    ],
    prop: 'band',
  },
  // 死虫式（侧视，仰卧）
  'dead-bug': {
    view: 'side',
    frames: [
      p({ torsoLean: 0, kneeL: 90, kneeR: 90, hipFlexL: 90, hipFlexR: 90, shoulderL: 90, shoulderR: 90, elbowL: 5, elbowR: 5 }),
      p({ torsoLean: 0, kneeL: 15, kneeR: 90, hipFlexL: 15, hipFlexR: 90, shoulderL: 20, shoulderR: 90, elbowL: 5, elbowR: 5 }),
      p({ torsoLean: 0, kneeL: 90, kneeR: 90, hipFlexL: 90, hipFlexR: 90, shoulderL: 90, shoulderR: 90, elbowL: 5, elbowR: 5 }),
    ],
    prop: 'none',
  },
  // 小腿靠墙拉伸（侧视）
  'standing-calf-stretch': {
    view: 'side',
    frames: [
      p({ kneeL: 5, kneeR: 15, hipFlexL: 0, hipFlexR: 12, torsoLean: 8 }),
      p({ kneeL: 5, kneeR: 15, hipFlexL: 0, hipFlexR: 12, torsoLean: 20 }),
      p({ kneeL: 5, kneeR: 15, hipFlexL: 0, hipFlexR: 12, torsoLean: 8 }),
    ],
    prop: 'none',
  },
  // 低冲击有氧（侧视，走路）
  'low-impact-cardio': {
    view: 'side',
    frames: [
      p({ kneeL: 10, kneeR: 25, hipFlexL: 5, hipFlexR: 20, elbowL: 30, elbowR: 40, footLift: 0 }),
      p({ kneeL: 40, kneeR: 10, hipFlexL: 25, hipFlexR: 5, elbowL: 50, elbowR: 20, footLift: 0.6 }),
      p({ kneeL: 10, kneeR: 25, hipFlexL: 5, hipFlexR: 20, elbowL: 30, elbowR: 40, footLift: 0 }),
      p({ kneeR: 40, kneeL: 10, hipFlexR: 25, hipFlexL: 5, elbowR: 50, elbowL: 20, footLift: 0.6 }),
    ],
    prop: 'none',
  },
  // 坐姿踝泵（侧视，坐姿）
  'seated-ankle-pumps': {
    view: 'side',
    frames: [
      p({ kneeL: 95, kneeR: 95, hipFlexL: 80, hipFlexR: 80 }),
      p({ kneeL: 95, kneeR: 95, hipFlexL: 80, hipFlexR: 80, footLift: 0.5 }),
      p({ kneeL: 95, kneeR: 95, hipFlexL: 80, hipFlexR: 80 }),
    ],
    prop: 'none',
  },
  // 扶凳轻柔髋部后移（侧视）
  'gentle-hip-shift': {
    view: 'side',
    frames: [
      p({ torsoLean: 0, kneeL: 5, kneeR: 5 }),
      p({ torsoLean: 30, hipFlexL: 10, hipFlexR: 10, kneeL: 15, kneeR: 15 }),
      p({ torsoLean: 0, kneeL: 5, kneeR: 5 }),
    ],
    prop: 'chair',
  },
  // 臀桥（侧视，仰卧）
  'glute-bridge': {
    view: 'side',
    frames: [
      p({ kneeL: 70, kneeR: 70, hipFlexL: 50, hipFlexR: 50, shoulderL: 15, shoulderR: 15 }),
      p({ kneeL: 70, kneeR: 70, hipFlexL: 0, hipFlexR: 0, shoulderL: 15, shoulderR: 15, torsoLean: 0 }),
      p({ kneeL: 70, kneeR: 70, hipFlexL: 50, hipFlexR: 50, shoulderL: 15, shoulderR: 15 }),
    ],
    prop: 'none',
  },
  // 哑铃地板卧推（侧视，仰卧）
  'dumbbell-floor-press': {
    view: 'side',
    frames: [
      p({ kneeL: 70, kneeR: 70, hipFlexL: 40, hipFlexR: 40, shoulderL: 45, shoulderR: 45, elbowL: 90, elbowR: 90 }),
      p({ kneeL: 70, kneeR: 70, hipFlexL: 40, hipFlexR: 40, shoulderL: 80, shoulderR: 80, elbowL: 10, elbowR: 10 }),
      p({ kneeL: 70, kneeR: 70, hipFlexL: 40, hipFlexR: 40, shoulderL: 45, shoulderR: 45, elbowL: 90, elbowR: 90 }),
    ],
    prop: 'dumbbell',
  },
  // 鸟狗式（侧视，四点跪姿）
  'bird-dog': {
    view: 'side',
    frames: [
      p({ kneeL: 90, kneeR: 90, hipFlexL: 90, hipFlexR: 90, shoulderL: 90, shoulderR: 90, torsoLean: 0 }),
      p({ kneeL: 15, kneeR: 90, hipFlexL: 0, hipFlexR: 90, shoulderL: 0, shoulderR: 90, elbowL: 5, elbowR: 5 }),
      p({ kneeL: 90, kneeR: 90, hipFlexL: 90, hipFlexR: 90, shoulderL: 90, shoulderR: 90 }),
    ],
    prop: 'none',
  },
  // 坐姿哑铃推举（正面，坐姿）
  'dumbbell-overhead-press': {
    view: 'front',
    frames: [
      p({ kneeL: 90, kneeR: 90, hipFlexL: 80, hipFlexR: 80, shoulderL: 60, shoulderR: 60, elbowL: 90, elbowR: 90 }),
      p({ kneeL: 90, kneeR: 90, hipFlexL: 80, hipFlexR: 80, shoulderL: 110, shoulderR: 110, elbowL: 5, elbowR: 5 }),
      p({ kneeL: 90, kneeR: 90, hipFlexL: 80, hipFlexR: 80, shoulderL: 60, shoulderR: 60, elbowL: 90, elbowR: 90 }),
    ],
    prop: 'dumbbell',
  },
  // 胸部轻柔拉伸（正面）
  'chest-doorway-stretch': {
    view: 'front',
    frames: [
      p({ shoulderL: 70, shoulderR: 20, elbowL: 15, elbowR: 15 }),
      p({ shoulderL: 70, shoulderR: 35, elbowL: 15, elbowR: 15 }),
      p({ shoulderL: 70, shoulderR: 20, elbowL: 15, elbowR: 15 }),
    ],
    prop: 'none',
  },
}

// 收尾"轻松踏步"复用热身"原地轻松踏步"的动画
EXERCISE_KEYFRAMES['easy-march-cool'] = EXERCISE_KEYFRAMES['easy-march']

// 未定义关键帧的动作 id 集合（用于检测 TODO）
export function hasKeyframes(id: string): boolean {
  return id in EXERCISE_KEYFRAMES
}

/** 默认关键帧（未定义的动作用中立站姿呼吸，标记 TODO） */
export function defaultKeyframes(view: 'front' | 'side'): ExerciseKeyframes {
  return {
    view,
    frames: [p({}), p({ torsoLean: 3, shoulderL: 3, shoulderR: 3 }), p({})],
    prop: 'none',
  }
}
