// 日期/星期辅助
export const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export function weekdayName(d: Date): string {
  return '周' + WEEKDAY_NAMES[d.getDay()]
}

/** 某天所在周的周一日期 */
export function mondayOf(d: Date): Date {
  const r = new Date(d)
  const day = (r.getDay() + 6) % 7 // 周一=0
  r.setDate(r.getDate() - day)
  r.setHours(0, 0, 0, 0)
  return r
}

export function formatMd(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function formatFull(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
