# Batch 4 — 并行派发提示词（Meta-Prompt）

> 用途：将此提示词直接粘贴给支持 Agent/Tool 调用的 AI CLI，由 AI 自动并行 dispatch 三个 subAgent 完成第4批模块。

---

## 项目信息

- **项目路径**：`D:\Vibe-Code\blindfold-chess`
- **技术栈**：纯 HTML + CSS + JS，零框架，零 npm
- **当前状态**：第1-3批已全部完成（TestRunner、StorageModule、BoardRenderer、EngineModule、WelcomeModule、GuideModule、BlindfoldModule、CoordinateModule、SettingsModule）
- **本批次目标**：同时实现 ExitModule、StatsModule、ReplayModule 三个扩展模块

---

## 执行策略

你是项目总控（Orchestrator）。请**同时创建三个 subAgent（并行/后台执行）**，分别负责一个模块。三个模块逻辑独立，没有相互依赖。

每个 subAgent 完成后会向你回报结果。等三个都完成后，你统一向我（用户）汇报：
1. 各模块创建的文件清单
2. Node.js 测试结果（通过/失败数）
3. 已知限制或需要注意的事项

**关键规则**：三个 subAgent 各自只创建 `.js` 文件和 `docs/tests/` 下的测试文件，**禁止修改 `index.html` 和 `css/style.css`**。你（Orchestrator）最后统一将三个模块集成到 `index.html`。

---

## 模块一：ExitModule

### 接口规范
```javascript
window.ExitModule = {
  init(),               // 初始化退出界面，绑定事件
  showExitScreen(),     // 显示退出屏幕（切换 screen 的 active/hidden 类）
  getRandomLine()       // 返回随机幽默台词字符串
};
```

### 功能要求
- 退出流程处理：从任意屏幕导航到 `exitScreen`
- 随机展示幽默台词，已确认文案：
  - 中文：①"这对我来说太难了，我要去打开 TikTok 放松一下" ②"一代天才，就此陨落"
  - 英文：①"This is too hard for me. I'm going to open TikTok and relax." ②"A brilliant mind, fallen just like that."
- 支持中英切换：通过 `SettingsModule.get('lang')` 读取当前语言，没有 SettingsModule 时默认 'zh'
- 视觉风格：统一苹果风格（简洁、毛玻璃、圆角、SF 字体栈）

### 需要读取的文件
1. `D:\Vibe-Code\blindfold-chess\docs\high-Level Design.md` §4.8
2. `D:\Vibe-Code\blindfold-chess\docs\tasks\task-exit.md`
3. `D:\Vibe-Code\blindfold-chess\prompt.md` §一、§四
4. `D:\Vibe-Code\blindfold-chess\index.html`（参考现有的 `exitScreen` 结构）
5. `D:\Vibe-Code\blindfold-chess\js\storage.js`（如需持久化退出次数等数据）

### 交付文件
- `js/exit.js`
- `docs/tests/test-exit-node.js`（Node.js 测试，提供 DOM mock）
- `docs/tests/test-exit.html`（浏览器测试）

### 测试要点
- 接口存在性
- `getRandomLine()` 随机性覆盖全部4条文案
- 语言切换后台词是否正确
- `showExitScreen()` 是否正确显示 `exitScreen`（检查 classList）
- 无全局变量泄漏

---

## 模块二：StatsModule

### 接口规范
```javascript
window.StatsModule = {
  init(),                        // 初始化统计界面
  getGameHistory(),              // 获取对局历史列表（从 StorageModule 读取）
  getWinRate(difficulty?),       // 获取胜率，不传 difficulty 则返回总胜率
  getProgressData(),             // 获取进步曲线数据
  exportData(format),            // 导出数据，format: 'json'|'pgn'
  clearData(),                   // 清空所有本地数据（需弹窗确认）
  recordGameResult(result)       // 记录一局结果（由 BlindfoldModule 调用）
};
```

### 功能要求
- **对局历史列表**：从 `StorageModule.getGameRecords()` 读取，展示难度、结果、日期、步数、时长
- **胜率统计**：总胜率 + 各难度（easy/medium/hard/expert）胜率
- **进步曲线**：三个指标，用纯 Canvas 手写极简折线图：
  ① 对局总时长趋势
  ② 平均生存步数趋势
  ③ 各难度胜率变化
- **坐标练习成绩**：从 `StorageModule.getCoordinateRecords()` 读取
- **数据导出**：
  - `exportData('json')` → 导出全部数据（对局记录+统计+坐标成绩）为 JSON 字符串
  - `exportData('pgn')` → 导出所有对局 PGN 合并文本
- **成就徽章**（门槛极低，新手友好）：
  - 「第一步」—— 完成过至少1局对局
  - 「初尝败绩」—— 输过至少1局
  - 「十步之遥」—— 单局存活10步以上
  - 「首胜」—— 赢过至少1局
  - 「连败不屈」—— 连续输3局后仍继续下棋

### 数据结构契约（严格遵守）
```javascript
// GameRecord（对局记录）
{
  id: string,           // UUID
  date: string,         // ISO 日期
  mode: 'blindfold',
  difficulty: 'easy'|'medium'|'hard'|'expert',
  result: '1-0'|'0-1'|'1/2-1/2'|'*',
  pgn: string,
  moves: number,        // 总步数
  duration: number      // 对局时长（秒）
}

// CoordinateRecord（坐标练习记录）
{
  id: string,
  date: string,
  mode: 'a'|'b',
  side: 'white'|'black',
  score: number,
  total: number,
  accuracy: number,     // 0~1
  duration: number      // 秒
}
```

