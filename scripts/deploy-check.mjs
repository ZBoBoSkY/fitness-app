#!/usr/bin/env node
// scripts/deploy-check.mjs
// 推送前 / 部署前的合规检查。存在 ❌ 项时以非零退出，阻止 push。
// 用法：
//   本地手动：  node scripts/deploy-check.mjs
//   pre-push：  node scripts/deploy-check.mjs --skip-build
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const skipBuild = process.argv.includes('--skip-build')

let pass = 0, fail = 0, warn = 0
const ok = m => { console.log('✅ ' + m); pass++ }
const bad = m => { console.log('❌ ' + m); fail++ }
const war = m => { console.log('⚠️  ' + m); warn++ }

function run(cmd) {
  try {
    return { code: 0, out: execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' }) }
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') }
  }
}

console.log('=== deploy-check 开始 ===\n')

// [1] 可达性：只用 git ls-remote，绝不用 curl
console.log('[1/6] GitHub 可达性（git ls-remote origin HEAD）')
const ls = run('git ls-remote origin HEAD')
if (ls.code === 0 && ls.out.trim().length) ok('origin 可达')
else bad('git ls-remote origin HEAD 失败——GitHub 不可达或 remote 未配置（不要用 curl 判断）')

// [2] gh 登录与 workflow 权限
console.log('\n[2/6] gh 登录与 workflow 权限')
const gh = run('gh auth status 2>&1')
if (gh.code !== 0 && !gh.out.trim()) {
  war('未检测到 gh 命令——若用 SSH/OAuth 凭据推送可忽略；否则请先 `gh auth login -s workflow`')
} else if (/workflow/i.test(gh.out)) {
  ok('gh 已登录且含 workflow 权限')
} else {
  bad('gh 缺少 workflow scope——运行 `gh auth refresh -s workflow`')
}

// [3] 平台专属依赖（防止 Windows 装进 Linux CI）
console.log('\n[3/6] 平台专属依赖检查')
let pkg = {}
try { pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) } catch { bad('无法读取 package.json') }
const deps = pkg.dependencies || {}
const dev = pkg.devDependencies || {}
const plat = Object.keys(deps).filter(k => /^@(esbuild|rollup|swc)\//.test(k) && /(win32|linux|darwin|musl)/.test(k))
if (plat.length) bad('dependencies 中发现了平台专属包：' + plat.join(', '))
else ok('dependencies 中无显式平台专属包')

// [4] 构建工具位置：必须在 devDependencies
console.log('\n[4/6] 构建工具位置（应在 devDependencies）')
const mis = ['vite', 'esbuild', 'typescript'].filter(t => deps[t])
if (mis.length) bad('构建工具误放在 dependencies：' + mis.join(', ') + '（移到 devDependencies）')
else ok('vite/esbuild/typescript 均在 devDependencies')
if (deps['gh-pages'] || dev['gh-pages']) bad('仍存在 gh-pages 依赖——部署走 Actions，不需 gh-pages')
else ok('无 gh-pages 依赖')

// [5] Pages 来源与部署路径
console.log('\n[5/6] Pages 来源与部署路径')
const wfDir = join(root, '.github', 'workflows')
if (existsSync(wfDir)) {
  const files = readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f))
  const content = files.map(f => readFileSync(join(wfDir, f), 'utf8')).join('\n')
  if (/gh-pages/.test(content)) bad('workflow 使用了 gh-pages——应改为 Actions Pages 部署')
  else if (/upload-pages-artifact/.test(content) && /deploy-pages/.test(content)) ok('workflow 使用 upload-pages-artifact + deploy-pages')
  else war('未找到标准 Actions Pages 部署配置')
  const m = content.match(/path:\s*(\S+)/)
  if (m && /dist/.test(m[1])) ok('部署 path 指向 ./dist')
  else war('未确认部署 path 为 ./dist')
} else bad('缺少 .github/workflows 目录')
const vitePath = join(root, 'vite.config.ts')
if (existsSync(vitePath)) {
  const v = readFileSync(vitePath, 'utf8')
  const bm = v.match(/base:\s*['"]([^'"]+)['"]/)
  if (bm) {
    if (bm[1] === '/') bad('vite base 为 "/" —— 子路径部署会白屏，改为 "/fitness-app/" 或 "./"')
    else ok('vite base = ' + bm[1] + '（相对 / 子路径，不会白屏）')
  } else war('vite.config 中未找到 base')
} else war('未找到 vite.config.ts')

// [6] 本地构建
console.log('\n[6/6] 本地构建（npm ci && npm run build）')
if (skipBuild) {
  war('已 --skip-build，跳过本地构建（pre-push 场景）')
} else {
  const ci = run('npm ci')
  if (ci.code !== 0) bad('npm ci 失败——依赖不一致，见上方输出')
  else {
    ok('npm ci 成功')
    const b = run('npm run build')
    if (b.code !== 0) bad('npm run build 失败')
    else ok('npm run build 成功')
  }
}

console.log('\n=== 汇总 ===')
console.log(`通过 ${pass} · 失败 ${fail} · 警告 ${warn}`)
if (fail > 0) { console.log('❌ 存在阻断项，禁止 push'); process.exit(1) }
console.log('✅ 检查通过（警告项不阻断，但建议处理）')
process.exit(0)
