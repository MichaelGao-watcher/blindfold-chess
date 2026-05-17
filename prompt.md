# Blindfold Chess — Vibe Coding Prompt

> **项目**：盲棋训练平台（Blindfold Chess）
> **技术栈**：纯 HTML + CSS + JS，零框架，零构建工具
> **已有基础**：`chess.js`（第三方棋局引擎）、`index.html`、`css/style.css`、`js/common.js`、`js/engine.js`、`js/game.js`、`js/coordinate.js`、`js/main.js`
> **开发方式**：基于现有代码重构 + 新模块开发，所有代码必须附带完整单元测试

---

## 一、项目架构（12 个模块）

按依赖顺序分四批实现：

```
第1批（底座层）：
  ├─ TestRunner      → js/test-runner.js      【新建】纯JS测试框架
  ├─ StorageModule   → js/storage.js          【新建】localStorage + IndexedDB
  ├─ BoardRenderer   → js/board-renderer.js   【从game.js/coordinate.js提取重构】
  └─ EngineModule    → js/engine.js           【基于现有EngineManager重构】

第2批（核心功能）：
  ├─ WelcomeModule   → js/welcome.js          【从common.js提取重构】
  ├─ GuideModule     → js/guide.js            【从common.js提取重构】
  ├─ BlindfoldModule → js/blindfold.js        【从game.js提取重构】
  └─ CoordinateModule→ js/coordinate.js       【基于现有重构】

第3批（系统整合）：
  └─ SettingsModule  → js/settings.js         【从common.js提取重构】

第4批（扩展功能）：
  ├─ StatsModule     → js/stats.js            【新建】
  ├─ ReplayModule    → js/replay.js           【新建】
  └─ ExitModule      → js/exit.js             【新建】
```

### 模块接口规范（必须严格遵守）

每个模块必须挂载到全局 `window` 下的命名空间对象：

```javascript
// 示例：BoardRenderer
window.BoardRenderer = {
  create(containerId, options) { /* 返回实例对象 */ },
  // ... 其他方法
};
```

各模块对外接口见 `docs/high-Level Design.md` §4.x。下面是核心约束：

| 模块 | 必须暴露的接口 | 说明 |
|------|---------------|------|
| **TestRunner** | `suite(name, fn)`, `test(name, fn)`, `assert(cond, msg)`, `assertEqual(a, b, msg)`, `assertThrows(fn, msg)`, `run()`, `runModule(name)` | 纯JS，零依赖，支持async/await |
| **StorageModule** | `init()`, `set(key, val)`, `get(key)`, `addGameRecord(r)`, `getGameRecords(filter?)`, `addStat(e)`, `getStats(type?)`, `addCoordinateRecord(r)`, `getCoordinateRecords()`, `exportAll()`, `importAll(json)`, `downloadPgn(text)`, `clearAll()` | localStorage + IndexedDB |
| **BoardRenderer** | `create(containerId, options)` → `{ render(fen?), highlight(sq, type), clearHighlight(), shake(), onSquareClick(cb), destroy() }` | 通用棋盘，options: `{ showPieces, squareSize, perspective }` |
| **EngineModule** | `init()`, `setDifficulty(config)`, `setPosition(fen)`, `go(callback)`, `goMultiPv(callback, pvCount)`, `stop()`, `terminate()`, `isReady()` | 基于现有 EngineManager 类重构 |
| **WelcomeModule** | `init()`, `navigateTo(mode)` | mode: `'blindfold'\|'coordinate'\|'replay'\|'guide'` |
| **GuideModule** | `init()`, `showSection(id)` | 入门指南 |
| **BlindfoldModule** | `init(level)`, `submitMove(input)`, `toggleBoard()`, `resign()`, `newGame()`, `getPgn()`, `getCurrentFen()`, `onGameOver(callback)` | 盲棋对战核心 |
| **CoordinateModule** | `init()`, `startPractice(side, mode)`, `setTimer(seconds)`, `submitAnswer(answer)`, `getScore()`, `reset()` | 坐标练习 |
| **SettingsModule** | `init()`, `setTheme(t)`, `setLanguage(l)`, `setSound(e)`, `setEngineConfig(c)`, `get(key)` | 主题/语言/音效/引擎配置 |
| **StatsModule** | `init()`, `getGameHistory()`, `getWinRate(diff?)`, `getProgressData()`, `exportData(fmt)`, `clearData()`, `recordGameResult(r)` | 统计 + 成就 |
| **ReplayModule** | `init()`, `loadPgn(text)`, `verifyMove(input)`, `loadClassicGame(id)`, `navigateToMove(i)`, `toggleBoard()`, `getCurrentFen()` | PGN复盘 |
| **ExitModule** | `init()`, `showExitScreen()`, `getRandomLine()` | 退出 + 幽默台词 |

