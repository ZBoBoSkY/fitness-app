// SVG 人体渲染：关节角度驱动骨骼（正面/侧面），拟人写实渲染层
// 渲染升级（2026-10-12）：肤色 + 衣物配色、圆柱体积光影（肢体为带横向渐变的胶囊）、
// 关节柔和球体、地垫投影、高亮发光。骨骼几何与关键帧接口保持不变。

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

/** 带圆柱体积光影的肢体：以关节连线为轴，横向渐变模拟受光 */
function Capsule({
  x1,
  y1,
  x2,
  y2,
  w,
  fill,
  opacity = 1,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  w: number
  fill: string
  opacity?: number
}) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${ang})`} opacity={opacity}>
      <rect x={-w / 2} y={0} width={w} height={len} rx={w / 2} fill={fill} />
    </g>
  )
}

export default function StickFigure({ pose, view, highlight = {}, children, className }: Props) {
  const isSide = view === 'side'

  // 锚点
  const hipX = 100
  const hipY = isSide ? 108 : 103

  // 头部中心
  const headY = hipY - SEG.torsoLen - SEG.neckLen - SEG.headR
  const torsoAngle = isSide ? pose.torsoLean : 0

  // 肩点（在躯干顶端）
  const neckBase: [number, number] = [hipX, hipY - SEG.torsoLen]
  const headCenter: [number, number] = [
    hipX + (isSide ? Math.sin((torsoAngle * Math.PI) / 180) * (SEG.neckLen + SEG.headR) : 0),
    headY,
  ]

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

  // 肢体绘制（含高亮发光底）
  const Limb = ({
    part,
    x1,
    y1,
    x2,
    y2,
    w,
    fill,
    opacity = 1,
  }: {
    part: string
    x1: number
    y1: number
    x2: number
    y2: number
    w: number
    fill: string
    opacity?: number
  }) => (
    <g>
      {isHl(part) && (
        <Capsule x1={x1} y1={y1} x2={x2} y2={y2} w={w + 7} fill={HIGHLIGHT_COLOR} opacity={0.28} />
      )}
      <Capsule x1={x1} y1={y1} x2={x2} y2={y2} w={w} fill={fill} opacity={opacity} />
    </g>
  )

  // 躯干（肩宽、腰收、髋宽的锥形体块），横向渐变模拟圆柱受光
  const midX = (neckBase[0] + hipX) / 2
  const midY = (neckBase[1] + hipY) / 2
  const tdx = neckBase[0] - hipX
  const tdy = neckBase[1] - hipY
  const tlen = Math.hypot(tdx, tdy) || 1
  const px = -tdy / tlen
  const py = tdx / tlen
  const shW = 12
  const waW = 8.5
  const hpW = 11
  const torsoPoly = [
    [neckBase[0] + px * shW, neckBase[1] + py * shW],
    [neckBase[0] - px * shW, neckBase[1] - py * shW],
    [midX - px * waW, midY - py * waW],
    [hipX - px * hpW, hipY - py * hpW],
    [hipX + px * hpW, hipY + py * hpW],
    [midX + px * waW, midY + py * waW],
  ]
    .map((p) => p.join(','))
    .join(' ')

  const farOpacity = isSide ? 0.82 : 1 // 侧视远侧肢体压暗制造纵深

  return (
    <svg viewBox="0 0 200 200" className={className} style={{ display: 'block' }}>
      <defs>
        {/* 圆柱体积光影：横向 暗-亮-暗 */}
        <linearGradient id="cyl-skin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B97A52" />
          <stop offset="0.5" stopColor="#E9BE96" />
          <stop offset="1" stopColor="#B97A52" />
        </linearGradient>
        <linearGradient id="cyl-shirt" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1F6E7B" />
          <stop offset="0.5" stopColor="#56C3D5" />
          <stop offset="1" stopColor="#1F6E7B" />
        </linearGradient>
        <linearGradient id="cyl-shorts" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#222C44" />
          <stop offset="0.5" stopColor="#495C86" />
          <stop offset="1" stopColor="#222C44" />
        </linearGradient>
        <linearGradient id="cyl-shoe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1C1C22" />
          <stop offset="0.5" stopColor="#3C3C46" />
          <stop offset="1" stopColor="#1C1C22" />
        </linearGradient>
        {/* 躯干：横向渐变给出圆柱体积 */}
        <linearGradient id="torso-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1F6E7B" />
          <stop offset="0.5" stopColor="#56C3D5" />
          <stop offset="1" stopColor="#1F6E7B" />
        </linearGradient>
        {/* 头部：受光球面 */}
        <radialGradient id="head-grad" cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#F1CBA8" />
          <stop offset="0.7" stopColor="#D9A87E" />
          <stop offset="1" stopColor="#B97A52" />
        </radialGradient>
      </defs>

      {/* 地垫 + 投影 */}
      <ellipse cx="100" cy="180" rx="74" ry="9" fill="#15161A" stroke="#26282E" strokeWidth="1" />
      <ellipse cx={hipX + 2} cy="180" rx="30" ry="4.5" fill="rgba(0,0,0,0.5)" />

      {children}

      {/* 远侧肢体（侧视压暗） */}
      <g opacity={farOpacity}>
        <Limb part="shoulders" x1={shoulderX} y1={shoulderY} x2={armR.elbow[0]} y2={armR.elbow[1]} w={6.5} fill="url(#cyl-shirt)" />
        <Limb part="shoulders" x1={armR.elbow[0]} y1={armR.elbow[1]} x2={armR.hand[0]} y2={armR.hand[1]} w={5.2} fill="url(#cyl-skin)" />
        <Limb part="quads" x1={hipX} y1={hipY} x2={legR.knee[0]} y2={legR.knee[1]} w={8} fill="url(#cyl-shorts)" />
        <Limb part="calves" x1={legR.knee[0]} y1={legR.knee[1]} x2={legR.ankle[0]} y2={legR.ankle[1]} w={6} fill="url(#cyl-skin)" />
        {/* 远脚（鞋） */}
        <Capsule
          x1={legR.ankle[0]}
          y1={legR.ankle[1]}
          x2={legR.ankle[0] + (isSide ? 11 : 6)}
          y2={legR.ankle[1] + (isSide ? 0 : 7)}
          w={5}
          fill="url(#cyl-shoe)"
        />
      </g>

      {/* 躯干体块 */}
      <polygon points={torsoPoly} fill="url(#torso-grad)" />
      {isHl('core') && <polygon points={torsoPoly} fill={HIGHLIGHT_COLOR} opacity={0.25} />}
      {/* 颈 */}
      <Limb part="core" x1={neckBase[0]} y1={neckBase[1]} x2={headCenter[0]} y2={headCenter[1] + SEG.headR - 1} w={6} fill="url(#cyl-skin)" />

      {/* 近侧手臂 */}
      <Limb part="shoulders" x1={shoulderX} y1={shoulderY} x2={armL.elbow[0]} y2={armL.elbow[1]} w={6.5} fill="url(#cyl-shirt)" />
      <Limb part="shoulders" x1={armL.elbow[0]} y1={armL.elbow[1]} x2={armL.hand[0]} y2={armL.hand[1]} w={5.2} fill="url(#cyl-skin)" />

      {/* 近侧腿 */}
      <Limb part="quads" x1={hipX} y1={hipY} x2={legL.knee[0]} y2={legL.knee[1]} w={8} fill="url(#cyl-shorts)" />
      <Limb part="calves" x1={legL.knee[0]} y1={legL.knee[1]} x2={legL.ankle[0]} y2={legL.ankle[1]} w={6} fill="url(#cyl-skin)" />
      {/* 近脚（鞋） */}
      <Capsule
        x1={legL.ankle[0]}
        y1={legL.ankle[1]}
        x2={legL.ankle[0] + (isSide ? 11 : 6)}
        y2={legL.ankle[1] + (isSide ? 0 : 7)}
        w={5}
        fill="url(#cyl-shoe)"
      />

      {/* 关节柔和球体（肤色/衣物，不抢戏） */}
      <circle cx={shoulderX} cy={shoulderY} r="4.4" fill="url(#cyl-shirt)" />
      <circle cx={armL.elbow[0]} cy={armL.elbow[1]} r="3.8" fill="url(#cyl-skin)" />
      <circle cx={armR.elbow[0]} cy={armR.elbow[1]} r="3.8" fill="url(#cyl-skin)" opacity={farOpacity} />
      <circle cx={hipX} cy={hipY} r="5" fill="url(#cyl-shorts)" />
      <circle cx={legL.knee[0]} cy={legL.knee[1]} r="4" fill="url(#cyl-skin)" />
      <circle cx={legR.knee[0]} cy={legR.knee[1]} r="4" fill="url(#cyl-skin)" opacity={farOpacity} />

      {/* 手 */}
      <circle cx={armL.hand[0]} cy={armL.hand[1]} r="3.4" fill="url(#cyl-skin)" />
      <circle cx={armR.hand[0]} cy={armR.hand[1]} r="3.4" fill="url(#cyl-skin)" opacity={farOpacity} />

      {/* 头（最后画，保持在最上层） */}
      <g>
        <circle cx={headCenter[0]} cy={headCenter[1]} r={SEG.headR} fill="url(#head-grad)" />
        {/* 头发（顶部弧） */}
        <path
          d={`M ${headCenter[0] - SEG.headR} ${headCenter[1]} A ${SEG.headR} ${SEG.headR} 0 0 1 ${headCenter[0] + SEG.headR} ${headCenter[1]}`}
          fill="none"
          stroke="#2B2620"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* 侧面：鼻尖 */}
        {isSide && (
          <circle cx={headCenter[0] + SEG.headR - 0.5} cy={headCenter[1] + 1.5} r="1.6" fill="#C98E63" />
        )}
      </g>
    </svg>
  )
}
