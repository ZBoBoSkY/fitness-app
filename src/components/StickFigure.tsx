// SVG 人体渲染：关节角度驱动骨骼（正面/侧面）——扁平运动插画小人
// 2026-10-13 二次重写：极简线条 → 近似真人的扁平插画（肤色四肢 + 运动上衣 + 短裤 + 球鞋 + 发型）。
// 站立参考改为同款单色剪影（低透明度整体轮廓），避免线条虚影在实心身体后被读作"长发"。
// 几何约定（修正后，保持不变）：
//   侧视：人物面向 +x；髋屈曲为正=大腿前抬（90°-hipFlex）；膝屈曲为正=小腿向后下垂（thigh+knee）；
//         torsoLean 为整段躯干绕髋前倾。
//   正视：髋屈曲表现为大腿透视缩短（×cos），抬起腿小幅外展，支撑腿保持垂直不滑动。
// 作为「无真人视频」动作的回退示意；目标肌群由 MuscleMap 负责高亮。
// 骨骼段长与关键帧接口保持不变。

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
  footLift: number // -1..1，正值=左腿抬起，负值=右腿抬起
  armSwing: number // -1..1
  /** 躯干竖直起伏 0..1（约 1.5px），用于踏步等轻微重心上提 */
  bob?: number
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

// 插画配色（上衣沿用主题橙，远侧肢体用暗色调制造前后层次）
const C = {
  skin: '#EDB98A',
  skinDim: '#D39A66',
  shirt: '#FF6B2C',
  shirtDim: '#D8541D',
  shorts: '#313743',
  shortsDim: '#262B34',
  shoe: '#E8EAF0',
  shoeDim: '#C2C7D2',
  hair: '#3A332C',
}

// 站立参考姿势（虚影用）
const STAND_POSE: Pose = {
  hip: 0, kneeL: 6, kneeR: 6, shoulderL: 0, shoulderR: 0,
  elbowL: 8, elbowR: 8, hipFlexL: 0, hipFlexR: 0,
  torsoLean: 0, footLift: 0, armSwing: 0,
}

interface Rig {
  hipX: number
  hipY: number
  neckBase: [number, number]
  headCenter: [number, number]
  shoulderX: number
  shoulderY: number
  armL: { elbow: [number, number]; hand: [number, number] }
  armR: { elbow: [number, number]; hand: [number, number] }
  legL: { knee: [number, number]; ankle: [number, number] }
  legR: { knee: [number, number]; ankle: [number, number] }
}

function polar(cx: number, cy: number, len: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [cx + len * Math.cos(rad), cy + len * Math.sin(rad)]
}

