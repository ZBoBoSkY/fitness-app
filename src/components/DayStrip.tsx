import { WEEKDAY_NAMES } from '../lib/date'

interface Props {
  selectedDate: Date
  onSelect: (d: Date) => void
}

export default function DayStrip({ selectedDate, onSelect }: Props) {
  // 生成以选中日期为中心的一周（前后各3天，共7天）
  const days: Date[] = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(selectedDate)
    d.setDate(selectedDate.getDate() + i)
    days.push(d)
  }

  const today = new Date()
  const todayKey = today.toDateString()

  return (
    <div className="daystrip">
      {days.map((d) => {
        const key = d.toDateString()
        const isToday = key === todayKey
        const isSelected = key === selectedDate.toDateString()
        return (
          <div
            key={key}
            className={`day-chip ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(d)}
          >
            <div className="wd">{isToday ? '今天' : '周' + WEEKDAY_NAMES[d.getDay()]}</div>
            <div className="d">{d.getDate()}</div>
          </div>
        )
      })}
    </div>
  )
}
