# 学习笔记 — Vibe Coding 实战记录

> 这里是你的零散知识点记录区。想到什么写什么，不用讲究格式。  
> 更正式的练习请创建 `exercises/xxx.html` 文件，随手记可以用上面的网页直接保存。

---

## 📌 今日学到

### 2026-05-17

**Python 生态（了解即可，本项目用不上）**
- `mypy`：Python 静态类型检查器。在代码运行前检查类型是否匹配（比如把字符串传给需要数字的参数）。**本项目纯 JS，用不上。**
- `ruff`：Python 语法检查 + 自动格式化工具。检查缩进、空行、命名规范等。**本项目用不上。**
- `pytest`：Python 最流行的单元测试框架。写测试用例验证函数输出是否正确。**本项目没有 Python 后端，用不上。**

**JavaScript 生态（前端项目的质量工具）**
对应 Python 三件套，JS 也有类似工具：

| Python 工具 | JS 对应工具 | 作用 |
|-------------|-------------|------|
| mypy | TypeScript / JSDoc + `tsc` | 类型检查。TS 是 JS 的超集，加了类型系统；也可以用 JSDoc 注释给 JS 加类型 |
| ruff | **ESLint** + **Prettier** | ESLint 检查语法错误和风格问题；Prettier 自动格式化代码（缩进、换行、引号统一） |
| pytest | **Jest** / **Vitest** / **Mocha** | 单元测试框架。验证函数输入输出是否符合预期 |

> **本项目现状**：目前是纯手写 HTML/CSS/JS，没有构建工具。引入 ESLint/Prettier/Jest 需要 npm（包管理器），会增加复杂度。AGENTS.md 规定暂不引入框架和构建工具，所以这些工具先了解、不急着用。

**浏览器安全机制**
- 网页里的 JavaScript **不能直接读写电脑上的文件**（安全沙箱机制）
- 所以 `docs/index.html` 的随手记只能存在浏览器的 `localStorage` 里，无法自动同步到 `notes.md`
- 解决方案：重要笔记让 AI 整理到 `notes.md`，网页随手记只记临时草稿

---

### 2026-05-17 晚 — 项目大手术（代码拆分）

**为什么要拆？**
- `index.html` 长到 1426 行，HTML + CSS + JS 全混在一起
- 改了东边西边坏，因为所有变量和函数都在同一个"全局空间"里
- 加新功能越来越痛苦

**拆成了什么？**
| 文件 | 职责 | 行数 |
|------|------|------|
| `index.html` | 纯 HTML 结构 | 239 |
| `css/style.css` | 所有样式 | 382 |
| `js/common.js` | 翻译、主题、设置面板、页面路由 | 287 |
| `js/engine.js` | Stockfish 引擎通信 | 105 |
| `js/game.js` | 盲棋对战（走法、棋盘、历史、终局） | 227 |
| `js/coordinate.js` | 坐标练习 | 169 |
| `js/main.js` | 入口初始化 | 8 |

**学到的概念**
- **全局变量污染**：所有没在函数里声明的变量都会变成 `window` 对象的属性，任何地方都能改，容易互相干扰
- **物理隔离 ≠ 逻辑隔离**：拆成多个文件后，变量仍然是全局的，只是代码在不同文件里。真正的隔离需要后面学"模块"或"闭包"
- **加载顺序很重要**：`common.js` 必须先加载，因为 `game.js` 和 `coordinate.js` 都依赖它的 `t()` 函数
- **`<script src="...">`**：在 HTML 底部按顺序引入 JS 文件，浏览器会按顺序加载执行

**走子音效实现**
- 用 **Web Audio API** 生成合成音效，不需要外部音频文件
- `AudioContext` 是浏览器内置的音频引擎，可以生成正弦波、方波等声音
- 浏览器安全策略：音频上下文在用户首次交互（点击/按键）前处于 `suspended` 状态，需要调用 `resume()` 激活
- 音效参数：频率从 600Hz 降到 300Hz，音量从 0.08 降到 0，持续 0.12 秒，形成一声短促的"滴"

