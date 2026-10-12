// 全局状态：计划、当前日期、训练记录、计时
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Plan, ExerciseRecord, BodyMeasure, AppSettings } from '../types'
import * as db from '../lib/db'
import { loadPlan, loadCustomPlan, toDateKey, dateForDayIndex, dayIndexForDate } from '../lib/plan'
import { playChime, playTick, vibrate } from '../lib/audio'

interface AppState {
  plan: Plan | null
  planLoaded: boolean
  selectedDate: Date
  records: Record<string, ExerciseRecord> // key -> record
  measures: BodyMeasure[]
  settings: AppSettings
  // 计时
  restTimer: { remaining: number; total: number; label: string } | null
  tickTimer: { remaining: number; total: number; label: string } | null
  // 方法
  setSelectedDate: (d: Date) => void
  toggleSet: (dayIndex: number, exerciseId: string, setNo: number, setsTotal: number, restSec: number) => void
  updateRecord: (rec: ExerciseRecord) => void
  saveMeasure: (m: BodyMeasure) => void
  updateSettings: (s: Partial<AppSettings>) => void
  importPlan: (plan: Plan) => Promise<void>
  resetPlan: () => Promise<void>
  dismissRestTimer: () => void
  dismissTickTimer: () => void
  startTickTimer: (sec: number, label: string) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planLoaded, setPlanLoaded] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [records, setRecords] = useState<Record<string, ExerciseRecord>>({})
  const [measures, setMeasures] = useState<BodyMeasure[]>([])
  const [settings, setSettings] = useState<AppSettings>({ tickEnabled: true })
  const [restTimer, setRestTimer] = useState<AppState['restTimer']>(null)
  const [tickTimer, setTickTimer] = useState<AppState['tickTimer']>(null)

  const recordsRef = useRef(records)
  recordsRef.current = records
  const tickRef = useRef<{ enabled: boolean }>({ enabled: true })
  tickRef.current.enabled = settings.tickEnabled

  // 初始化：加载计划 + 数据
  useEffect(() => {
    ;(async () => {
      const custom = await loadCustomPlan()
      const p = custom ?? (await loadPlan())
      setPlan(p)
      setPlanLoaded(true)
      const recs = await db.getAllRecords()
      const map: Record<string, ExerciseRecord> = {}
      for (const r of recs) map[r.key] = r
      setRecords(map)
      setMeasures(await db.getAllMeasures())
      setSettings(await db.getSettings())
    })()
  }, [])

  // 计划加载后，把选中日期对齐到计划范围
  useEffect(() => {
    if (!plan) return
    const idx = dayIndexForDate(plan, selectedDate)
    if (idx == null) {
      // 选中日期不在计划内，跳到今天（若今天也不在则跳到第1天）
      const todayIdx = dayIndexForDate(plan, new Date())
      if (todayIdx != null) {
        setSelectedDate(dateForDayIndex(plan, todayIdx))
      } else {
        setSelectedDate(dateForDayIndex(plan, 1))
      }
    }
  }, [plan])

  const toggleSet = useCallback(
    (dayIndex: number, exerciseId: string, setNo: number, setsTotal: number, restSec: number) => {
      const date = toDateKey(selectedDate)
      const key = db.makeRecordKey(date, dayIndex, exerciseId)
      const existing = recordsRef.current[key] ?? {
        key,
        date,
        dayIndex,
        exerciseId,
        completedSets: [],
        actualLoad: '',
        actualReps: '',
        pain: false,
        painNote: '',
        updatedAt: Date.now(),
      }
      const has = existing.completedSets.includes(setNo)
      const completedSets = has ? existing.completedSets.filter((s) => s !== setNo) : [...existing.completedSets, setNo].sort((a, b) => a - b)
      const updated: ExerciseRecord = { ...existing, completedSets, updatedAt: Date.now() }
      setRecords((prev) => ({ ...prev, [key]: updated }))
      void db.putRecord(updated)

      // 打勾后：开始组间休息倒计时（非最后一组且 restSec>0）
      if (!has && restSec > 0 && setNo < setsTotal) {
        setRestTimer({ remaining: restSec, total: restSec, label: '组间休息' })
      }
      // 打勾后：若为计时类（此处由调用方处理），补一声
      if (!has) {
        playChime()
        vibrate(60)
      }
    },
    [selectedDate]
  )

  const updateRecord = useCallback((rec: ExerciseRecord) => {
    setRecords((prev) => ({ ...prev, [rec.key]: rec }))
    void db.putRecord(rec)
  }, [])

  const saveMeasure = useCallback((m: BodyMeasure) => {
    setMeasures((prev) => {
      const others = prev.filter((x) => x.date !== m.date)
      return [...others, m].sort((a, b) => (a.date < b.date ? -1 : 1))
    })
    void db.putMeasure(m)
  }, [])

  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...s }
      void db.putSettings(next)
      return next
    })
  }, [])

  const importPlan = useCallback(async (p: Plan) => {
    setPlan(p)
    await db.saveCustomPlan(p)
  }, [])

  const resetPlan = useCallback(async () => {
    await db.clearCustomPlan()
    const p = await loadPlan()
    setPlan(p)
  }, [])

  const dismissRestTimer = useCallback(() => setRestTimer(null), [])
  const dismissTickTimer = useCallback(() => setTickTimer(null), [])
  const startTickTimer = useCallback((sec: number, label: string) => {
    setTickTimer({ remaining: sec, total: sec, label })
  }, [])

  // 休息倒计时轮询
  useEffect(() => {
    if (!restTimer) return
    const iv = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev) return prev
        const next = prev.remaining - 1
        if (next <= 0) {
          playChime()
          vibrate([200, 100, 200])
          return null
        }
        return { ...prev, remaining: next }
      })
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimer != null])

  // 计时动作倒计时（带滴答声）
  useEffect(() => {
    if (!tickTimer) return
    const iv = setInterval(() => {
      setTickTimer((prev) => {
        if (!prev) return prev
        if (tickRef.current.enabled) playTick()
        const next = prev.remaining - 1
        if (next <= 0) {
          playChime()
          vibrate([200, 100, 200])
          return null
        }
        return { ...prev, remaining: next }
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [tickTimer != null])

  const value: AppState = {
    plan,
    planLoaded,
    selectedDate,
    records,
    measures,
    settings,
    restTimer,
    tickTimer,
    setSelectedDate,
    toggleSet,
    updateRecord,
    saveMeasure,
    updateSettings,
    importPlan,
    resetPlan,
    dismissRestTimer,
    dismissTickTimer,
    startTickTimer,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
