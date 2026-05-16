# STATE.md — 动态状态备份

> 本文件记录项目的实时进度和当前上下文。
> 每次会话结束时，通过 **"存档"** 口令更新并推送。

---

## 当前会话摘要

- **日期**：2026-05-16
- **内容**：
  1. 修复多个关键兼容性 bug（TDZ、引擎空指针、旧 Worker 回调）
  2. 排查"步数不同步"问题（添加日志，待用户反馈控制台信息）
  3. 用户要求记录关键问题和修复逻辑
- **参与**：用户 + AI

---

## 开发进度

- [x] GitHub 仓库已创建并连接（https://github.com/MichaelGao-watcher/blindfold-chess）
- [x] GitHub Pages 自动部署
- [x] MPChess SVG 棋子 + Grey 棋盘配色
- [x] 9×9 棋盘坐标（rank + file）
- [x] 设置面板（主题切换 + 语言切换）
- [x] 全站 i18n（中英双语，~60 个文本项）
- [x] Stockfish 18 集成（Blob Worker fallback）
- [x] 难度映射：easy/medium/hard/expert
- [x] 走法输入规范化（normalizeMove）
- [x] 终局处理（将杀、逼和、和棋）
- [ ] "坐标练习"仍为占位模式

---

## 关键 Bug 修复记录

### Bug #1：i18n 字典硬换行导致整个脚本失效 ❌ → ✅

| 项目 | 内容 |
|------|------|
| **现象** | 所有按钮点击无反应，设置面板内容异常 |
| **根因** | `i18n.en.engineNote` 的值包含硬换行符（`<br>` 标签换行），破坏了 JS 对象字面量语法 |
| **修复** | 将 `engineNote` 改为单行纯文本；`updateTexts()` 用 `textContent` 赋值，不保留 HTML 标签 |
| **commit** | `3059de5` |

### Bug #2：`let currentLevel` TDZ 导致函数未定义 ❌ → ✅

| 项目 | 内容 |
|------|------|
| **现象** | 盲棋练习点击无反应，设置面板文字显示异常 |
| **根因** | `updateTexts()` 中访问了在其之后用 `let` 声明的 `currentLevel`，触发 **Temporal Dead Zone (TDZ)**。某些浏览器严格实现 TDZ，抛出 `ReferenceError`，导致整个 `<script>` 中断执行，后续所有函数（`showDifficulty`、`startEngine` 等）均未被定义 |
| **修复** | 从 `updateTexts()` 中删除对 `currentLevel` 的依赖（`diffBadge` 更新已交由 `startEngine()` 处理）。`currentLevel` 保持在原位不动 |
| **commit** | `8381350` |

### Bug #3：引擎加载失败时输入框被永久禁用 ❌ → ✅

| 项目 | 内容 |
|------|------|
| **现象** | 用户走一步后输入框变灰，再也无法输入，"点都点不开" |
| **根因** | `submitMove()` 中 `input.disabled = true` 在 `engine.setPosition()` 之前执行。若 `engine` 为 `null`（加载失败），`engine.setPosition()` 抛出 `TypeError`，函数中断，输入框永远无法恢复 |
| **修复** | `submitMove()` 中先检查 `!engine || !engine.ready`，若引擎不可用则显示错误并直接返回，不禁用输入框 |
| **commit** | `1170961` |

### Bug #4：旧引擎 Worker 在新局中自动走棋 ❌ → ✅

| 项目 | 内容 |
|------|------|
| **现象** | 点击"New Game"后，历史记录中莫名其妙多了一步棋 |
| **根因** | `initGame()` 未终止旧引擎的 Worker。旧 Worker 返回上一局的 `bestmove` 时，`handleEngineMove` 被调用，此时 `game` 已是新局，若旧 UCI 与新局某走法匹配，就会在新局中自动走一步 |
| **修复** | `initGame()` 开头添加 `if (engine) { engine.terminate(); engine = null; }` |
| **commit** | `3383b1f` |

### Bug #5：盲棋走子与棋盘显示步数不同步 ❓（排查中）

| 项目 | 内容 |
|------|------|
| **现象** | 盲棋模式下走棋，显示棋盘后发现历史记录与棋盘局面不一致 |
| **可能原因** | ① 引擎 UCI 与 chess.js 合法走法不匹配（已加日志）；② 旧引擎回调干扰（已修复 #4）；③ `renderBoard` 未正确更新（待确认） |
| **当前状态** | 已在 `handleEngineMove` 中添加详细日志：`Engine UCI not matched` / `Engine move failed`。需要用户在浏览器 **F12 → Console** 中查看报错信息 |
| **commit** | `3383b1f`（含日志） |

---

## 待办列表

1. 等待用户提供 Bug #5（步数不同步）的控制台日志，以便精确定位
2. 实现"坐标练习"功能（目前为占位）
3. 考虑 Stockfish CDN 国内访问问题（unpkg 间歇性被墙）

---

## 已知限制 / 注意事项

| 问题 | 说明 |
|------|------|
| GitHub Pages 国内访问 | `github.io` 部分网络 DNS 污染，需代理/VPN |
| Stockfish CDN | 从 `unpkg.com` 加载，国内网络可能间歇性无法访问 |
| `file://` 协议 | 禁止 Web Worker，本地测试**必须用 HTTP 服务器**（`python3 -m http.server`） |
| 游戏中切换语言 | `diffBadge` 不会自动更新（边缘场景，低优先级） |

---

## 技术决策（不变）

- 纯 HTML + CSS + JS，不引入框架
- chess.js v0.13.4（UMD 格式，浏览器全局可用）
- Stockfish 18 lite-single（单线程，兼容 GitHub Pages）
- MPChess SVG 棋子（固定风格，不切换）
- Grey 棋盘配色（`#b0b0b0` / `#808080`）