/** 由姿态计算全部关节坐标（纯几何，无渲染） */
function buildRig(pose: Pose, isSide: boolean): Rig {
  // 躯干起伏：抬腿时重心轻微上提（约 1.5px），避免大幅弹跳
  const hipX = 100
  const hipY = (isSide ? 108 : 103) - (pose.bob ?? 0) * 1.5

  // 躯干绕髋前倾（侧视）：整段躯干+头+肩一起转
  const leanRad = (isSide ? pose.torsoLean : 0) * (Math.PI / 180)
  const leanDx = Math.sin(leanRad)
  const leanDy = Math.cos(leanRad)
  const neckBase: [number, number] = [hipX + leanDx * SEG.torsoLen, hipY - leanDy * SEG.torsoLen]
  const headCenter: [number, number] = [
    hipX + leanDx * (SEG.torsoLen + SEG.neckLen + SEG.headR),
    hipY - leanDy * (SEG.torsoLen + SEG.neckLen + SEG.headR),
  ]
  const shoulderX = neckBase[0]
  const shoulderY = neckBase[1]

  // 手臂：静止时自然下垂（90°）。侧视前抬为正（0=下垂，90=前平举）；
  // 正视前抬在画面外，用小幅外展近似（+静态外张 5° 避免与躯干贴合）；肘屈曲带动前臂上折
  const makeArm = (shoulderAng: number, elbowAng: number, mirror: 1 | -1) => {
    const upper = isSide ? 90 - shoulderAng : 90 + shoulderAng * 0.3 * mirror + mirror * 5
    const [ex, ey] = polar(shoulderX, shoulderY, SEG.upperArm, upper)
    const fore = isSide ? upper - elbowAng : upper - elbowAng * 0.55 * mirror
    const [hx, hy] = polar(ex, ey, SEG.forearm, fore)
    return { elbow: [ex, ey] as [number, number], hand: [hx, hy] as [number, number] }
  }

  // 腿：侧视前抬为正（90°-hipFlex），小腿顺膝屈曲向后下垂（thigh+knee）；
  // 正视髋屈曲使大腿透视缩短，仅抬起腿小幅外展，支撑腿垂直（脚不滑动）
  const makeLeg = (hipFlex: number, knee: number, lift: number, mirror: 1 | -1) => {
    if (isSide) {
      const thighAngle = 90 - hipFlex
      const [kx, ky] = polar(hipX, hipY, SEG.thigh, thighAngle)
      const shinAngle = thighAngle + knee
      const [ax, ay] = polar(kx, ky, SEG.shin, shinAngle)
      return { knee: [kx, ky] as [number, number], ankle: [ax, ay] as [number, number] }
    }
    const tilt = lift > 0 ? lift * 9 : 0
    const thighAngle = 90 + tilt * mirror
    const effThigh = SEG.thigh * Math.max(Math.cos((hipFlex * Math.PI) / 180), 0.25)
    const [kx, ky] = polar(hipX, hipY, effThigh, thighAngle)
    const shinAngle = 90 + (thighAngle - 90) * 0.2 - knee * 0.12
    const [ax, ay] = polar(kx, ky, SEG.shin, shinAngle)
    return { knee: [kx, ky] as [number, number], ankle: [ax, ay] as [number, number] }
  }

  return {
    hipX,
    hipY,
    neckBase,
    headCenter,
    shoulderX,
    shoulderY,
    armL: makeArm(pose.shoulderL, pose.elbowL, 1),
    armR: makeArm(pose.shoulderR, pose.elbowR, -1),
    legL: makeLeg(pose.hipFlexL, pose.kneeL, Math.max(pose.footLift, 0), 1),
    legR: makeLeg(pose.hipFlexR, pose.kneeR, Math.max(-pose.footLift, 0), -1),
  }
}

interface Props {
  pose: Pose
  view: 'front' | 'side'
  highlight?: BodyPartHighlight
  /** 是否绘制额外道具（由上层用 children 注入） */
  children?: React.ReactNode
  className?: string
}

