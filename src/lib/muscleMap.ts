// plan.json 解剖名 → react-body-highlighter 肌群 slug 映射
// 库仅支持 19 个肌群（见 node_modules/react-body-highlighter/src/constants）：
// trapezius, upper-back, lower-back, chest, biceps, triceps, forearm,
// back-deltoids, front-deltoids, abs, obliques, adductor, hamstring,
// quadriceps, abductors, calves, gluteal, head, neck
import type { Muscle } from 'react-body-highlighter'

// 一个解剖名可能映射到多个肌群 slug；未列出的名（如 cardiorespiratory-system）不映射
const MAP: Record<string, Muscle[]> = {
  calves: ['calves'],
  core: ['abs', 'obliques'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  quads: ['quadriceps'],
  lats: ['upper-back'],
  rhomboids: ['upper-back'],
  'rear-deltoids': ['back-deltoids'],
  'transverse-abdominis': ['abs'],
  obliques: ['obliques'],
  gastrocnemius: ['calves'],
  soleus: ['calves'],
  // 库无"胫前肌"独立区域，就近映射小腿
  'tibialis-anterior': ['calves'],
  chest: ['chest'],
  triceps: ['triceps'],
  // 三角肌泛指前+后束
  deltoids: ['front-deltoids', 'back-deltoids'],
  'anterior-deltoids': ['front-deltoids'],
  'pectoralis-major': ['chest'],
  multifidus: ['lower-back'],
  // 髋稳定肌 ≈ 臀中小肌
  'hip-stabilizers': ['gluteal'],
  // cardiorespiratory-system: 非肌群，不映射
}

/** 把 plan.json 的 highlight 解剖名转换为库可识别的肌群 slug 列表（去重） */
export function toRbhMuscles(parts: string[] | undefined): Muscle[] {
  const out = new Set<Muscle>()
  if (!parts) return []
  for (const p of parts) {
    const m = MAP[p]
    if (m) m.forEach((x) => out.add(x))
  }
  return [...out]
}
