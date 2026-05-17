# 盲棋训练平台 — 概要设计文档（High-Level Design）

> 版本：v1.0  
> 日期：2026-05-17  
> 依据：`docs/proposal.md` 需求文档  
> 范围：全平台功能（已实现 + 规划中）

---

## 1. 设计目标

1. **按功能域划分模块**，模块之间尽量独立，支持独立测试
2. **纯前端零依赖**（HTML + CSS + JS），不引入前端框架
3. **解决"无登录记住用户"**：本地持久化 + 数据导出
4. **可扩展**：新功能以新增模块或扩展现有模块接口的方式接入，不破坏已有结构

---

## 2. 设计原则

| 原则 | 说明 |
|------|------|
| 单一职责 | 每个模块只负责一个功能域，不越界 |
| 接口隔离 | 模块间通过明确的函数/事件接口通信，不直接操作对方内部状态 |
| 可测试性 | 每个模块暴露入口，可被测试运行器独立加载和验证 |
| 零依赖 | 不引入 npm / 构建工具 / 测试框架，测试运行器用纯 JS 手写 |
| 数据本地优先 | 所有用户数据存于浏览器本地，提供导出功能实现"跨设备迁移" |

---

## 3. 系统架构

### 3.1 模块划分图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              入口层 (index.html)                             │
│                      屏幕切换、全局事件委托、脚本加载                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        ▼             ▼               ▼               ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  Welcome     │ │ Guide    │ │  Settings    │ │  Exit    │ │   Stats      │
│  欢迎页模块   │ │ 入门指南  │ │   设置模块    │ │ 退出模块  │ │  统计模块     │
└──────────────┘ └──────────┘ └──────────────┘ └──────────┘ └──────────────┘
        │                                      │               │
        │         ┌────────────────────────────┘               │
        │         │                                              │
        ▼         ▼                                              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐      ┌──────────────┐
│  Blindfold   │ │ Coordinate   │ │   Replay     │      │  Storage     │
│  盲棋对战模块 │ │ 坐标练习模块  │ │ 盲棋复盘模块  │      │ 数据持久化模块 │
└──────────────┘ └──────────────┘ └──────────────┘      └──────────────┘
        │               │               │                      ▲
        │               │               │                      │
        └───────────────┴───────────────┴──────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │   BoardRenderer      │
              │   棋盘渲染模块        │
              └──────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │    EngineModule      │
              │   引擎通信模块        │
              └──────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │    TestRunner        │
              │    测试运行器         │
              │  （独立运行，不耦合）  │
              └──────────────────────┘