/** 单个人物渲染：mono 传入时以单色剪影绘制（站立参考虚影用） */
function Figure({ rig, view, mono }: { rig: Rig; view: 'front' | 'side'; mono?: string }) {
  const isSide = view === 'side'
  const col = (c: string) => mono ?? c
  const { hipX, hipY, neckBase, headCenter, shoulderX, shoulderY } = rig

  // 肢体挂点：正视时肩/髋左右分开，侧视共用中轴（远侧肢体加微小偏移做深度）
  const shoulderPt = (mirror: 1 | -1): [number, number] =>
    isSide ? [shoulderX, shoulderY] : [shoulderX - mirror * 8, shoulderY + 1.5]
  const hipPt = (mirror: 1 | -1, far: boolean): [number, number] => {
    if (isSide) return far ? [hipX - 2, hipY + 0.5] : [hipX, hipY]
    return [hipX - mirror * 4.5, hipY]
  }
  const shift = (p: [number, number], d: [number, number]): [number, number] => [p[0] + d[0], p[1] + d[1]]

  const seg = (pts: [number, number][], color: string, w: number) => (
    <path
      d={`M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}`}
      fill="none"
      stroke={col(color)}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
  const along = (a: [number, number], b: [number, number], t: number): [number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ]
  const dot = (p: [number, number], color: string, r: number) => <circle cx={p[0]} cy={p[1]} r={r} fill={col(color)} />

  // 手臂 = 肤色整臂 + 半截衣袖 + 手
  const drawArm = (mirror: 1 | -1, arm: { elbow: [number, number]; hand: [number, number] }, far: boolean) => {
    const anchor = shoulderPt(mirror)
    const d: [number, number] = [anchor[0] - shoulderX, anchor[1] - shoulderY]
    const elbow = shift(arm.elbow, d)
    const hand = shift(arm.hand, d)
    return (
      <g>
        {seg([anchor, elbow, hand], far ? C.skinDim : C.skin, 6.5)}
        {seg([anchor, along(anchor, elbow, 0.5)], far ? C.shirtDim : C.shirt, 8.5)}
        {dot(hand, far ? C.skinDim : C.skin, 2.9)}
      </g>
    )
  }

  // 腿 = 肤色整腿 + 短裤 + 球鞋
  const drawLeg = (mirror: 1 | -1, leg: { knee: [number, number]; ankle: [number, number] }, far: boolean) => {
    const anchor = hipPt(mirror, far)
    const d: [number, number] = [anchor[0] - hipX, anchor[1] - hipY]
    const knee = shift(leg.knee, d)
    const ankle = shift(leg.ankle, d)
    const shoeDx = isSide ? 7.5 : mirror * 1.5
    return (
      <g>
        {seg([anchor, knee, ankle], far ? C.skinDim : C.skin, 8)}
        {seg([anchor, along(anchor, knee, 0.38)], far ? C.shortsDim : C.shorts, 10.5)}
        {seg([ankle, [ankle[0] + shoeDx, ankle[1] + 2.2]], far ? C.shoeDim : C.shoe, 5.5)}
      </g>
    )
  }

  // 躯干 = 上衣胶囊 + 颈部
  const drawTorso = () => (
    <g>
      {seg([neckBase, [hipX, hipY]], C.shirt, 17.5)}
      {seg([neckBase, along(neckBase, headCenter, 0.55)], C.skin, 5)}
    </g>
  )

  // 头 = 后层头发 + 前层脸（侧视偏前形成侧脸轮廓，正视偏下露出发际线→短发造型）
  const drawHead = () => {
    const hairC: [number, number] = isSide
      ? [headCenter[0] - 3, headCenter[1] - 1]
      : [headCenter[0], headCenter[1] - 2.6]
    const faceC: [number, number] = isSide
      ? [headCenter[0] + 2.4, headCenter[1] + 0.8]
      : [headCenter[0], headCenter[1] + 2]
    return (
      <g>
        {dot(hairC, C.hair, SEG.headR + 0.5)}
        {dot(faceC, C.skin, isSide ? SEG.headR - 1.6 : SEG.headR - 2)}
      </g>
    )
  }

  // 绘制顺序：远侧 → 躯干/头 → 近侧（制造前后层次）
  return isSide ? (
    <>
      {drawArm(-1, rig.armR, true)}
      {drawLeg(-1, rig.legR, true)}
      {drawLeg(1, rig.legL, false)}
      {drawTorso()}
      {drawHead()}
      {drawArm(1, rig.armL, false)}
    </>
  ) : (
    <>
      {drawArm(1, rig.armL, true)}
      {drawLeg(1, rig.legL, true)}
      {drawLeg(-1, rig.legR, false)}
      {drawTorso()}
      {drawHead()}
      {drawArm(-1, rig.armR, false)}
    </>
  )
}

export default function StickFigure({ pose, view, children, className }: Props) {
  const rig = buildRig(pose, view === 'side')
  const ghostRig = buildRig(STAND_POSE, view === 'side')

  return (
    <svg viewBox="0 0 200 200" className={className} style={{ display: 'block' }}>
      {/* 地垫 */}
      <ellipse cx="100" cy="180" rx="70" ry="8" fill="#15161A" stroke="#26282E" strokeWidth="1" />

      {children}

      {/* 站立参考：同款单色剪影（展示动作起止范围） */}
      <g opacity={0.13}>
        <Figure rig={ghostRig} view={view} mono="#9AA0A8" />
      </g>

      {/* 当前姿态：扁平插画小人 */}
      <Figure rig={rig} view={view} />
    </svg>
  )
}
