# BUGFIX.md — Bug 修复记录

> 记录项目中发现的 bug、根因分析和修复方案。  
> 详细代码 diff 请查看对应 commit。

---

## Bug #1：i18n 字典硬换行导致整个脚本失效

| | 内容 |
|---|---|
| **现象** | 所有按钮点击无反应，设置面板内容异常 |
| **根因** | `i18n.en.engineNote` 的值包含硬换行符（含 `<br>` 标签），破坏了 JS 对象字面量语法，导致 `<script>` 块解析失败 |
| **修复** | 将 `engineNote` 改为单行纯文本；`updateTexts()` 用 `textContent` 赋值，不保留 HTML 标签 |
| **commit** | `3059de5` |

---

## Bug #2：`let currentLevel` TDZ 导致函数未定义

| | 内容 |
|---|---|
| **现象** | 盲棋练习点击无反应，设置面板文字显示异常 |
| **根因** | `updateTexts()` 中访问了在其之后用 `let` 声明的 `currentLevel`。严格实现 TDZ 的浏览器会抛出 `ReferenceError: Cannot access 'currentLevel' before initialization`，导致整个 `<script>` 中断执行，后续所有函数（`showDifficulty`、`startEngine` 等）均未被定义 |
| **修复** | 从 `updateTexts()` 中移除对 `currentLevel` 的依赖（`diffBadge` 更新已交由 `startEngine()` 处理） |
| **commit** | `8381350` |

---

## Bug #3：引擎加载失败时输入框被永久禁用

| | 内容 |
|---|---|
| **现象** | 用户走一步后输入框变灰，再也无法输入 |
| **根因** | `submitMove()` 中 `input.disabled = true` 在 `engine.setPosition()` 之前执行。若 `engine` 为 `null`（加载失败），`engine.setPosition()` 抛出 `TypeError`，函数中断，输入框永远无法恢复 |
| **修复** | `submitMove()` 中先检查 `!engine || !engine.ready`，若引擎不可用则显示错误并直接返回，不禁用输入框 |
| **commit** | `1170961` |

---

## Bug #4：旧引擎 Worker 在新局中自动走棋

| | 内容 |
|---|---|
| **现象** | 点击"New Game"后，历史记录中莫名其妙多了一步棋 |
| **根因** | `initGame()` 未终止旧引擎的 Worker。旧 Worker 返回上一局的 `bestmove` 时，`handleEngineMove` 被调用，此时 `game` 已是新局，若旧 UCI 与新局某走法匹配，就会在新局中自动走一步 |
| **修复** | `initGame()` 开头添加 `if (engine) { engine.terminate(); engine = null; }` |
| **commit** | `3383b1f` |

---

## Bug #5：盲棋走子与棋盘显示步数不同步（排查中）

| | 内容 |
|---|---|
| **现象** | 盲棋模式下走棋，显示棋盘后发现历史记录与棋盘局面不一致 |
| **可能原因** | ① 引擎 UCI 与 chess.js 合法走法不匹配；② 旧引擎回调干扰（已修复 #4）；③ `renderBoard` 未正确更新 |
| **当前状态** | 已在 `handleEngineMove` 中添加详细日志。需要用户在浏览器 **F12 → Console** 中查看 `Engine UCI not matched` 或 `Engine move failed` 信息 |
| **commit** | `3383b1f`（含日志） |

---

## 复用提醒

这些 bug 的共性教训：

1. **JS `let` 有 TDZ**，访问顺序依赖的变量时优先用 `var` 或提前声明
2. **异步 Worker 必须显式终止**，否则回调会在意外时机触发
3. **操作第三方对象前先做空值检查**（`engine?.ready`），防止 `TypeError` 中断流程