---

## 二、现有代码评估与迁移指南

### 已有文件状态

| 文件 | 状态 | 处理方式 |
|------|------|---------|
| `chess.js` | ✅ 第三方库，完整可用 | **完全保留，不修改** |
| `index.html` | 结构可用，需精简script引用 | 逐步替换内联事件，最终只引用模块化后的js文件 |
| `css/style.css` | 苹果风格已建立，质量不错 | **保留为基础样式**，新增模块样式append |
| `js/common.js` | 287行，混杂i18n/主题/导航/设置面板 | **拆分提取**：i18n → 各模块内部或独立lang文件；导航 → WelcomeModule；主题 → SettingsModule；设置面板 → SettingsModule |
| `js/engine.js` | 105行，`EngineManager`类，Worker封装可用 | **重构为 EngineModule**：扩展MultiPV、自定义Elo(400~3200)、状态机、停止/销毁安全 |
| `js/game.js` | 317行，混杂盲棋逻辑/棋盘渲染/PGN/音效/棋子SVG | **拆分提取**：盲棋逻辑 → BlindfoldModule；棋盘渲染 → BoardRenderer；棋子SVG → BoardRenderer内部；走子音效 → BlindfoldModule/SettingsModule |
| `js/coordinate.js` | 187行，坐标练习逻辑 | **重构为 CoordinateModule**：补全计时器、模式B输入、64格不重复覆盖、练习结果保存 |
| `js/main.js` | 8行，事件绑定 | **扩展为全局入口**：按模块初始化顺序调用各 `init()` |

### 重构核心原则

1. **零全局变量（除了挂载到 window 的模块对象）**
2. **每个模块一个文件，只干一件事**
3. **模块间不直接操作对方内部状态，通过公开接口通信**
4. **DOM 操作尽量限制在模块内部，不跨模块直接查DOM**
5. **保留现有视觉风格（苹果风格、CSS变量、毛玻璃效果）**

---

## 三、主 Agent 职责

你是**项目总控（Orchestrator）**，负责：

1. **读取当前状态**：每次开始先查看 `docs/tasks/task-progress.md` 和各模块 task 文件，确认已完成/进行中的子任务。
2. **按批次调度 subAgent**：严格按「第1批 → 第2批 → 第3批 → 第4批」顺序派发任务。
3. **每次只派发一个模块**：等待 subAgent 完成并验收通过后再派发下一个。
4. **验收标准**：
   - subAgent 交付的代码文件完整（.js + .html测试文件）
   - subAgent 报告「在浏览器中打开测试HTML，所有测试通过」
   - 主Agent抽查关键测试用例逻辑是否合理
5. **更新进度**：每完成一个模块，更新 `docs/tasks/task-progress.md` 和对应 `task-{module}.md` 的勾选状态。
6. **处理阻塞**：如果某模块依赖的前置模块有问题，暂停派发，先修复前置模块。

### 主 Agent 的派发模板

