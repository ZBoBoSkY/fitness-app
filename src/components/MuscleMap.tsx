// 解剖肌肉图：前/后双视图，按 plan.json 的 highlight 点亮目标肌群。
// 替代原 StickFigure 上「4 桶塌缩高亮」(shoulders/quads/calves/core)，
// 让 20+ 块肌肉数据正确呈现。
import Model from 'react-body-highlighter'
import type { IExerciseData } from 'react-body-highlighter'
import { HIGHLIGHT_COLOR } from './StickFigure'
import { toRbhMuscles } from '../lib/muscleMap'

interface Props {
  highlight: string[]
  /** 未工作肌群的基础色（深色主题下用中性灰） */
  bodyColor?: string
}

export default function MuscleMap({ highlight, bodyColor = '#3c414a' }: Props) {
  const muscles = toRbhMuscles(highlight)

  if (muscles.length === 0) {
    return <div className="muscle-map--empty">本动作未标注目标肌群</div>
  }

  // 单动作：把所有目标肌群以同一高亮色点亮（frequency=1）
  const data: IExerciseData[] = [{ name: '当前动作', muscles, frequency: 1 }]
  const colors = [HIGHLIGHT_COLOR]

  return (
    <div className="muscle-map">
      <div className="muscle-map__view">
        <div className="muscle-map__label">正面</div>
        <Model type="anterior" data={data} bodyColor={bodyColor} highlightedColors={colors} />
      </div>
      <div className="muscle-map__view">
        <div className="muscle-map__label">背面</div>
        <Model type="posterior" data={data} bodyColor={bodyColor} highlightedColors={colors} />
      </div>
    </div>
  )
}