**PGN 显示**
- PGN（Portable Game Notation）是国际象棋标准对局记录格式
- chess.js 自带 `.pgn()` 方法，可生成走法列表字符串
- 手动拼接 PGN Header（Event, Site, Date, White, Black, Result）
- 用 `<pre>` 标签显示，保持换行和空格格式
- 用 `navigator.clipboard.writeText()` 实现一键复制，旧浏览器用 `document.execCommand('copy')` fallback

**执黑反转（棋盘视角切换）**
- 白方视角：a1 在左下角，h8 在右上角，rank 从上到下是 8→1
- 黑方视角：a1 在右上角，h8 在左下角，rank 从上到下是 1→8，file 从左到右是 h→a
- 实现方式：不改变 data-square 的值（坐标名称不变），只改变渲染时的行列顺序
- 坐标标注（row-labels 和 col-labels）用 JS 动态更新，与棋盘渲染同步

---

## ❓ 待解决的疑问

- [ ] 

---

## 💡 突然明白的道理

- 

---

## 🔗 常用参考

| 概念 | 我的理解 |
|------|---------|
| HTML | 网页的骨架，定义有什么元素（按钮、文本框、棋盘） |
| CSS | 网页的皮肤，定义长什么样（颜色、大小、位置、动画） |
| JavaScript (JS) | 网页的大脑，定义能做什么（点击后发生什么、数据怎么变） |
| `console.log()` | 在浏览器的"控制台"里打印信息，用来调试 |
| `let` vs `const` | `let` 可以重新赋值，`const` 一旦设定不能改 |
| `function` | 把一段代码包起来，取个名字，以后可以反复调用 |
| `document.getElementById()` | 通过 ID 找到网页上的某个元素 |
| `addEventListener('click', ...)` | 给某个元素加上"被点击时做什么" |

---

---

## 🤖 AI 新会话启动指令模板

> 经验：当项目复杂到需要多轮会话完成时，**每开一个新会话，必须先让 AI 读取完整的上下文文件**，否则 AI 会失忆、重复确认、甚至破坏已有成果。

### 为什么需要这个模板？

每次新开 AI 会话 = AI 失忆，它不知道：
- 项目架构是什么
- 哪些决策已经确认了
- 当前做到第几步
- 代码规范是什么

**没有上下文的 AI = 盲人摸象，大概率返工。**

### 通用启动指令框架

```
请按以下顺序阅读文件，建立完整上下文后开始执行：

【1】项目规则与规范
- {项目根}/AGENTS.md（AI 行为约束）
- {项目根}/prompt.md（如果有的话，主指令文件）

【2】动态状态（断点续作）
- {项目根}/STATE.md（当前进度、进行中任务）
- {项目根}/docs/tasks/task-progress.md（模块完成状态）

【3】设计依据
- {项目根}/docs/high-Level Design.md（架构设计）
- {项目根}/docs/proposal.md（需求文档）

【4】现有代码（如需修改）
- {相关代码文件路径}

你是 {角色：主Agent / subAgent}，按 prompt.md 规范执行：
- 当前批次：第 X 批（...）
- 当前模块：{模块名}
- 你的任务：{具体做什么}
```

### 关键原则

| 原则 | 说明 |
|------|------|
| **先读后做** | 让 AI 读完所有参考文件再动手，不要边读边猜 |
| **文件路径用绝对路径** | 避免 AI 在错误目录找文件（Windows 尤其容易迷路） |
| **明确角色** | 告诉 AI 它是主Agent还是subAgent，职责不同 |
| **指明批次和模块** | 防止 AI 从头开始做或跳到错误的模块 |
| **附上已完成清单** | 如果 mid-work 断点续作，告诉 AI 哪些模块已完成 |

### 本项目的实例

**场景：盲棋项目，新会话继续开发**