给 subAgent 的任务必须包含：
```
你是 subAgent，负责实现 [模块名]。

## 你必须阅读的参考文件
- docs/high-Level Design.md §4.x（该模块详细设计）
- docs/tasks/task-{module}.md（子任务清单）
- prompt.md §四、测试规范
- [如果涉及重构] 现有代码文件路径

## 你的任务
1. 实现 js/{module}.js，严格暴露 prompt.md §一 规定的接口
2. 创建 docs/tests/test-{module}.html 测试文件
3. 编写完整测试用例，覆盖 task-{module}.md 中的所有「测试点」
4. 在浏览器中打开测试文件，确保所有测试通过
5. 如有需要，更新 index.html 或 css/style.css

## 约束
- 纯 JS，零框架，零npm
- 基于现有代码重构时，保留已有功能和视觉风格
- 所有全局函数/变量必须封装进 window.{ModuleName} 对象
- 必须写测试，测试不通过不算完成
```

---

## 四、Sub Agent 职责与规范

你是**模块实现者（Implementer）**，每次只负责**一个模块**。

### 开发流程（必须严格执行）

```
Step 1: 阅读该模块的设计文档和任务清单
Step 2: 阅读需要重构的现有代码（如有）
Step 3: 实现 js/{module}.js（按接口规范）
Step 4: 创建 docs/tests/test-{module}.html（加载 test-runner.js + 被测模块）
Step 5: 编写测试用例（覆盖 task 文件中的所有「测试点」）
Step 6: 在浏览器中打开测试HTML文件，运行测试
Step 7: 修复失败的测试，直到全部通过
Step 8: 向主Agent报告：文件路径 + 测试通过截图/结果 + 已知限制
```

### 代码规范

1. **模块封装**：
```javascript
(function() {
  'use strict';
  
  // 模块内部状态（不暴露）
  let _privateState = null;
  
  // 模块对象
  const MyModule = {
    init() { /* ... */ },
    publicMethod() { /* ... */ }
  };
  
  window.MyModule = MyModule;
})();
```

2. **事件解耦**：模块间不直接调用，优先使用回调注册：
```javascript
// BlindfoldModule 内部
const _gameOverCallbacks = [];
BlindfoldModule.onGameOver = function(cb) {
  _gameOverCallbacks.push(cb);
};
// 终局时
_gameOverCallbacks.forEach(cb => cb(result));
```

3. **DOM 操作**：使用 `document.getElementById` / `querySelector`，模块负责自己的容器。
4. **CSS 类名**：使用模块前缀，如 `.blindfold-board`, `.coord-score`。

### 测试规范（强制）

每个模块必须创建 `docs/tests/test-{module}.html`：

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test {Module}</title></head>
<body>
<div id="test-results"></div>
<!-- 加载依赖（按依赖顺序） -->
<script src="../../js/test-runner.js"></script>
<script src="../../chess.js"></script>
<script src="../../js/storage.js"></script>
<!-- 被测模块 -->
<script src="../../js/{module}.js"></script>
<script>
TestRunner.suite('{Module}', () => {
  TestRunner.test('初始化成功', () => {
    window.{Module}.init();
    TestRunner.assert(window.{Module}.publicMethod !== undefined, 'publicMethod 未暴露');
  });
  // ... 更多测试
});
TestRunner.run();
</script>
</body>
</html>
```

**测试要求**：
- 每个子任务清单中的「测试点」必须对应至少一个测试用例
- 边界情况必须覆盖（空输入、非法输入、边界值）
- async 测试使用 async/await + TestRunner 的超时机制
- 测试 HTML 必须在浏览器中手动（或自动）打开运行，全部通过

---

## 五、测试运行器（TestRunner）规范

`js/test-runner.js` 是第一批必须最先完成的模块。

### 最小 API

```javascript
window.TestRunner = {
  suite(name, fn),      // 定义测试套件
  test(name, fn),       // 定义测试用例（fn 可以是 async）
  assert(cond, msg),    // 断言
  assertEqual(a, b, msg), // 深度相等断言（对象用 JSON.stringify 比较）
  assertThrows(fn, msg),  // 断言抛出异常
  run(),                // 运行所有测试，输出报告到页面
  runModule(name)       // 只运行指定 suite
};
```

### 报告格式（在页面中渲染）

```
=======================================
Test Report
=======================================
✓ Suite: BoardRenderer (4/4 passed, 12ms)
  ✓ test: 渲染空棋盘 64 格
  ✓ test: 渲染初始局面 32 棋子
  ✗ test: 黑方视角反转 ... AssertionError: expected a1 at top-right
  ...
