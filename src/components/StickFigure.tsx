// SVG 人体渲染：关节角度驱动骨骼（正面/侧面），半 3D 质感渲染层
// 渲染升级（2026-10）：渐变体块躯干、金属感四肢、关节圆球、地垫投影、高亮发光
// 骨骼几何与关键帧约定保持不变，仅改变绘制方式

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

// 质感配色（银灰金属 + 橙色高亮）
const BODY_LIGHT = '#EAEEF4'
const BODY_DARK = '#8B95A1'
const HL_LIGHT = '#FF9A5C'
const HL_DARK = '#EF5A1D'
const JOINT_BODY = '#78828E'
const JOINT_HL = '#D14A16'

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

// 角度约定：屏幕坐标系 y 向下。angle 0 = 向右，90 = 向下，-90 = 向上。

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
    const dir = -90 + shoulderAng // -90 = 向上
    const [ex, ey] = polar(shoulderX, shoulderY, SEG.upperArm, dir)
    const [hx, hy] = polar(ex, ey, SEG.forearm, dir + elbowAng - 90)
    return { elbow: [ex, ey] as [number, number], hand: [hx, hy] as [number, number] }
  }

  const armL = makeArm(pose.shoulderL, pose.elbowL)
  const armR = makeArm(pose.shoulderR, pose.elbowR)

  // 腿
  const makeLeg = (hipFlex: number, knee: number, lift: number) => {
    let thighAngle: number
    if (isSide) {
      thighAngle = 90 + hipFlex
    } else {
      thighAngle = 90
    }
    const liftOffset = lift * 8
    const thighAng = thighAngle + (isSide ? 0 : liftOffset * 0.3)
    const [kx, ky] = polar(hipX, hipY, SEG.thigh, thighAng)
    const shinAngle = thighAng - knee
    const [ax, ay] = polar(kx, ky, SEG.shin, shinAngle)
    return { knee: [kx, ky] as [number, number], ankle: [ax, ay] as [number, number] }
  }

  const legL = makeLeg(pose.hipFlexL, pose.kneeL, pose.footLift)
  const legR = makeLeg(pose.hipFlexR, pose.kneeR, -pose.footLift)

  const isHl = (part: string) => !!highlight[part]
  const limbPaint = (part: string, w: number): React.CSSProperties => ({
    stroke: isHl(part) ? 'url(#fg-hl)' : 'url(#fg-body)',
    strokeWidth: w,
    strokeLinecap: 'round',
  })

  // 躯干体块（肩宽髋窄的锥形多边形，端点与原骨骼线一致）
  const tdx = neckBase[0] - hipX
  const tdy = neckBase[1] - hipY
  const tlen = Math.hypot(tdx, tdy) || 1
  const px = -tdy / tlen
  const py = tdx / tlen
  const shW = 9
  const hpW = 6
  const torsoPoly = [
    [neckBase[0] + px * shW, neckBase[1] + py * shW],
    [neckBase[0] - px * shW, neckBase[1] - py * shW],
    [hipX - px * hpW, hipY - py * hpW],
    [hipX + px * hpW, hipY + py * hpW],
  ]
    .map((p) => p.join(','))
    .join(' ')

  const farOpacity = isSide ? 0.78 : 1 // 侧视时远侧肢体压暗制造纵深

  const Joint = ({ x, y, hl }: { x: number; y: number; hl: boolean }) => (
    <circle cx={x} cy={y} r={3.4} fill={hl ? JOINT_HL : JOINT_BODY} />
  )

  /** 高亮发光底层（同几何，宽而淡） */
  const Glow = ({ x1, y1, x2, y2, w }: { x1: number; y1: number; x2: number; y2: number; w: number }) =>
    isHl('quads') || isHl('calves') || isHl('shoulders') || isHl('core') ? (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={HIGHLIGHT_COLOR} strokeWidth={w + 5} strokeLinecap="round" opacity={0.22} />
    ) : null

  return (
    <svg viewBox="0 0 200 200" className={className} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="fg-body" x1="0" y1="25" x2="0" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BODY_LIGHT} />
          <stop offset="1" stopColor={BODY_DARK} />
        </linearGradient>
        <linearGradient id="fg-hl" x1="0" y1="25" x2="0" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={HL_LIGHT} />
          <stop offset="1" stopColor={HL_DARK} />
        </linearGradient>
        <radialGradient id="fg-head" cx="0.35" cy="0.3" r="1.1">
          <stop offset="0" stopColor="#F3F6FA" />
          <stop offset="1" stopColor={BODY_DARK} />
        </radialGradient>
      </defs>

      {/* 地垫 + 投影 */}
      <ellipse cx="100" cy="177" rx="74" ry="9" fill="#15161A" stroke="#26282E" strokeWidth="1" />
      <ellipse cx={hipX + 2} cy="177" rx="32" ry="5" fill="rgba(0,0,0,0.5)" />

      {children}

      {/* 远侧肢体（侧视压暗） */}
      <g opacity={farOpacity}>
        <Glow x1={shoulderX} y1={shoulderY} x2={armR.elbow[0]} y2={armR.elbow[1]} w={4.5} />
        <line x1={shoulderX} y1={shoulderY} x2={armR.elbow[0]} y2={armR.elbow[1]} style={limbPaint('shoulders', 4.5)} />
        <Glow x1={armR.elbow[0]} y1={armR.elbow[1]} x2={armR.hand[0]} y2={armR.hand[1]} w={4} />
        <line x1={armR.elbow[0]} y1={armR.elbow[1]} x2={armR.hand[0]} y2={armR.hand[1]} style={limbPaint('shoulders', 4)} />
        <Glow x1={hipX} y1={hipY} x2={legR.knee[0]} y2={legR.knee[1]} w={5} />
        <line x1={hipX} y1={hipY} x2={legR.knee[0]} y2={legR.knee[1]} style={limbPaint('quads', 5)} />
        <Glow x1={legR.knee[0]} y1={legR.knee[1]} x2={legR.ankle[0]} y2={legR.ankle[1]} w={5} />
        <line x1={legR.knee[0]} y1={legR.knee[1]} x2={legR.ankle[0]} y2={legR.ankle[1]} style={limbPaint('calves', 5)} />
        <line x1={legR.ankle[0]} y1={legR.ankle[1]} x2={legR.ankle[0] + (isSide ? 12 : 10)} y2={legR.ankle[1]} style={limbPaint('calves', 4)} />
      </g>

      {/* 躯干体块 */}
      <polygon points={torsoPoly} fill={isHl('core') ? 'url(#fg-hl)' : 'url(#fg-body)'} />
      {/* 颈 */}
      <line x1={neckBase[0]} y1={neckBase[1]} x2={headCenter[0]} y2={headCenter[1] + SEG.headR - 2} style={limbPaint('core', 5)} />

      {/* 近侧手臂 */}
      <Glow x1={shoulderX} y1={shoulderY} x2={armL.elbow[0]} y2={armL.elbow[1]} w={4.5} />
      <line x1={shoulderX} y1={shoulderY} x2={armL.elbow[0]} y2={armL.elbow[1]} style={limbPaint('shoulders', 4.5)} />
      <Glow x1={armL.elbow[0]} y1={armL.elbow[1]} x2={armL.hand[0]} y2={armL.hand[1]} w={4} />
      <line x1={armL.elbow[0]} y1={armL.elbow[1]} x2={armL.hand[0]} y2={armL.hand[1]} style={limbPaint('shoulders', 4)} />

      {/* 近侧腿 */}
      <Glow x1={hipX} y1={hipY} x2={legL.knee[0]} y2={legL.knee[1]} w={5} />
      <line x1={hipX} y1={hipY} x2={legL.knee[0]} y2={legL.knee[1]} style={limbPaint('quads', 5)} />
      <Glow x1={legL.knee[0]} y1={legL.knee[1]} x2={legL.ankle[0]} y2={legL.ankle[1]} w={5} />
      <line x1={legL.knee[0]} y1={legL.knee[1]} x2={legL.ankle[0]} y2={legL.ankle[1]} style={limbPaint('calves', 5)} />
      <line x1={legL.ankle[0]} y1={legL.ankle[1]} x2={legL.ankle[0] + (isSide ? 12 : 10)} y2={legL.ankle[1]} style={limbPaint('calves', 4)} />

      {/* 关节球 */}
      <Joint x={shoulderX} y={shoulderY} hl={isHl('shoulders')} />
      <Joint x={armL.elbow[0]} y={armL.elbow[1]} hl={isHl('shoulders')} />
      <Joint x={armR.elbow[0]} y={armR.elbow[1]} hl={isHl('shoulders')} />
      <Joint x={hipX} y={hipY} hl={isHl('core')} />
      <Joint x={legL.knee[0]} y={legL.knee[1]} hl={isHl('quads') || isHl('calves')} />
      <Joint x={legR.knee[0]} y={legR.knee[1]} hl={isHl('quads') || isHl('calves')} />

      {/* 手 */}
      <circle cx={armL.hand[0]} cy={armL.hand[1]} r="3" fill={isHl('shoulders') ? 'url(#fg-hl)' : 'url(#fg-body)'} />
      <circle cx={armR.hand[0]} cy={armR.hand[1]} r="3" fill={isHl('shoulders') ? 'url(#fg-hl)' : 'url(#fg-body)'} />

      {/* 头（最后画，保持在最上层） */}
      <circle cx={headCenter[0]} cy={headCenter[1]} r={SEG.headR} fill="url(#fg-head)" />
    </svg>
  )
}
