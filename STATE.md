# STATE.md — 动态状态备份

> 本文件记录当前会话上下文和待办事项，帮助新 AI 会话快速恢复。
> 详细修改历史请查看 git log。

---

## 当前会话摘要

- **日期**：2026-05-17
- **状态**：
  1. 第1批（底座层）全部完成：TestRunner、StorageModule、BoardRenderer、EngineModule
  2. 第2批（核心功能）全部完成：WelcomeModule、GuideModule、BlindfoldModule、CoordinateModule
  3. 所有模块均附带完整 Node.js 测试，总计 **80/80 测试通过**
  4. 修复了新旧代码交接导致的网页交互断裂（main.js 初始化调用、EngineManager 兼容层等）
  5. index.html 已可正常预览使用（欢迎页/盲棋对战/坐标练习/指南）
  6. `docs/notes.md` 新增"分批次开发环境选择策略"和"CLI 并行提示词模板"
  7. 用户确认第4批（StatsModule/ReplayModule/ExitModule）尝试用 CLI 并行跑
- **部署**：https://michaelgao-watcher.github.io/blindfold-chess/

---

## 开发进度

### 第1批（底座层）✅ 已完成
- [x] TestRunner（7/7 passed）
- [x] StorageModule（28/28 passed）
- [x] BoardRenderer（28/28 passed）
- [x] EngineModule（19/19 passed）

### 第2批（核心功能）✅ 已完成
- [x] WelcomeModule（18/18 passed）
- [x] GuideModule（20/20 passed）
- [x] BlindfoldModule（26/26 passed）
- [x] CoordinateModule（16/16 passed）

### 第3批（系统整合）⏳ 待执行
- [ ] SettingsModule（从 common.js 提取主题/语言/音效/引擎配置）

### 第4批（扩展功能）📋 规划中
- [ ] StatsModule
- [ ] ReplayModule
- [ ] ExitModule

### 历史功能（已存在）
- [x] GitHub 仓库 + Pages 自动部署
- [x] MPChess SVG 棋子 + Grey 棋盘 + 坐标标注
- [x] 设置面板（主题/语言切换）+ 全站 i18n
- [x] Stockfish 18 引擎集成
- [x] 难度选择 + 走法输入 + 终局判定
- [x] 坐标练习（A/B 模式 + 计时挑战 + 执黑视角 + 震动反馈）
- [x] 走子音效（Web Audio API）
- [x] PGN 显示与复制

---

## 待办列表

1. 第3批：SettingsModule（IDE 串行）
2. 第4批：StatsModule + ReplayModule + ExitModule（CLI 并行尝试）
3. 全局入口 main.js 完善：按模块初始化顺序统一调用各 init()
4. 旧代码清理：common.js / game.js 中的旧全局函数逐步移除

---

## 已知限制

- GitHub Pages 国内需代理；Stockfish 从 unpkg 加载，国内可能超时
- 本地测试必须用 HTTP 服务器（`file://` 禁止 Web Worker）
- 旧代码（common.js / game.js）与新模块并存，逐步迁移中
- 引擎候选走法（goMultiPv）尚未集成到 BlindfoldModule UI

---

## 最近决策 / 变更

| 日期 | 决策 |
|------|------|
| 2026-05-17 | 第2批全部完成：WelcomeModule、GuideModule、BlindfoldModule、CoordinateModule（80/80 测试通过） |
| 2026-05-17 | 修复网页交互断裂：main.js 调用各模块 init()、EngineManager 兼容层、selectMode 桥接 |
| 2026-05-17 | notes.md 新增"分批次开发环境选择策略"和"CLI 并行提示词模板" |
| 2026-05-17 | 第1批全部完成：TestRunner、StorageModule、BoardRenderer、EngineModule |
| 2026-05-17 | 概要设计文档 `docs/high-Level Design.md` 完成：12个功能域模块 |
| 2026-05-17 | 大手术拆分：`index.html` → `css/style.css` + `js/common.js` + `js/engine.js` + `js/game.js` + `js/coordinate.js` + `js/main.js` |

---

*上次更新：2026-05-17 第2批完成存档*