=======================================
Total: 15 passed, 1 failed, 16ms
=======================================
```

---

## 六、依赖关系与接口契约

### 模块间调用矩阵

| 调用方 ↓ \ 被调用方 → | Welcome | Blindfold | Coordinate | Replay | Guide | Settings | Stats | Exit | BoardRenderer | Engine | Storage |
|----------------------|:-------:|:---------:|:----------:|:------:|:-----:|:--------:|:-----:|:----:|:-------------:|:------:|:-------:|
| Welcome | — | nav | nav | nav | nav | — | — | — | — | — | — |
| Blindfold | — | — | — | — | — | read | emit | — | render | call | write |
| Coordinate | — | — | — | — | — | read | emit | — | render | — | write |
| Replay | — | — | — | — | — | read | — | — | render | — | read |
| Stats | — | — | — | — | — | — | — | — | — | — | read |
| Settings | — | — | — | — | — | — | — | — | — | — | write |

> nav = 导航跳转，call = 直接调用，render = 渲染请求，read/write = 读写数据，emit = 触发事件/回调

### 关键数据契约

```javascript
// GameRecord（对局记录）
{
  id: string,           // UUID 或时间戳+随机数
  date: string,         // ISO 日期
  mode: 'blindfold',
  difficulty: 'easy'|'medium'|'hard'|'expert',
  result: '1-0'|'0-1'|'1/2-1/2'|'*',
  pgn: string,
  moves: number,
  duration: number      // 秒
}

// StatEntry（统计条目）
{
  date: string,
  type: 'game'|'coordinate',
  score: number,
  accuracy: number      // 0~1
}