```

### 3.2 模块职责总表

| 模块 | 职责 | 状态 |
|------|------|------|
| **WelcomeModule** | 品牌欢迎页、模式选择入口、动态视觉效果 | 规划中 |
| **BlindfoldModule** | 与 Stockfish 对弈、走子输入、终局、PGN、自动保存 | 已实现 |
| **CoordinateModule** | 坐标练习 A/B 模式、计时挑战、视角切换、反馈 | 已实现 |
| **ReplayModule** | PGN 粘贴/输入/内置名局、走法导航、局面推演 | 规划中 |
| **GuideModule** | 入门知识展示、引导流程 | 已实现 |
| **SettingsModule** | 主题/语言/音效切换、引擎参数自定义 | 已实现（部分） |
| **StatsModule** | 对局历史、胜率统计、进步曲线、数据导出 | 规划中 |
| **ExitModule** | 退出流程、幽默台词随机展示 | 规划中 |
| **BoardRenderer** | 通用棋盘渲染、棋子 SVG、坐标标注、动画 | 已实现 |
| **EngineModule** | Stockfish Worker 封装、UCI 通信、难度配置 | 已实现 |
| **StorageModule** | localStorage / IndexedDB 封装、数据导出导入 | 需新建 |
| **TestRunner** | 纯 JS 测试运行器、断言、套件、报告 | 需新建 |

---

## 4. 各模块详细设计

### 4.1 WelcomeModule（欢迎页模块）

**职责**：
- 展示品牌 Logo 与标语
- 提供四个入口：盲棋对战、坐标练习、盲棋复盘、入门指南
- 视觉风格：**统一苹果风格**（简洁、毛玻璃、圆角、SF 字体栈）

**对外接口**：
```javascript
WelcomeModule.init()           // 初始化欢迎页，绑定事件
WelcomeModule.navigateTo(mode) // 导航到指定模块：'blindfold' | 'coordinate' | 'replay' | 'guide'
```

**依赖**：无（纯展示+导航）

**测试点**：
- 四个入口按钮点击后是否正确切换屏幕
- 动态背景是否影响低端设备性能（60fps）

---

### 4.2 BlindfoldModule（盲棋对战模块）

**职责**：
- 难度选择（Easy/Medium/Hard/Expert）
- 用户走子输入、代数记谱法验证
- 与 EngineModule 交互，触发引擎思考
- 接收引擎走法，更新局面
- 终局判定（将杀/逼和/和棋/认输）
- 棋盘显示/隐藏切换
- 走法历史记录展示
- PGN 生成与复制
- **自动保存**对局记录到 StorageModule
- **尝试显示引擎候选走法**

**对外接口**：
```javascript
BlindfoldModule.init(level)           // 初始化新对局，level: 'easy'|'medium'|'hard'|'expert'
BlindfoldModule.submitMove(input)     // 提交用户走法
BlindfoldModule.toggleBoard()         // 显示/隐藏棋盘
BlindfoldModule.resign()              // 认输
BlindfoldModule.newGame()             // 重新开始
BlindfoldModule.getPgn()              // 获取当前对局 PGN
BlindfoldModule.getCurrentFen()       // 获取当前 FEN
BlindfoldModule.onGameOver(callback)  // 注册终局回调（供 StatsModule 监听）
```

**依赖**：
- `EngineModule` — 引擎对弈
- `BoardRenderer` — 棋盘渲染
- `StorageModule` — 自动保存对局记录

**测试点**：
- 各难度下引擎是否正常回应
- 非法走法输入是否被拒绝
- 终局判定是否正确（将杀/逼和/和棋）
- PGN 格式是否符合标准
- 自动保存是否在对局结束时触发
- 引擎候选走法是否能正确获取并显示

---

### 4.3 CoordinateModule（坐标练习模块）

**职责**：
- 模式 A（找格子）：系统报坐标，用户点击棋盘
- 模式 B（报坐标）：系统高亮格子，用户输入坐标
- 计时挑战（**时长可调**：30s / 60s / 120s 或自定义）
- 执白/执黑视角切换（棋盘与坐标标注反转）
- 实时得分统计
- 答错反馈（震动、高亮、强制重选）

**对外接口**：
```javascript
CoordinateModule.init()                   // 初始化练习界面
CoordinateModule.startPractice(side, mode) // 开始练习，side: 'white'|'black', mode: 'a'|'b'
CoordinateModule.setTimer(seconds)         // 设置计时挑战时长，0 为不限时
CoordinateModule.submitAnswer(answer)      // 提交答案（点击或输入）
CoordinateModule.getScore()                // 获取当前得分
CoordinateModule.reset()                   // 重置练习
```

**依赖**：
- `BoardRenderer` — 空棋盘渲染（无棋子）

**测试点**：
- 64 个坐标随机覆盖
- 答错后必须点击正确格子才能继续
- 执黑视角下坐标标注是否正确反转
- 计时器到点后是否正确停止并显示结果
- 时长设置是否生效

---

### 4.4 ReplayModule（盲棋复盘模块）

**职责**：
- 方式1：PGN 粘贴解析，显示走法列表
- 方式2：逐条输入走法，系统验证正确性
- 方式3：内置经典名局，用户选择后盲着推演
- 走法列表导航（点击跳转、键盘 ← →）
- 可选显示当前步局面（供对照）

**对外接口**：
```javascript
ReplayModule.init()                       // 初始化复盘界面
ReplayModule.loadPgn(pgnText)             // 方式1：加载 PGN 文本
ReplayModule.verifyMove(input)            // 方式2：验证单步输入
ReplayModule.loadClassicGame(id)          // 方式3：加载内置名局
ReplayModule.navigateToMove(index)        // 跳转到指定步
ReplayModule.toggleBoard()                // 显示/隐藏当前局面
ReplayModule.getCurrentFen()              // 获取当前步的 FEN
```

**依赖**：
- `BoardRenderer` — 显示当前局面
- `StorageModule` — 保存用户导入的 PGN

**测试点**：
- PGN 解析是否正确（标准 PGN 格式）
- 逐条输入验证是否严格匹配
- 走法导航是否同步更新局面

**已确认**：内置100个经典名局（见第8节数据方案）

---

### 4.5 GuideModule（入门指南模块）

**职责**：
- 展示棋盘坐标、代数记谱法、盲棋规则
- 引导用户从基础到练习的过渡

**对外接口**：
```javascript
GuideModule.init()            // 初始化指南界面
GuideModule.showSection(id)   // 跳转到指定章节
```

**依赖**：无

**测试点**：
- 各章节内容是否正确渲染
- 返回按钮是否正常

---

### 4.6 SettingsModule（设置模块）

**职责**：
- 主题切换（深色/浅色）
- 语言切换（中/英）
- 音效开关
- **引擎难度参数自定义**（已确认：允许用户通过滑动条自定义 Elo 400~3200）
- **候选走法辅助开关**（已确认：默认关闭，用户可自行开启）

**对外接口**：
```javascript
SettingsModule.init()                     // 初始化设置面板
SettingsModule.setTheme(theme)            // theme: 'dark'|'light'
SettingsModule.setLanguage(lang)          // lang: 'zh'|'en'
SettingsModule.setSound(enabled)          // 音效开关
SettingsModule.setEngineConfig(config)    // 自定义引擎参数（如允许）
SettingsModule.get(key)                   // 获取某项设置值
```

**依赖**：
- `StorageModule` — 持久化用户偏好

**测试点**：
- 主题/语言切换后全站 UI 同步更新
- 设置项刷新后是否保留

---

### 4.7 StatsModule（统计模块）

**职责**：
- 对局历史列表（从 StorageModule 读取自动保存的记录）
- 胜率统计（总胜率、各难度胜率）
- 进步曲线（Elo 趋势或得分趋势，待详细设计）
- 坐标练习成绩记录
- **数据导出**（JSON / PGN）

**对外接口**：
```javascript
StatsModule.init()                        // 初始化统计界面
StatsModule.getGameHistory()              // 获取对局历史
StatsModule.getWinRate(difficulty?)       // 获取胜率，不传则返回总胜率
StatsModule.getProgressData()             // 获取进步曲线数据
StatsModule.exportData(format)            // 导出数据，format: 'json'|'pgn'
StatsModule.clearData()                   // 清空所有本地数据（需确认）
StatsModule.recordGameResult(result)      // 记录一局结果（由 BlindfoldModule 调用）
```

**依赖**：
- `StorageModule` — 读取/写入统计数据

**测试点**：
- 对局记录是否正确存储和读取
- 胜率计算是否准确
- 导出文件格式是否正确

**待详细设计**：
- "进步曲线"指标需**门槛低**（如对局时长趋势、步数趋势、胜率趋势，待具体确认）
- 成就系统（徽章）设计：门槛极低，新手友好（如"第一步"徽章——用户只走了1步退出也能获得）

---

### 4.8 ExitModule（退出模块）

**职责**：
- 退出流程处理
- 随机展示幽默台词

**对外接口**：
```javascript
ExitModule.init()                         // 初始化退出界面
ExitModule.showExitScreen()               // 显示退出屏幕
ExitModule.getRandomLine()                // 获取随机台词
```

**依赖**：无

**测试点**：
- 台词随机性覆盖
- 中英切换时台词是否正确

**已确认方向**：混合风格幽默台词（见第8节），退出时随机展示

---

### 4.9 BoardRenderer（棋盘渲染模块）

**职责**：
- 通用 8×8 棋盘网格渲染
- SVG 棋子渲染（MPChess 风格）
- 坐标标注（a-h, 1-8）
- 视角反转（黑方视角：a1 在右上，h8 在左下）
- 高亮效果（正确/错误/选中）
- 动画支持（震动、缩放、脉冲高亮）

**对外接口**：
```javascript
BoardRenderer.create(containerId, options)  // 创建棋盘实例
    // options: { showPieces: bool, squareSize: number, perspective: 'white'|'black' }
