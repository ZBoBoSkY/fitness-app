// SVG 火柴人骨骼组件：关节用角度驱动，支持正面/侧面视角

export interface Pose {
  // 关节角度（度）
  hip: number // 躯干相对垂直的倾角（侧视：前倾为正）
  kneeL: number // 左膝屈曲角
  kneeR: number // 右膝屈曲角
  shoulderL: number // 左肩（相对躯干，前抬为正）
  shoulderR: number
  elbowL: number
  elbowR: number
  hipFlexL: number // 左髋屈曲（大腿前抬为正）
  hipFlexR: number
  // 躯干/整体旋转（侧视用）
  torsoLean: number
  // 位置偏移（用于踏步等）
  footLift: number // 0..1，抬脚比例
  armSwing: number // -1..1
}

export interface BodyPartHighlight {
  [part: string]: boolean
}

// 骨骼段长（相对坐标系，viewBox 200x200）
const SEG = {
  headR: 11,
  neckLen: 8,
  torsoLen: 40,
  upperArm: 24,
  forearm: 22,
  thigh: 30,
  shin: 30,
}

export const HIGHLIGHT_COLOR = '#FF6B2C'

interface Props {
  pose: Pose
  view: 'front' | 'side'
  highlight?: BodyPartHighlight
  /** 是否绘制额外道具（由上层用 children 注入） */
  children?: React.ReactNode
  className?: string
}

function polar(cx: number, cy: number, len: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [cx + len * Math.cos(rad), cy + len * Math.sin(rad)]
}

// 角度约定：0 = 指向 +x（向右）；正角度 = 逆时针（屏幕坐标向下为正，所以用 sin 时需注意）
// 这里我们约定屏幕坐标系：y 向下。angle 0 = 向右，90 = 向下，-90 = 向上。

export default function StickFigure({ pose, view, highlight = {}, children, className }: Props) {
  const isSide = view === 'side'

  // 锚点
  const hipX = 100
  const hipY = isSide ? 105 : 100

  // 头部中心
  const headY = hipY - SEG.torsoLen - SEG.neckLen - SEG.headR
  // 躯干倾角（侧视）
  const torsoAngle = isSide ? pose.torsoLean : 0

  // 肩点（在躯干顶端）
  const neckBase: [number, number] = [hipX, hipY - SEG.torsoLen]
  const headCenter: [number, number] = [hipX + (isSide ? Math.sin((torsoAngle * Math.PI) / 180) * (SEG.neckLen + SEG.headR) : 0), headY]

  // 肩部位置（随躯干倾斜略移）
  const shoulderY = neckBase[1]
  const shoulderX = neckBase[0]

  // 手（上臂+前臂）
  const makeArm = (shoulderAng: number, elbowAng: number) => {
    // shoulderAng 相对躯干：正面时 0=向下垂，侧视时 0=向下
    // 简化为：肩关节角度 = 相对"垂直向下"方向
    const dir = -90 + shoulderAng // -90 = 向上
    const [ex, ey] = polar(shoulderX, shoulderY, SEG.upperArm, dir)
    const [hx, hy] = polar(ex, ey, SEG.forearm, dir + elbowAng - 90)
    return { elbow: [ex, ey] as [number, number], hand: [hx, hy] as [number, number] }
  }

  const armL = makeArm(pose.shoulderL, pose.elbowL)
  const armR = makeArm(pose.shoulderR, pose.elbowR)

  // 腿
  const makeLeg = (hipFlex: number, knee: number, lift: number) => {
    // 正面：大腿向下 + 髋外展（略分开）；侧视：大腿沿躯干方向
    let thighAngle: number
    if (isSide) {
      thighAngle = 90 + hipFlex // 90=向下，前抬为正
    } else {
      thighAngle = 90 // 垂直向下
    }
    // 抬脚：缩短视觉（用角度微调模拟）
    const liftOffset = lift * 8
    const thighAng = thighAngle + (isSide ? 0 : liftOffset * 0.3)
    const [kx, ky] = polar(hipX, hipY, SEG.thigh, thighAng)
    // 膝屈曲方向：侧视屈膝向后（小腿向后），正面屈膝向上
    let shinAngle: number
    if (isSide) {
      shinAngle = thighAng - knee
    } else {
      shinAngle = thighAng - knee
    }
    const [ax, ay] = polar(kx, ky, SEG.shin, shinAngle)
    return { knee: [kx, ky] as [number, number], ankle: [ax, ay] as [number, number] }
  }

  const legL = makeLeg(pose.hipFlexL, pose.kneeL, pose.footLift)
  const legR = makeLeg(pose.hipFlexR, pose.kneeR, -pose.footLift)

  const partColor = (part: string) => (highlight[part] ? HIGHLIGHT_COLOR : '#C9CDD4')
  const stroke = (part: string, width = 5): React.CSSProperties => ({
    stroke: partColor(part),
    strokeWidth: width,
    strokeLinecap: 'round',
  })

  return (
    <svg viewBox="0 0 200 200" className={className} style={{ display: 'block' }}>
      {/* 地面参考线 */}
      <line x1="20" y1="175" x2="180" y2="175" stroke="#2A2D33" strokeWidth="2" strokeDasharray="4 4" />
      {children}
      {/* 头部 */}
      <circle cx={headCenter[0]} cy={headCenter[1]} r={SEG.headR} fill={partColor('head')} />
      {/* 躯干 */}
      <line x1={neckBase[0]} y1={neckBase[1]} x2={hipX} y2={hipY} style={stroke('core')} />
      {/* 手臂 */}
      <line x1={shoulderX} y1={shoulderY} x2={armL.elbow[0]} y2={armL.elbow[1]} style={stroke('shoulders', 4.5)} />
      <line x1={armL.elbow[0]} y1={armL.elbow[1]} x2={armL.hand[0]} y2={armL.hand[1]} style={stroke('shoulders', 4)} />
      <line x1={shoulderX} y1={shoulderY} x2={armR.elbow[0]} y2={armR.elbow[1]} style={stroke('shoulders', 4.5)} />
      <line x1={armR.elbow[0]} y1={armR.elbow[1]} x2={armR.hand[0]} y2={armR.hand[1]} style={stroke('shoulders', 4)} />
      {/* 腿 */}
      <line x1={hipX} y1={hipY} x2={legL.knee[0]} y2={legL.knee[1]} style={stroke('quads')} />
      <line x1={legL.knee[0]} y1={legL.knee[1]} x2={legL.ankle[0]} y2={legL.ankle[1]} style={stroke('calves')} />
      <line x1={hipX} y1={hipY} x2={legR.knee[0]} y2={legR.knee[1]} style={stroke('quads')} />
      <line x1={legR.knee[0]} y1={legR.knee[1]} x2={legR.ankle[0]} y2={legR.ankle[1]} style={stroke('calves')} />
      {/* 脚 */}
      <line x1={legL.ankle[0]} y1={legL.ankle[1]} x2={legL.ankle[0] + (isSide ? 12 : 10)} y2={legL.ankle[1]} style={stroke('calves', 4)} />
      <line x1={legR.ankle[0]} y1={legR.ankle[1]} x2={legR.ankle[0] + (isSide ? 12 : 10)} y2={legR.ankle[1]} style={stroke('calves', 4)} />
      {/* 手 */}
      <circle cx={armL.hand[0]} cy={armL.hand[1]} r="3" fill={partColor('shoulders')} />
      <circle cx={armR.hand[0]} cy={armR.hand[1]} r="3" fill={partColor('shoulders')} />
    </svg>
  )
}
