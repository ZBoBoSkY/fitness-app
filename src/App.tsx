import { useRef } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { AppProvider, useApp } from './state/store'
import { isPlan } from './lib/plan'
import TodayPage from './pages/TodayPage'
import ExercisePage from './pages/ExercisePage'
import HistoryPage from './pages/HistoryPage'
import TimerBar from './components/TimerBar'
import MetronomeBar from './components/MetronomeBar'

function ImportPlan() {
  const { importPlan, resetPlan } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const obj = JSON.parse(text)
      if (!isPlan(obj)) {
        alert('文件格式不正确，请选择合法的 plan.json')
        return
      }
      await importPlan(obj)
      alert('计划已导入并替换')
    } catch (err) {
      alert('解析失败：' + (err as Error).message)
    }
    e.target.value = ''
  }

  return (
    <div>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>设置</div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>导入训练计划</div>
        <div className="text-2" style={{ fontSize: 13, marginBottom: 12 }}>
          选择一个新的 plan.json 文件，替换当前训练计划。
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
        <button className="btn btn-primary btn-block" onClick={() => fileRef.current?.click()}>
          选择 plan.json
        </button>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={async () => { await resetPlan(); alert('已恢复为默认计划') }}>
          恢复默认计划
        </button>
      </div>
    </div>
  )
}

function Shell() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/exercise/:dayIndex/:exerciseId" element={<ExercisePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<ImportPlan />} />
      </Routes>
      <TimerBar />
      <MetronomeBar />
      <nav className="bottomnav">
        <NavLink to="/" end>
          <span className="nav-ico">📋</span>
          计划
        </NavLink>
        <NavLink to="/history">
          <span className="nav-ico">📊</span>
          记录
        </NavLink>
        <NavLink to="/settings">
          <span className="nav-ico">⚙️</span>
          设置
        </NavLink>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  )
}