BoardRenderer.render(fen?)                  // 渲染局面，空 FEN 则渲染空棋盘
BoardRenderer.highlight(square, type)       // 高亮格子，type: 'correct'|'wrong'|'selected'
BoardRenderer.clearHighlight()              // 清除高亮
BoardRenderer.shake()                       // 触发震动动画
BoardRenderer.onSquareClick(callback)       // 注册格子点击回调
BoardRenderer.destroy()                     // 销毁实例，清理事件
```

**依赖**：无（纯渲染，无业务逻辑）

**测试点**：
- 64 格颜色交替正确
- 各棋子 SVG 正确显示
- 白/黑视角下行列反转正确
- 高亮和动画类正确添加/移除

---

### 4.10 EngineModule（引擎通信模块）

**职责**：
- Stockfish Worker 加载与管理
- UCI 命令收发
- 难度参数配置（Elo / Skill / Depth）
- **多 PV 分析**（获取 Top N 候选走法，用于"建议用户的下一步走法"辅助功能）

**对外接口**：
```javascript
EngineModule.init()                       // 初始化引擎，返回 Promise
EngineModule.setDifficulty(config)        // 设置难度
EngineModule.setPosition(fen)             // 设置当前局面
EngineModule.go(callback)                 // 开始思考，回调返回 bestmove UCI
EngineModule.goMultiPv(callback, pvCount) // 多 PV 分析，返回候选走法列表
EngineModule.stop()                       // 停止思考
EngineModule.terminate()                  // 销毁引擎
EngineModule.isReady()                    // 是否就绪
```

**依赖**：无

**测试点**：
- Worker 加载成功/失败处理
- 各难度下引擎回应是否符合配置
- 多 PV 分析是否正确返回候选走法

---

### 4.11 StorageModule（数据持久化模块）

**职责**：
- 封装 localStorage（小数据：设置、对局摘要）
- 封装 IndexedDB（大数据：对局记录、统计数据）
- 数据导出（JSON / PGN 文件下载）
- 数据导入（JSON 文件上传恢复）
- **解决"无登录记住用户"**：所有数据存本地，导出文件实现跨设备迁移

**对外接口**：
```javascript
StorageModule.init()                      // 初始化数据库
StorageModule.set(key, value)             // 存 localStorage
StorageModule.get(key)                    // 取 localStorage
StorageModule.addGameRecord(record)       // 添加对局记录到 IndexedDB
StorageModule.getGameRecords(filter?)     // 查询对局记录
StorageModule.addStat(entry)              // 添加统计条目
StorageModule.getStats(type)              // 获取统计数据
StorageModule.exportAll()                 // 导出全部数据为 JSON
StorageModule.importAll(jsonString)       // 从 JSON 导入数据
StorageModule.downloadPgn(pgnText)        // 下载 PGN 文件
```

**数据结构（草案）**：
```javascript
// 对局记录
GameRecord = {
    id: string,           // UUID
    date: string,         // ISO 日期
    mode: 'blindfold',    // 预留扩展
    difficulty: string,   // 'easy'|'medium'|'hard'|'expert'
    result: string,       // '1-0'|'0-1'|'1/2-1/2'|'*'
    pgn: string,          // 完整 PGN
    moves: number,        // 总步数
    duration: number      // 对局时长（秒）
}

