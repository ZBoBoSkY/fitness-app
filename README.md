# 居家减脂打卡 App

只给自己用的健身打卡 App：Vite + React + TypeScript，纯前端、离线可用、可安装到手机桌面。

## 功能

- 本日计划：日期条切换、计划卡片、圆环进度、动作分组、逐组打勾
- 动作详情：火柴人动画（可暂停/重播）、动作要点四卡、替代动作、重量/次数/疼痛记录
- 计时与声音：组间休息倒计时、计时动作倒计时、滴答声开关（Web Audio）、震动提示
- 记录：按周看完成率、体重/腰围折线、导出 JSON
- 屏幕常亮（训练时）、Service Worker 离线、可添加到主屏幕
- App 内导入新 plan.json 替换计划

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173

## 构建

```bash
npm run build
```

产物在 `dist/`，可部署到任意静态服务器（GitHub Pages、群晖 NAS 等）。

## 部署到 GitHub Pages

1. 把本项目推到 GitHub 仓库的 `main` 分支
2. 在仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 推送后会自动构建部署，`deploy.yml` 已配置好

> 注意：`vite.config.ts` 里 `base: './'` 是相对路径，适用于 Pages 子路径部署。

## 在安卓手机上打开并添加到桌面

**方式一：GitHub Pages（推荐）**
1. 部署完成后，用手机浏览器（Chrome / OPPO 浏览器）打开 Pages 链接（HTTPS）
2. Chrome：地址栏右侧或菜单里点「安装应用 / 添加到主屏幕」
3. OPPO 浏览器：菜单 →「添加到桌面 / 添加书签到主屏」
4. 桌面出现图标，点开即可全屏运行，离线也能用

**方式二：群晖 NAS（内网）**
1. 把 `dist/` 目录放到群晖 Web Station 的站点目录（或 Docker 跑 nginx 静态服务）
2. 访问 `http://NAS-IP:端口`
3. ⚠️ 关键：Service Worker 只能在 HTTPS 或 localhost 下注册。内网 HTTP 无法「添加到主屏幕」离线用。
4. 解决办法：在群晖「控制面板 → 安全性 → 证书」给该站点配置 HTTPS 证书（Let's Encrypt 或自签），再用「反向代理」把内网站点套上 HTTPS，即可正常安装为 PWA。

## 替换训练计划（plan.json）

两种方式：

**方式一：App 内导入（最方便）**
1. 打开 App → 底部「设置」
2. 点「选择 plan.json」，选中新的计划文件
3. 导入后立即生效，并持久保存在手机本地（IndexedDB）

**方式二：替换源文件**
1. 用新的 `plan.json` 覆盖 `public/plan.json`
2. 重新 `npm run build` 并部署
3. 在设置页点「恢复默认计划」可回到新计划

## plan.json 结构说明

```jsonc
{
  "plan": {
    "name": "计划名",
    "startDate": "2026-10-12",   // 第 1 天对应的真实日期
    "weeks": 4,
    "goal": "目标",
    "nutrition": { "kcal": "1800-2000", "proteinG": "100-125", "note": "..." },
    "progression": ["每周进阶说明"]
  },
  "days": [
    {
      "week": 1,
      "weekday": 1,        // 1=周一 ... 7=周日
      "dayIndex": 1,       // 全局递增
      "type": "strength",  // strength | cardio | recovery | rest
      "title": "全身力量 A",
      "subtitle": "...",
      "durationMin": [40, 45],
      "reminder": "...",
      "choices": ["选项1", "选项2"],   // 可选，有氧日二选一
      "sections": [
        {
          "name": "热身",
          "items": [
            {
              "id": "easy-march",
              "name": "原地轻松踏步",
              "sets": 1,
              "reps": null,          // 计时类为 null
              "durationSec": 120,    // 计时类填秒数
              "timed": true,
              "load": "自重",
              "restSec": 0,
              "note": "...",
              "alt": "替代动作",
              "cues": { "setup": "...", "drive": "...", "tempo": "...", "mistakes": "..." },
              "animation": { "view": "front", "keyframes": ["..."], "highlight": ["calves"] }
            }
          ]
        }
      ]
    }
  ]
}
```

## 技术栈

- Vite + React 18 + TypeScript
- react-router-dom（Hash 路由）
- vite-plugin-pwa（Service Worker + manifest）
- IndexedDB（原生，无额外库）
- Web Audio API（滴答声/提示音）+ Screen Wake Lock API
- 自研 SVG 火柴人骨骼动画（关节角度关键帧插值）