```
请阅读以下文件，建立完整上下文后开始执行：

1. D:\Vibe-Code\blindfold-chess\prompt.md（主指令，含架构和开发规范）
2. D:\Vibe-Code\blindfold-chess\docs\tasks\task-progress.md（当前完成进度）
3. D:\Vibe-Code\blindfold-chess\docs\high-Level Design.md（模块详细设计）

你是主 Agent，按 prompt.md 规范：
- 当前批次：第 X 批（底座层/核心功能/系统整合/扩展功能）
- 当前进行中的模块：{模块名}
- 已完成的模块：{模块A, 模块B, ...}
- 你的任务：调度 subAgent 实现 {当前模块}，验收通过后更新进度，再派发下一个
```

### 保存位置

- 通用框架：记在 `docs/notes.md`（本文件）
- 项目专用实例：记在 `prompt.md` 末尾作为附录
- **每次新会话直接复制粘贴上面的实例**，替换批次和模块名即可

---

## 🔄 Vibe Coding 四阶段工作流（本项目完整流程）

> 记录我们是怎么一步步从"有个想法"走到"生成执行 prompt"的。以后新项目可以照搬这个流程。

### 阶段一：讨论需求

**目标**：把模糊的想法变成清晰的需求文档

**输入**：用户对项目的理解（口语化描述）

**输出**：`docs/proposal.md`

**AI 行为规范**：
- 用提问方式帮助用户确认需求
- **绝不猜测用户意图**
- 所有不明确的地方必须提问
- 用户没有编程背景，用大白话解释技术概念

**关键产出**：
- 目标确认
- 输入/输出清单（用户能做什么、系统展示什么）
- 步骤/流程确认
- 待确认清单（打勾后才能继续）

---

### 阶段二：设计文档搭建

**目标**：根据需求文档生成概要设计文档

**输入**：`docs/proposal.md`

**输出**：`docs/high-Level Design.md`

**AI 行为规范**：
- 根据需求划分模块（每个模块只干一件事）
- 模块之间尽量独立，可单独测试
- 定义模块间接口（函数签名）
- 不猜测意图，不明确的地方提问

**关键产出**：
- 模块划分图
- 每个模块的职责 + 对外接口
- 模块间调用关系矩阵
- 数据持久化方案
- 测试策略
- 已确认决策清单

---

### 阶段三：划分任务

**目标**：为每个模块拆分成最小可执行子任务

**输入**：
- `docs/proposal.md`
- `docs/high-Level Design.md`

**输出**：
- `docs/tasks/task-{module}.md`（每个模块一个文件）
- `docs/tasks/task-progress.md`（总进度看板）

**AI 行为规范**：
- 每个子任务用 `[ ]` checkbox 表示
- 子任务要小到"一个 subAgent 一次能做完"
- 包含测试点（每个模块必须测什么）
- 标注优先级（P1 必须做 / P2 后续迭代）

**关键产出**：
- 每个模块 10~50 个子任务
- 子任务含编号（如 `B-01`, `B-02`）
- 依赖关系与推荐开发顺序
- 总进度表（模块状态 + 子任务进度）

---

### 阶段四：生成 SubAgent Prompt

**目标**：生成 vibe coding 用的起始 prompt

**输入**：
- `docs/proposal.md`
- `docs/high-Level Design.md`
- `docs/tasks/*.md`

**输出**：`prompt.md`（项目根目录）

**AI 行为规范**：
- 阅读所有输入，理解工程全貌
- 评估现有代码（如果有）
- 不明确的地方必须向用户提问
- prompt 要让主Agent和subAgent都知道该干嘛

**Prompt 必须包含的内容**：
1. **项目架构**：模块列表、依赖顺序、接口规范
2. **现有代码评估**：哪些保留、哪些重构、哪些新建
3. **主Agent职责**：调度逻辑、验收标准、派发模板
4. **SubAgent职责**：开发流程、代码规范、测试要求
5. **测试规范**：TestRunner API、测试HTML模板、覆盖率要求
6. **依赖关系与数据契约**：调用矩阵、数据结构设计
7. **已知确认事项**：设计文档中已确认决策，避免重复提问
8. **目标目录结构**：最终文件树
9. **验收标准**：DoD checklist

