// plan.json 的类型定义

export interface Plan {
  plan: {
    name: string
    startDate: string // YYYY-MM-DD
    weeks: number
    goal: string
    nutrition: {
      kcal: string
      proteinG: string
      note: string
    }
    progression: string[]
  }
  days: Day[]
}

export type DayType = 'strength' | 'cardio' | 'recovery' | 'rest'

export interface Day {
  week: number
  weekday: number // 1-7
  dayIndex: number // 1..N
  type: DayType
  title: string
  subtitle: string
  durationMin: [number, number]
  reminder: string
  choices: string[]
  sections: Section[]
}

export interface Section {
  name: string
  items: ExerciseItem[]
}

export interface ExerciseItem {
  id: string
  name: string
  sets: number
  reps: string | null
  durationSec: number | null
  timed: boolean
  load: string
  restSec: number
  note: string
  alt: string
  cues: {
    setup: string
    drive: string
    tempo: string
    mistakes: string
  }
  animation: {
    view: 'front' | 'side'
    keyframes: string[]
    highlight: string[]
  }
}

// ---- 训练记录（IndexedDB 存储）----

// 每个动作一条记录（一个动作可能有多组）
export interface ExerciseRecord {
  key: string // `${date}_${dayIndex}_${exerciseId}`
  date: string // YYYY-MM-DD
  dayIndex: number
  exerciseId: string
  completedSets: number[] // 已完成的组序号（1-based）
  actualLoad: string // 实际重量（可编辑）
  actualReps: string // 实际次数（可编辑）
  pain: boolean // 是否有疼痛
  painNote: string // 疼痛备注
  updatedAt: number
}

// 身体测量（每周一次）
export interface BodyMeasure {
  date: string // YYYY-MM-DD
  weightKg: number | null
  waistCm: number | null
}

// 全局设置
export interface AppSettings {
  tickEnabled: boolean // 滴答声开关（计时倒计时中是否滴答）
  metronomeOn?: boolean // 全局节拍器：每秒一声（独立于计时）
}

export type ExerciseRecordPatch = Partial<Omit<ExerciseRecord, 'key' | 'date' | 'dayIndex' | 'exerciseId'>>
