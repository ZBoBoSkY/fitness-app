# AGENTS.md — 项目协作规则（写给 WorkBuddy / 协作者）

## Git / 部署规则
- 只用 `git push` 推送。禁止用 GitHub REST API 上传文件、创建 blob/tree/ref。
- 判断 GitHub 是否可达，只用 `git ls-remote origin HEAD`，不要用 `curl`。
- push 失败就停下来，把完整报错贴给我，不要自行绕行，不要向我要令牌。
- 不要改全局 git 配置；代理只用 `git config --local`。
- 装依赖：禁止显式安装 `@esbuild/*` 等平台专属包；vite、esbuild、typescript 等构建工具一律 `--save-dev`。
- 部署只走 GitHub Actions → Pages，不用 `gh-pages` 包，不用 `/docs`。
- 每次 push 前必须运行 `node scripts/deploy-check.mjs`，有 ❌ 不许 push。
