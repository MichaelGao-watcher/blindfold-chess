# STATE.md — 动态状态备份

> 本文件记录当前会话上下文和待办事项，帮助新 AI 会话快速恢复。
> 详细修改历史请查看 git log。

---

## 当前会话摘要

- **日期**：2026-05-17
- **状态**：
  1. 用户确认学习策略：在盲棋项目内建立 `learning/` 学习区，与产品代码隔离
  2. 新建 `learning/index.html` + `learning/notes.md` + `learning/exercises/`
  3. **大手术完成**：`index.html` 拆分为主结构 + `css/style.css` + `js/common.js` + `js/engine.js` + `js/game.js` + `js/coordinate.js` + `js/main.js`
  4. 拆分后全部功能测试通过（盲棋对战、坐标练习、设置面板、入门指南）
  5. `learning/` 区域完全独立，可随意创建文档/练习而不影响主项目
  6. 走子音效已实现（Web Audio API，用户走棋 + 引擎走棋时播放）
  7. PGN 显示已实现（对局结束后结果卡片显示完整 PGN 走法记录 + 复制按钮）
  8. 执黑反转已实现（坐标练习选执黑时，棋盘和坐标标注从黑方视角显示）
- **部署**：https://michaelgao-watcher.github.io/blindfold-chess/

---

## 开发进度

- [x] GitHub 仓库 + Pages 自动部署
- [x] MPChess SVG 棋子 + Grey 棋盘 + 坐标标注
- [x] 设置面板（主题/语言切换）+ 全站 i18n
- [x] Stockfish 18 引擎集成
- [x] 难度选择 + 走法输入 + 终局判定
- [x] 坐标练习（A/B 模式 + 计时挑战 + 全屏棋盘 + 震动反馈）
- [x] ~~棋子记忆练习（P2）~~ **已移除**，用户决定暂不做
- [ ] 盲棋复盘（P3，`proposal.md` 已定义，待开发）
- [ ] 品牌感欢迎页（视觉风格待确认）
- [ ] Bug #5：步数不同步（已加日志，待用户控制台反馈）
- [ ] 坐标练习执黑视角（已实现，待用户长期测试稳定性）

---

## 待办列表

1. 用户提供 Bug #5 的控制台日志后，精确定位修复
2. 盲棋复盘功能开发（P3）
3. 品牌感欢迎页设计（需确认视觉风格）
4. 退出幽默台词文案（待用户提供或确认）

---

## 已知限制

- GitHub Pages 国内需代理；Stockfish 从 unpkg 加载，国内可能超时
- 本地测试必须用 HTTP 服务器（`file://` 禁止 Web Worker）
- 本次会话所有修改已本地保存，待 push

---

## 最近决策 / 变更

| 日期 | 决策 |
|------|------|
| 2026-05-17 | 新建 `learning/` 学习区：与产品代码隔离，支持主题同步、随手记（localStorage）、练习目录 |
| 2026-05-17 | 学习策略确认：零散知识点 → `notes.md` + 网页随手记；实战练习 → `exercises/xxx.html` |
| 2026-05-16 | 新增 `BUGFIX.md` 集中记录 bug 和修复方案 |
| 2026-05-16 | 新增 `proposal.md` 明确产品需求、功能边界和优先级 |
| 2026-05-16 | `AGENTS.md` 增加硬性规则：用户无编程背景，AI 必须通过提问确认需求 |
| 2026-05-17 | `AGENTS.md` 新增实验区工作流规则：`learning/` 是实验区，根目录是生产区，实验功能经用户确认后才迁移 |
| 2026-05-17 | 大手术拆分：`index.html` → `css/style.css` + `js/common.js` + `js/engine.js` + `js/game.js` + `js/coordinate.js` + `js/main.js` |
| 2026-05-17 | 走子音效（Web Audio API）+ PGN 显示与复制 + 坐标练习执黑视角反转 |
| 2026-05-16 | 坐标练习支持 A/B 两种玩法 + 计时挑战 + 全屏棋盘 + 错误震动反馈 |
| 2026-05-16 | `proposal.md` 确认 8 项决策（见文档第 8 节） |