// 统计条目（用于进步曲线）
StatEntry = {
    date: string,
    type: 'game'|'coordinate',
    score: number,        // 得分或评级
    accuracy: number      // 正确率（坐标练习）
}
```

**依赖**：无

**测试点**：
- localStorage 读写正常
- IndexedDB 增删改查正常
- 导出文件内容完整正确
- 导入后数据恢复正确

---

### 4.12 TestRunner（测试运行器）

**职责**：
- 纯 JS 实现，零外部依赖
- 支持定义测试套件和断言
- 可独立加载单个模块进行测试
- 输出测试报告到页面或控制台

**对外接口**：
```javascript
TestRunner.suite(name, fn)                // 定义测试套件
TestRunner.test(name, fn)                 // 定义单个测试
TestRunner.assert(condition, msg)         // 断言
TestRunner.assertEqual(a, b, msg)         // 相等断言
TestRunner.run()                          // 运行所有测试，输出报告
TestRunner.runModule(moduleName)          // 只运行指定模块的测试
```

**使用方式**：
```javascript
// 在独立 HTML 文件中加载被测模块 + TestRunner
TestRunner.suite('CoordinateModule', () => {
    TestRunner.test('ALL_SQUARES 包含 64 个坐标', () => {
        TestRunner.assertEqual(ALL_SQUARES.length, 64);
    });
});
TestRunner.run();
```

**依赖**：无

---

## 5. 模块间交互关系

### 5.1 调用关系矩阵

| 调用方 ↓ \ 被调用方 → | Welcome | Blindfold | Coordinate | Replay | Guide | Settings | Stats | Exit | BoardRenderer | Engine | Storage | TestRunner |
|----------------------|:-------:|:---------:|:----------:|:------:|:-----:|:--------:|:-----:|:----:|:-------------:|:------:|:-------:|:----------:|
| Welcome              |   —     |    nav    |    nav     |  nav   |  nav  |    —     |   —   |  —   |      —        |   —    |    —    |     —      |
| Blindfold            |   —     |    —      |     —      |   —    |   —   |   read   | emit  |  —   |     render    |  call  |  write  |     —      |
| Coordinate           |   —     |    —      |     —      |   —    |   —   |   read   | emit  |  —   |     render    |   —    |  write  |     —      |
| Replay               |   —     |    —      |     —      |   —    |   —   |   read   |   —   |  —   |     render    |   —    |  read   |     —      |
| Stats                |   —     |    —      |     —      |   —    |   —   |    —     |   —   |  —   |      —        |   —    |  read   |     —      |
| Settings             |   —     |    —      |     —      |   —    |   —   |    —     |   —   |  —   |      —        |   —    |  write  |     —      |

> **图例**：nav = 导航跳转，call = 直接调用，render = 渲染请求，read/write = 读写数据，emit = 触发事件/回调

### 5.2 事件/回调机制

模块间不直接互相调用，优先通过**回调注册**方式解耦：

```javascript
// 示例：BlindfoldModule 对局结束时通知 StatsModule
BlindfoldModule.onGameOver((result) => {
    StatsModule.recordGameResult(result);
    StorageModule.addGameRecord(result);
});
```

---

## 6. 数据持久化方案

### 6.1 "无登录记住用户"解决方案

| 存储方式 | 用途 | 容量 | 持久化 |
|---------|------|------|--------|
| **localStorage** | 用户设置（主题、语言、音效、难度偏好） | ~5MB | 长期 |
| **IndexedDB** | 对局记录、统计数据、坐标练习成绩 | 较大（>50MB） | 长期 |
| **导出 JSON** | 用户主动导出全部数据，实现跨设备迁移 | 无限制 | 文件形式 |
| **导入 JSON** | 从文件恢复数据到新设备/新浏览器 | 无限制 | 手动 |

### 6.2 数据生命周期

```
对局进行中 ──→ BlindfoldModule 每步走子更新内存状态
    │
    对局结束
    │
    ▼