// CoordinateRecord（坐标练习记录）
{
  id: string,
  date: string,
  mode: 'a'|'b',
  side: 'white'|'black',
  score: number,
  total: number,
  accuracy: number,
  duration: number      // 秒
}
```

---

## 七、已知待确认事项（开发中注意）

以下事项已在设计文档中确认，开发时直接按此实现：

1. ✅ 坐标练习「执黑」棋盘反转 180°，坐标标注随之反转
2. ✅ 棋子记忆练习（P2）已从规划中移除，不实现
3. ✅ 只加**走子音效**（用户走棋和引擎走棋时播放），不加正确/错误提示音
4. ✅ 对局结束后显示 PGN 走法列表，可复制
5. ✅ 欢迎页视觉风格：**苹果风格**（简洁、毛玻璃、圆角、SF字体栈）
6. ✅ 引擎候选走法作为「建议用户的下一步走法」展示（Top 3 + 评分），**默认关闭**
7. ✅ 引擎难度可自定义 Elo 400~3200，滑动条调节
8. ✅ 内置100个经典名局（从Lichess获取PGN，打包为 `data/games.js`）
9. ✅ 幽默台词中文2句 + 英文翻译，退出时随机展示
10. ✅ 成就徽章门槛极低（如「第一步」——只走1步退出也能获得）

---

## 八、文件目录目标结构

```
blindfold-chess/
├── index.html                    # 入口，加载所有模块脚本
├── chess.js                      # 第三方棋局引擎（保留）
├── css/
│   └── style.css                 # 基础样式 + 主题变量（保留扩展）
├── js/
│   ├── test-runner.js            # 【新建】纯JS测试框架
│   ├── storage.js                # 【新建】StorageModule
│   ├── board-renderer.js         # 【重构】通用棋盘渲染
│   ├── engine.js                 # 【重构】EngineModule
│   ├── welcome.js                # 【重构】WelcomeModule
│   ├── guide.js                  # 【重构】GuideModule
│   ├── blindfold.js              # 【重构】BlindfoldModule
│   ├── coordinate.js             # 【重构】CoordinateModule
│   ├── settings.js               # 【重构】SettingsModule
│   ├── stats.js                  # 【新建】StatsModule
│   ├── replay.js                 # 【新建】ReplayModule
│   ├── exit.js                   # 【新建】ExitModule
│   └── main.js                   # 【重构】全局入口，按序init
├── data/
│   └── games.js                  # 【新建】100个经典名局PGN数据
├── docs/
│   ├── high-Level Design.md      # 设计文档（参考）
│   ├── tasks/                    # 任务清单（参考）
│   └── tests/                    # 测试文件目录
│       ├── test-runner.html      # TestRunner自测
│       ├── test-storage.html
│       ├── test-board.html
│       ├── test-engine.html
│       ├── test-blindfold.html
│       ├── test-coordinate.html
│       └── ...                   # 其他模块测试
└── prompt.md                     # 本文件
```

---

## 九、验收标准（Definition of Done）

一个模块**只有满足以下条件才算完成**：

- [ ] `js/{module}.js` 文件存在，所有接口按规范暴露
- [ ] `docs/tests/test-{module}.html` 存在，加载 TestRunner 和被测模块
- [ ] 测试用例覆盖该模块 task 文件中的所有「测试点」
- [ ] **在浏览器中打开测试HTML，所有测试通过**（subAgent自测并报告）
- [ ] 代码无全局污染（除 `window.{ModuleName}` 外）
- [ ] 主Agent抽查通过后更新 task-progress.md

**项目整体完成标准**：
- 全部12个模块完成并测试通过
- `index.html` 能正常加载所有模块，各功能流程可跑通
- 至少有一个「集成测试」验证模块间协作（如 Settings 切换主题后各模块UI同步）

---

## 十、给 AI 的自我检查清单

在提交任何代码前，问自己：

1. **这个模块是否只干一件事？**
2. **是否有任何全局变量泄漏？**（在浏览器控制台检查）
3. **测试是否覆盖了正常路径和异常路径？**
4. **模块间的接口调用是否通过公开API而非直接操作内部？**
5. **现有功能是否被破坏了？**（重构后原有流程仍能跑通）
6. **代码风格是否与现有项目一致？**（苹果风格、CSS变量、毛玻璃效果）

---

*本 prompt 基于 docs/proposal.md、docs/high-Level Design.md 和 docs/tasks/*.md 生成。*
*开发过程中如遇到设计文档未覆盖的边界情况，按「最小可行 + 保守安全」原则处理，并在报告中记录。*

---

## 附录：第4批 — 扩展功能并行派发提示词

> 以下提示词用于 Orchestrator 模式。将本附录完整内容（或关键指令）提供给 AI，由 AI 同时创建三个 subAgent 并行实现 ExitModule、StatsModule、ReplayModule。

### 执行指令（给 AI 的触发词）

> ⚠️ **实际执行记录**：CLI 并行尝试因 subAgent 15 分钟超时 + WriteFile approval 阻塞而失败，最终改为 IDE 串行完成。如再次使用 CLI 并行，请将 subAgent `timeout` 显式设为 1800~3600 秒。

```
你是项目总控（Orchestrator）。当前项目已完成第1-3批（底座层 + 核心功能 + SettingsModule）。
现在执行第4批扩展功能。请同时创建三个 subAgent 并行执行：
1. ExitModule（退出模块）
2. StatsModule（统计模块）
3. ReplayModule（盲棋复盘模块）

三个模块逻辑独立，无相互依赖。每个 subAgent 只创建 .js 文件和 docs/tests/ 下的测试文件，禁止修改 index.html 和 css/style.css。你最后统一集成。