**关键产出**：
- 一个完整的 prompt.md
- 新会话只需读取 prompt.md 即可开始执行

---

### 四阶段之间的关系

```
阶段一（需求）
    ↓ 确认后进入
阶段二（架构）
    ↓ 确认后进入
阶段三（任务拆分）
    ↓ 确认后进入
阶段四（生成Prompt）
    ↓ 确认后进入
阶段五（执行开发）← 读取 prompt.md + task-progress.md 开始
```

### 每阶段的用户确认点

| 阶段 | 用户需要确认什么 |
|------|----------------|
| 一 | 功能范围、流程、待确认清单中的每个 `[ ]` |
| 二 | 模块划分是否合理、接口设计是否够用 |
| 三 | 子任务是否覆盖完整、优先级是否正确 |
| 四 | Prompt 是否完整、是否有遗漏约束 |

### 本项目的执行结果

| 阶段 | 输出文件 | 状态 |
|------|---------|------|
| 一 | `docs/proposal.md` | ✅ 已完成 |
| 二 | `docs/high-Level Design.md` | ✅ 已完成 |
| 三 | `docs/tasks/task-*.md` + `task-progress.md` | ✅ 已完成 |
| 四 | `prompt.md` | ✅ 已完成 |
| 五 | 各模块代码 + 测试 | ⏳ 待执行 |

---

*这是你的私人笔记本，随时改。*

---

## 🖥️ 分批次开发的环境选择策略（IDE vs CLI）

> 记录：当项目按批次推进时，每批选什么环境跑、为什么、怎么衔接。

### 核心原则

| 场景 | 推荐环境 | 原因 |
|------|---------|------|
| 单模块 / 有强依赖顺序 | **IDE** | 串行验收，逐个确认，避免并行冲突 |
| 多模块 / 互相独立 | **CLI** | 可同时开多个终端窗口，多路 subAgent 并行 |
| 修复 bug / 小改动 | **IDE** | 快速响应，即时验证 |
| 探索性任务 | **IDE** | 保留对话上下文，方便追问和调整 |

### 本项目各批次的环境选择

```
第1批（底座层）    → IDE 串行    // TestRunner → Storage → BoardRenderer → Engine
第2批（核心功能）  → IDE 串行    // Welcome → Guide → Blindfold → Coordinate
第3批（系统整合）  → IDE 串行    // SettingsModule（仅1个模块）
第4批（扩展功能）  → CLI 并行    // Stats + Replay + Exit（三者互相独立）
```

### 为什么第4批适合 CLI 并行？

- **StatsModule**：依赖 StorageModule（已完成）+ BlindfoldModule（已完成）
- **ReplayModule**：依赖 BoardRenderer（已完成）+ StorageModule（已完成）
- **ExitModule**：无依赖

三者之间**没有互相依赖**，可以并行开发、并行测试。

---

## 🔄 每新开一批次的上下文交接清单

> 无论 IDE 还是 CLI，每开一个新窗口/新会话跑下一批，必须完成以下交接步骤。

### 步骤一：主 Agent 读取状态（恢复上下文）

```
1. 读 AGENTS.md        → 了解项目规则
2. 读 prompt.md        → 了解主指令和接口规范
3. 读 task-progress.md  → 了解当前完成进度
4. 读 high-Level Design.md §对应章节 → 了解当前批次模块设计
```

### 步骤二：主 Agent 验收上批产出（断点续作时）

```
5. 检查 js/*.js 文件是否存在
6. 运行 docs/tests/test-*-node.js 确认测试通过
7. 检查 index.html script 引用顺序是否正确
```

### 步骤三：主 Agent 调度当前批次

