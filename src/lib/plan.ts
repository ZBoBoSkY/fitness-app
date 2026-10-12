import type { Plan } from '../types'

let cachedPlan: Plan | null = null

/** 从 /plan.json 加载计划（优先读 IndexedDB 里用户导入的自定义计划） */
export async function loadPlan(): Promise<Plan> {
  if (cachedPlan) return cachedPlan
  try {
    const res = await fetch('./plan.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error(`加载 plan.json 失败: ${res.status}`)
    cachedPlan = (await res.json()) as Plan
    return cachedPlan
  } catch (e) {
    console.error(e)
    throw e
  }
}

/** 校验一个对象是否是合法 Plan */
export function isPlan(obj: unknown): obj is Plan {
  if (!obj || typeof obj !== 'object') return false
  const p = obj as Plan
  return !!(p.plan && typeof p.plan.name === 'string' && Array.isArray(p.days) && p.days.length > 0)
}

/** 读取用户自定义计划（已导入到 IndexedDB），若没有则返回 null */
export async function loadCustomPlan(): Promise<Plan | null> {
  const { getCustomPlan } = await import('./db')
  return getCustomPlan()
}

/** 根据 dayIndex 找某一天 */
export function getDayByIndex(plan: Plan, dayIndex: number) {
  return plan.days.find((d) => d.dayIndex === dayIndex) ?? null
}

/** 计算某一天的总组数 */
export function countTotalSets(day: NonNullable<ReturnType<typeof getDayByIndex>>): number {
  let total = 0
  for (const sec of day.sections) {
    for (const it of sec.items) {
      total += it.sets
    }
  }
  return total
}

/** 计划起始日对应的 Day 1 真实日期 */
export function planStartDate(plan: Plan): Date {
  const d = new Date(plan.plan.startDate + 'T00:00:00')
  return isNaN(d.getTime()) ? new Date() : d
}

/** dayIndex -> 真实日期 */
export function dateForDayIndex(plan: Plan, dayIndex: number): Date {
  const start = planStartDate(plan)
  const d = new Date(start)
  d.setDate(start.getDate() + (dayIndex - 1))
  return d
}

/** 真实日期 -> dayIndex（不在计划范围内返回 null） */
export function dayIndexForDate(plan: Plan, date: Date): number | null {
  const start = planStartDate(plan)
  const diff = Math.round((date.getTime() - start.getTime()) / 86400000)
  const idx = diff + 1
  if (idx < 1 || idx > plan.days.length) return null
  return idx
}

/** 格式化为 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