具体规范见下文「模块详细规范」。
```

### 模块详细规范

#### ExitModule

**接口：**
```javascript
window.ExitModule = {
  init(),               // 初始化退出界面
  showExitScreen(),     // 显示退出屏幕
  getRandomLine()       // 获取随机幽默台词
};
```

**功能：**
- 退出流程处理（导航到 exitScreen）
- 随机展示幽默台词（中文2句 + 英文2句）
- 支持中英切换（通过 SettingsModule.get('lang')）
- 苹果风格视觉

**交付：**
- `js/exit.js`
- `docs/tests/test-exit-node.js`
- `docs/tests/test-exit.html`

**测试要点：** 接口存在性、随机台词全覆盖、语言切换正确、屏幕切换正确、无全局泄漏。

---

#### StatsModule

**接口：**
```javascript
window.StatsModule = {
  init(),
  getGameHistory(),
  getWinRate(difficulty?),
  getProgressData(),
  exportData(format),   // 'json' | 'pgn'
  clearData(),
  recordGameResult(result)
};
```

**功能：**
- 对局历史（从 StorageModule.getGameRecords() 读取）
- 胜率统计（总胜率 + 各难度胜率）
- 进步曲线：①对局总时长趋势 ②平均生存步数趋势 ③各难度胜率变化。用纯 Canvas 手绘极简折线图
- 坐标练习成绩（从 StorageModule.getCoordinateRecords() 读取）
- 数据导出（JSON / PGN）
- 成就徽章（门槛极低）：「第一步」「初尝败绩」「十步之遥」「首胜」「连败不屈」

**数据结构：** 严格遵循 prompt.md §六 的 GameRecord / CoordinateRecord 契约。

**交付：**
- `js/stats.js`
- `docs/tests/test-stats-node.js`
- `docs/tests/test-stats.html`

**测试要点：** 接口存在性、胜率计算准确性（0局/全赢/全输/混合）、进步曲线数据正确、徽章判定逻辑、导出格式、无全局泄漏。

---

#### ReplayModule

**接口：**
```javascript
window.ReplayModule = {
  init(),
  loadPgn(pgnText),
  verifyMove(input),
  loadClassicGame(id),
  navigateToMove(index),
  toggleBoard(),
  getCurrentFen()
};
```

**功能：**
- PGN 粘贴解析（标准格式，手写解析器，不引入外部库）
- 逐条输入验证（用 chess.js 验证合法性）
- 内置名局：创建 `data/games.js`，先放 **5 个经典名局 PGN** 作为占位数据
- 走法导航：点击列表跳转、键盘 ← → 导航
- 棋盘显示：用 BoardRenderer.create() 渲染当前局面
- 语言支持：通过 SettingsModule.get('lang')

**交付：**
- `js/replay.js`
- `data/games.js`（5个占位名局）
- `docs/tests/test-replay-node.js`
- `docs/tests/test-replay.html`

**测试要点：** 接口存在性、PGN 解析正确、逐条验证严格、导航同步更新局面、加载内置名局、无全局泄漏。

---

### 全局约束（三个模块都必须遵守）

1. **纯 JS，零框架，零 npm**
   - 禁止引入 React/Vue/jQuery/Chart.js 等任何第三方库
   - 图表必须用 HTML5 Canvas 手写，或用纯 DOM/CSS 模拟
2. **模块封装**
   - 所有全局函数/变量必须封装进 `window.{ModuleName}` 对象
   - 模块内部状态用局部变量，禁止泄漏到 window
3. **DOM 操作**
   - 使用 `document.getElementById` / `querySelector`
   - 每个模块只操作自己的容器/屏幕
4. **持久化**
   - 使用 `StorageModule.set(key, value)` / `StorageModule.get(key)`
   - StorageModule 不可用时 fallback 到 `localStorage`
5. **测试**
   - 必须创建 `docs/tests/test-{module}-node.js`（Node.js 测试，提供 DOM mock）
   - 必须创建 `docs/tests/test-{module}.html`（浏览器测试）
   - 测试不通过不算完成
6. **禁止修改的文件**
   - 三个 subAgent **各自禁止修改** `index.html` 和 `css/style.css`
   - 禁止删除 `common.js` 中的原有代码

### 集成步骤（三个 subAgent 全部完成后，由 Orchestrator 执行）

1. 更新 `index.html`：
   - 在 `body` 内添加三个模块各自的 `screen` 区块
   - 在 `</body>` 前按顺序添加 `<script src="js/exit.js"></script>`、`<script src="js/stats.js"></script>`、`<script src="js/replay.js"></script>`
2. 更新 `js/main.js`：调用 `ExitModule.init()`、`StatsModule.init()`、`ReplayModule.init()`
3. 微调 `css/style.css` 补充模块专属样式（保持苹果风格一致）
