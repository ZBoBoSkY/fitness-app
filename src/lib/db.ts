// IndexedDB 封装：训练记录、身体测量、设置、自定义计划
import type { ExerciseRecord, BodyMeasure, AppSettings, Plan } from '../types'

const DB_NAME = 'fitness-app'
const DB_VERSION = 1

const STORE_RECORDS = 'records'
const STORE_MEASURES = 'measures'
const STORE_SETTINGS = 'settings'
const STORE_PLAN = 'customPlan'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORE_MEASURES)) {
        db.createObjectStore(STORE_MEASURES, { keyPath: 'date' })
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_PLAN)) {
        db.createObjectStore(STORE_PLAN, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const s = t.objectStore(store)
        const r = fn(s)
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      })
  )
}

// ---- 训练记录 ----

export function makeRecordKey(date: string, dayIndex: number, exerciseId: string): string {
  return `${date}_${dayIndex}_${exerciseId}`
}

export async function getRecord(key: string): Promise<ExerciseRecord | undefined> {
  return tx<ExerciseRecord | undefined>(STORE_RECORDS, 'readonly', (s) => s.get(key) as IDBRequest<ExerciseRecord | undefined>)
}

export async function putRecord(rec: ExerciseRecord): Promise<void> {
  await tx(STORE_RECORDS, 'readwrite', (s) => s.put(rec))
}

export async function getRecordsByDate(date: string): Promise<ExerciseRecord[]> {
  const all = await tx<ExerciseRecord[]>(STORE_RECORDS, 'readonly', (s) => s.getAll() as IDBRequest<ExerciseRecord[]>)
  return (all || []).filter((r) => r.date === date)
}

export async function getAllRecords(): Promise<ExerciseRecord[]> {
  return (await tx<ExerciseRecord[]>(STORE_RECORDS, 'readonly', (s) => s.getAll() as IDBRequest<ExerciseRecord[]>)) || []
}

// ---- 身体测量 ----

export async function getMeasure(date: string): Promise<BodyMeasure | undefined> {
  return tx<BodyMeasure | undefined>(STORE_MEASURES, 'readonly', (s) => s.get(date) as IDBRequest<BodyMeasure | undefined>)
}

export async function putMeasure(m: BodyMeasure): Promise<void> {
  await tx(STORE_MEASURES, 'readwrite', (s) => s.put(m))
}

export async function getAllMeasures(): Promise<BodyMeasure[]> {
  const all = (await tx<BodyMeasure[]>(STORE_MEASURES, 'readonly', (s) => s.getAll() as IDBRequest<BodyMeasure[]>)) || []
  return all.sort((a, b) => (a.date < b.date ? -1 : 1))
}

// ---- 设置 ----

const SETTINGS_ID = 'app'

export async function getSettings(): Promise<AppSettings> {
  const s = await tx<AppSettings | undefined>(STORE_SETTINGS, 'readonly', (r) => r.get(SETTINGS_ID) as IDBRequest<AppSettings | undefined>)
  return s ?? { tickEnabled: true }
}

export async function putSettings(s: AppSettings): Promise<void> {
  await tx(STORE_SETTINGS, 'readwrite', (r) => r.put({ ...s, id: SETTINGS_ID }))
}

// ---- 自定义计划 ----

const CUSTOM_PLAN_ID = 'custom'

export async function getCustomPlan(): Promise<Plan | null> {
  const r = await tx<{ id: string; plan: Plan } | undefined>(STORE_PLAN, 'readonly', (s) => s.get(CUSTOM_PLAN_ID) as IDBRequest<{ id: string; plan: Plan } | undefined>)
  return r ? r.plan : null
}

export async function saveCustomPlan(plan: Plan): Promise<void> {
  await tx(STORE_PLAN, 'readwrite', (s) => s.put({ id: CUSTOM_PLAN_ID, plan }))
}

export async function clearCustomPlan(): Promise<void> {
  await tx(STORE_PLAN, 'readwrite', (s) => s.delete(CUSTOM_PLAN_ID))
}