自动保存 ──→ StorageModule.addGameRecord(record)
    │
    ▼
StatsModule 读取 ──→ 更新胜率、进步曲线
    │
    ▼
用户导出 ──→ 下载 JSON 文件（跨设备迁移）
```

### 6.3 用户成就感的实现思路（待详细设计）

在不用登录的前提下，通过本地数据构建成就系统：

- **连胜记录**：连续获胜场次
- **里程碑徽章**：首胜、十连胜、战胜 Expert 难度等
- **进步曲线**：对局时长趋势、步数趋势、胜率趋势
- **坐标练习等级**：根据正确率和速度评定等级

> 具体徽章设计和曲线指标在详细设计阶段确认。

---

## 7. 测试策略

### 7.1 测试运行器设计

**文件**：`js/test-runner.js`（约 50~80 行纯 JS）

**特性**：
- 零依赖，浏览器直接运行
- 支持同步和异步测试（async/await）
- 测试失败时打印堆栈
- 可生成简单 HTML 报告

### 7.2 各模块测试计划

| 模块 | 测试方式 | 关键用例 |
|------|---------|---------|
| BoardRenderer | 独立 HTML 加载 | 渲染空棋盘、渲染初始局面、白/黑视角、高亮类 |
| EngineModule | 独立 HTML 加载 | 初始化、设置难度、返回 bestmove、多 PV |
| StorageModule | 独立 HTML 加载 | 读写 localStorage、IndexedDB CRUD、导入导出 |
| CoordinateModule | 独立 HTML 加载 | 随机坐标覆盖、答错强制重选、计时器、视角反转 |
| BlindfoldModule | 独立 HTML 加载 | 走子验证、终局判定、PGN 格式、自动保存触发 |
| SettingsModule | 集成测试 | 主题/语言切换后全站同步 |

### 7.3 测试文件组织

```
docs/
└── tests/                    # 测试文件目录
    ├── test-runner.html      # 总入口，运行全部模块测试
    ├── test-board.html       # BoardRenderer 独立测试
    ├── test-engine.html      # EngineModule 独立测试
    ├── test-storage.html     # StorageModule 独立测试
    ├── test-coordinate.html  # CoordinateModule 独立测试
    └── test-blindfold.html   # BlindfoldModule 独立测试
