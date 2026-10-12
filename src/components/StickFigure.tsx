// SVG 人体渲染：关节角度驱动骨骼（正面/侧面）——极简线条骨架
// 2026-10-13 重写：去掉伪体积胶囊/渐变/肤色，改为一笔线条 + 关节点 + 站立虚影。
// 作为「无真人视频」动作的回退示意；目标肌群由 MuscleMap 负责高亮。
// 骨骼几何与关键帧接口保持不变。

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

// 骨骼段长（相对坐标系，viewBox 200x200）—— 接近真人 7 头身比例
const SEG = {
  headR: 10,
  neckLen: 7,
  torsoLen: 42,
  upperArm: 23,
  forearm: 21,
  thigh: 33,
  shin: 33,
}

export const HIGHLIGHT_COLOR = '#FF6B2C'

// 线条配色（深浅主题均可读的中性灰）
const LINE = '#8A9099'
const JOINT = '#5F5E5A'
const GHOST = '#B4B2A9'

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

export default function StickFigure({ pose, view, children, className }: Props) {
  const isSide = view === 'side'
  const hipX = 100
  const hipY = isSide ? 108 : 103
  const headY = hipY - SEG.torsoLen - SEG.neckLen - SEG.headR
  const torsoAngle = isSide ? pose.torsoLean : 0
  const neckBase: [number, number] = [hipX, hipY - SEG.torsoLen]
  const headCenter: [number, number] = [
    hipX + (isSide ? Math.sin((torsoAngle * Math.PI) / 180) * (SEG.neckLen + SEG.headR) : 0),
    headY,
  ]
  const shoulderY = neckBase[1]
  const shoulderX = neckBase[0]

  const makeArm = (shoulderAng: number, elbowAng: number) => {
    const dir = -90 + shoulderAng
    const [ex, ey] = polar(shoulderX, shoulderY, SEG.upperArm, dir)
    const [hx, hy] = polar(ex, ey, SEG.forearm, dir + elbowAng - 90)
    return { elbow: [ex, ey] as [number, number], hand: [hx, hy] as [number, number] }
  }
  const armL = makeArm(pose.shoulderL, pose.elbowL)
  const armR = makeArm(pose.shoulderR, pose.elbowR)

  const makeLeg = (hipFlex: number, knee: number, lift: number) => {
    let thighAngle: number
    if (isSide) thighAngle = 90 + hipFlex
    else thighAngle = 90
    const thighAng = thighAngle + (isSide ? 0 : lift * 8 * 0.3)
    const [kx, ky] = polar(hipX, hipY, SEG.thigh, thighAng)
    const shinAngle = thighAng - knee
    const [ax, ay] = polar(kx, ky, SEG.shin, shinAngle)
    return { knee: [kx, ky] as [number, number], ankle: [ax, ay] as [number, number] }
  }
  const legL = makeLeg(pose.hipFlexL, pose.kneeL, pose.footLift)
  const legR = makeLeg(pose.hipFlexR, pose.kneeR, -pose.footLift)

  // 站立参考虚影（展示动作范围，固定姿态）
  const ghost = {
    head: [100, 40] as [number, number],
    spine: [[100, 50], [100, 95]] as [number, number][],
    armL: [[88, 55], [84, 110]] as [number, number][],
    armR: [[112, 55], [116, 110]] as [number, number][],
    legL: [[100, 95], [96, 170]] as [number, number][],
    legR: [[100, 95], [104, 170]] as [number, number][],
  }

  return (
    <svg viewBox="0 0 200 200" className={className} style={{ display: 'block' }}>
      {/* 地垫 */}
      <ellipse cx="100" cy="180" rx="70" ry="8" fill="#15161A" stroke="#26282E" strokeWidth="1" />

      {children}

      {/* 站立虚影 */}
      <g fill="none" stroke={GHOST} strokeWidth="3" strokeLinecap="round" opacity="0.30">
        <circle cx={ghost.head[0]} cy={ghost.head[1]} r="10" />
        <path d={`M${ghost.spine[0][0]} ${ghost.spine[0][1]} L${ghost.spine[1][0]} ${ghost.spine[1][1]}`} />
        <path d={`M${ghost.armL[0][0]} ${ghost.armL[0][1]} L${ghost.armL[1][0]} ${ghost.armL[1][1]}`} />
        <path d={`M${ghost.armR[0][0]} ${ghost.armR[0][1]} L${ghost.armR[1][0]} ${ghost.armR[1][1]}`} />
        <path d={`M${ghost.legL[0][0]} ${ghost.legL[0][1]} L${ghost.legL[1][0]} ${ghost.legL[1][1]}`} />
        <path d={`M${ghost.legR[0][0]} ${ghost.legR[0][1]} L${ghost.legR[1][0]} ${ghost.legR[1][1]}`} />
      </g>

      {/* 当前姿态：一笔线条骨架 */}
      <g fill="none" stroke={LINE} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        {/* 头 */}
        <circle cx={headCenter[0]} cy={headCenter[1]} r={SEG.headR} />
        {/* 脊柱 */}
        <path d={`M${neckBase[0]} ${neckBase[1]} L${hipX} ${hipY}`} />
        {/* 肩线 */}
        <path d={`M${shoulderX - 7} ${shoulderY} L${shoulderX + 7} ${shoulderY}`} />
        {/* 髋线 */}
        <path d={`M${hipX - 6} ${hipY} L${hipX + 6} ${hipY}`} />
        {/* 手臂 */}
        <path d={`M${shoulderX} ${shoulderY} L${armL.elbow[0].toFixed(1)} ${armL.elbow[1].toFixed(1)} L${armL.hand[0].toFixed(1)} ${armL.hand[1].toFixed(1)}`} />
        <path d={`M${shoulderX} ${shoulderY} L${armR.elbow[0].toFixed(1)} ${armR.elbow[1].toFixed(1)} L${armR.hand[0].toFixed(1)} ${armR.hand[1].toFixed(1)}`} />
        {/* 腿 */}
        <path d={`M${hipX} ${hipY} L${legL.knee[0].toFixed(1)} ${legL.knee[1].toFixed(1)} L${legL.ankle[0].toFixed(1)} ${legL.ankle[1].toFixed(1)}`} />
        <path d={`M${hipX} ${hipY} L${legR.knee[0].toFixed(1)} ${legR.knee[1].toFixed(1)} L${legR.ankle[0].toFixed(1)} ${legR.ankle[1].toFixed(1)}`} />
      </g>

      {/* 关节点 */}
      <g>
        <circle cx={shoulderX} cy={shoulderY} r="3.2" fill={JOINT} />
        <circle cx={armL.elbow[0]} cy={armL.elbow[1]} r="3" fill={JOINT} />
        <circle cx={armR.elbow[0]} cy={armR.elbow[1]} r="3" fill={JOINT} />
        <circle cx={armL.hand[0]} cy={armL.hand[1]} r="3" fill={JOINT} />
        <circle cx={armR.hand[0]} cy={armR.hand[1]} r="3" fill={JOINT} />
        <circle cx={hipX} cy={hipY} r="3.6" fill={JOINT} />
        <circle cx={legL.knee[0]} cy={legL.knee[1]} r="3.2" fill={JOINT} />
        <circle cx={legR.knee[0]} cy={legR.knee[1]} r="3.2" fill={JOINT} />
        <circle cx={legL.ankle[0]} cy={legL.ankle[1]} r="3" fill={JOINT} />
        <circle cx={legR.ankle[0]} cy={legR.ankle[1]} r="3" fill={JOINT} />
      </g>
    </svg>
  )
}