```
8. 按批次顺序逐个（或并行）派发 subAgent
9. 每个 subAgent 必须阅读：
   - docs/high-Level Design.md §4.x（模块详细设计）
   - docs/tasks/task-{module}.md（子任务清单）
   - prompt.md §四（测试规范）
   - [重构时] 现有源码文件
10. subAgent 交付：js/{module}.js + docs/tests/test-{module}-node.js
11. 主 Agent 验收：运行测试 → 抽查代码 → 更新 task-progress.md
```

---

## 📝 CLI 并行跑第4批的提示词模板

```
你是 Blindfold Chess 项目的主 Agent（Orchestrator）。

## 项目路径
D:\Vibe-Code\blindfold-chess

## 必须先读的文件（按顺序）
1. D:\Vibe-Code\blindfold-chess\prompt.md（主指令，含架构和开发规范）
2. D:\Vibe-Code\blindfold-chess\docs\tasks\task-progress.md（当前完成进度）
3. D:\Vibe-Code\blindfold-chess\docs\high-Level Design.md（模块详细设计）

## 当前状态
- 第1批 ✅：TestRunner、StorageModule、BoardRenderer、EngineModule
- 第2批 ✅：WelcomeModule、GuideModule、BlindfoldModule、CoordinateModule
- 第3批 ✅：SettingsModule
- 现在执行第4批（扩展功能），共3个模块

## 批次开发策略
StatsModule 和 ReplayModule 可并行调度（互相独立），ExitModule 无依赖也可并行。

## 任务
按以下顺序实现：
1. StatsModule     → js/stats.js     【新建】
2. ReplayModule    → js/replay.js    【新建】
3. ExitModule      → js/exit.js      【新建】

## 接口规范
- StatsModule: init(), getGameHistory(), getWinRate(diff?), getProgressData(), exportData(fmt), clearData(), recordGameResult(r)
- ReplayModule: init(), loadPgn(text), verifyMove(input), loadClassicGame(id), navigateToMove(i), toggleBoard(), getCurrentFen()
- ExitModule: init(), showExitScreen(), getRandomLine()

## 每个 subAgent 的任务
1. 实现 js/{module}.js，严格暴露上述接口
2. 创建 docs/tests/test-{module}-node.js，在 Node.js 中运行（提供 DOM mock）
3. 覆盖对应 task 文件中的所有测试点
4. 更新 index.html 和 css/style.css（如有需要）

## 约束
- 纯 JS，零框架，零 npm
- 所有全局函数封装进 window.{ModuleName}
- 必须写测试，测试不通过不算完成
- 模块间通过公开接口通信

完成后更新 docs/tasks/task-progress.md 标记完成状态。
```

---

## ⚠️ 常见衔接问题与对策

| 问题 | 原因 | 对策 |
|------|------|------|
| 新会话 AI 不知道已完成哪些模块 | 没读 task-progress.md | **强制先读 task-progress.md** |
| 新会话 AI 重复实现已完成的模块 | 没指明批次和模块 | 提示词中明确写"当前批次：第X批" |
| subAgent 破坏了已有代码 | 没约束"不要删除旧代码" | 每个 subAgent 提示词中加约束 |
| 测试在浏览器通过但 Node.js 不通过 | DOM API 差异 | 要求 subAgent 在 Node.js 中跑测试 |
| index.html script 顺序错乱 | 新增模块后没更新顺序 | 验收时检查 script 加载顺序 |
| 全局变量泄漏 | 模块没包 IIFE | 验收时检查 window 对象 |

---

### CLI 并行跑第4批的实战记录

**2026-05-17 晚**
- 将第4批（StatsModule + ReplayModule + ExitModule）的完整提示词写入 `prompt.md` 附录
- CLI 读取本地 `prompt.md` 后，成功同时 dispatch 3 个 subAgent 后台并行执行
- **关键经验**：长提示词不要粘贴，让 CLI 读文件；Meta-Prompt（Orchestrator 模式）在支持 Agent 工具的 CLI 上可行
- **待验证**：3 个 subAgent 的测试结果和代码质量

---

*记录时间：2026-05-17*