```

> 注意：测试文件放在 `docs/tests/`（实验区），验证通过后再考虑是否迁移到主项目。

---

## 8. 已确认决策 & 待细化事项

### 8.1 已确认决策

| 序号 | 事项 | 决策内容 | 影响模块 |
|------|------|---------|---------|
| 1 | **内置名局数量** | 保留 **100 个**经典对局 | ReplayModule |
| 2 | **欢迎页视觉风格** | **统一苹果风格**（简洁、毛玻璃、圆角、SF 字体栈） | WelcomeModule |
| 3 | **幽默台词文案（中文）** | ①"这对我来说太难了，我要去打开 TikTok 放松一下" ②"一代天才，就此陨落" | ExitModule |
| 4 | **进步曲线指标** | **门槛低**，简单易懂（待详细设计给出具体指标选项） | StatsModule |
| 5 | **成就系统（徽章）** | **门槛极低**，新手友好。例如：只走 1 步后退出也能获得"第一步"徽章 | StatsModule |
| 6 | **引擎候选走法用途** | 作为**"建议用户的下一步走法"**展示给用户 | BlindfoldModule, EngineModule |
| 7 | **引擎难度自定义** | **允许自定义 Elo 数值**（不限于四个预设） | SettingsModule, EngineModule |

### 8.2 已细化决策

| 序号 | 事项 | 最终决策 |
|------|------|---------|
| A | **幽默台词英文版** | 直接翻译。中文 2 句，英文对应：①"This is too hard for me. I'm going to open TikTok and relax." ②"A brilliant mind, fallen just like that." |
| B | **进步曲线具体指标** | **①②③ 全加上**：①对局总时长趋势 ②平均生存步数趋势 ③各难度胜率变化 |
| C | **徽章清单** | 按草案先搭建：「第一步」「初尝败绩」「十步之遥」「首胜」「连败不屈」，后续可扩展 |
| D | **100个名局数据来源** | 从 **Lichess** 公开数据库获取经典对局 PGN，本地打包为 `data/games.js` |
| E | **候选走法展示形式** | 输入框上方展示 **Top 3 候选走法 + 引擎评分**；增加**用户开关**，**默认关闭**，用户可自行开启 |
| F | **自定义 Elo 范围与交互** | 范围 **400 ~ 3200**，**滑动条**调节，步进 50 或 100 |

---

## 9. 风险与限制

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| IndexedDB 被用户手动清除 | 数据丢失 | 提供导出功能，引导用户定期备份 |
| Stockfish CDN 不可用 | 核心功能瘫痪 | Blob Worker 回退 + 考虑本地托管 |
| 纯前端无法实现多设备同步 | 用户体验受限 | 导出/导入 JSON 作为替代方案 |
| 无专业测试框架 | 回归风险 | TestRunner + 关键逻辑防御式编程 |

---

## 10. 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-05-17 | v1.0 | 初始版本，基于 `docs/proposal.md` 划分 12 个功能域模块 |