### 需要读取的文件
1. `D:\Vibe-Code\blindfold-chess\docs\high-Level Design.md` §4.7
2. `D:\Vibe-Code\blindfold-chess\docs\tasks\task-stats.md`
3. `D:\Vibe-Code\blindfold-chess\prompt.md` §一、§四、§六
4. `D:\Vibe-Code\blindfold-chess\js\storage.js`（StorageModule 接口）
5. `D:\Vibe-Code\blindfold-chess\index.html`（参考 screen 结构）

### 交付文件
- `js/stats.js`
- `docs/tests/test-stats-node.js`（Node.js 测试，需 mock StorageModule 和 DOM）
- `docs/tests/test-stats.html`（浏览器测试）

### 测试要点
- 接口存在性
- 胜率计算准确性（边界：0局、全赢、全输、混合胜负）
- 进步曲线数据生成是否正确
- 成就徽章判定逻辑（各徽章的触发条件）
- `exportData('json')` / `exportData('pgn')` 输出格式
- `recordGameResult` 是否正确写入 StorageModule
- 无全局变量泄漏

---

## 模块三：ReplayModule

### 接口规范
```javascript
window.ReplayModule = {
  init(),                       // 初始化复盘界面
  loadPgn(pgnText),             // 方式1：加载 PGN 文本，解析为走法列表
  verifyMove(input),            // 方式2：验证单步输入是否正确
  loadClassicGame(id),          // 方式3：加载内置名局
  navigateToMove(index),        // 跳转到指定步（index 从0开始）
  toggleBoard(),                // 显示/隐藏当前局面棋盘
  getCurrentFen()               // 获取当前步的 FEN 字符串
};
```

### 功能要求
- **方式1 PGN 加载**：解析标准 PGN 格式（支持 `1.e4 e5 2.Nf3 Nc6` 这种格式），生成可点击的走法列表
- **方式2 逐条验证**：用户输入单步走法（如 `e4`），用 `chess.js` 验证是否为当前局面的合法走法
- **方式3 内置名局**：创建 `data/games.js`，先放入 **5 个经典名局的 PGN 数据** 作为占位（后续再扩展到100个）
- **走法导航**：点击走法列表跳转、键盘 `←` `→` 导航、自动播放（可选）
- **棋盘显示**：用 `BoardRenderer.create(containerId, options)` 渲染当前局面，支持显示/隐藏切换
- **语言支持**：通过 `SettingsModule.get('lang')` 读取当前语言

### 需要读取的文件
1. `D:\Vibe-Code\blindfold-chess\docs\high-Level Design.md` §4.4
2. `D:\Vibe-Code\blindfold-chess\docs\tasks\task-replay.md`
3. `D:\Vibe-Code\blindfold-chess\prompt.md` §一、§四
4. `D:\Vibe-Code\blindfold-chess\js\board-renderer.js`（BoardRenderer 接口）
5. `D:\Vibe-Code\blindfold-chess\js\storage.js`（StorageModule 接口）
6. `D:\Vibe-Code\blindfold-chess\index.html`（参考 screen 结构）

### 交付文件
- `js/replay.js`
- `data/games.js`（5个占位经典名局 PGN 数据）
- `docs/tests/test-replay-node.js`（Node.js 测试，需 mock DOM、BoardRenderer、chess.js）
- `docs/tests/test-replay.html`（浏览器测试）

### 测试要点
- 接口存在性
- PGN 解析是否正确（标准格式、变着、注释可忽略）
- 逐条输入验证是否严格匹配当前局面合法走法
- 走法导航是否同步更新局面和 FEN
- 加载内置名局 `loadClassicGame(id)` 是否正常
- `getCurrentFen()` 返回格式是否正确
- 无全局变量泄漏

---

## 全局约束（三个模块都必须遵守）

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
   - StorageModule 不可用时 fallback 到 `localStorage.setItem/getItem`
5. **测试**
   - 必须创建 `docs/tests/test-{module}-node.js`，在 Node.js 中运行（提供 DOM mock）
   - 必须创建 `docs/tests/test-{module}.html`，在浏览器中运行
   - 测试不通过不算完成
6. **禁止修改的文件**
   - 三个 subAgent **各自禁止修改** `index.html` 和 `css/style.css`
   - 禁止删除 `common.js` 中的原有代码

---

## 集成步骤（三个 subAgent 全部完成后，由你执行）

1. 更新 `index.html`：
   - 在 `body` 内添加三个模块各自的 `screen` 区块（参考现有 `exitScreen` / `gameScreen` 结构）
   - 在 `</body>` 前按顺序添加 `<script src="js/exit.js"></script>`、`<script src="js/stats.js"></script>`、`<script src="js/replay.js"></script>`
2. 更新 `js/main.js`：在初始化顺序中调用 `ExitModule.init()`、`StatsModule.init()`、`ReplayModule.init()`
3. 如有需要，微调 `css/style.css` 补充模块专属样式（保持苹果风格一致）

---

## 汇报格式

等三个 subAgent 全部完成后，请按以下格式向我汇报：

```
## 第4批完成报告

### 1. 文件清单
- 新建：...
- 修改：...

### 2. 测试结果
- ExitModule：X passed, Y failed
- StatsModule：X passed, Y failed
- ReplayModule：X passed, Y failed

### 3. 已知限制
- ...
```
