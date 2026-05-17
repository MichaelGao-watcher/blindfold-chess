# Task: TestRunner（测试运行器）

> 模块状态：需新建  
> 目标：纯 JS 实现零依赖测试框架，支持断言、套件、异步测试和报告  
> 设计文档：high-Level Design.md §4.12, §7

---

## 子任务清单

### 测试运行器核心
- [x] **TR-01** 创建 `js/test-runner.js`（约 50~80 行纯 JS）
- [x] **TR-02** `TestRunner.suite(name, fn)` 定义测试套件
- [x] **TR-03** `TestRunner.test(name, fn)` 定义单个测试用例
- [x] **TR-04** `TestRunner.assert(condition, msg)` 基础断言
- [x] **TR-05** `TestRunner.assertEqual(a, b, msg)` 相等断言（深度比较对象）
- [x] **TR-06** `TestRunner.assertThrows(fn, msg)` 异常断言

### 异步测试支持
- [x] **TR-07** 支持 async/await 测试函数
- [x] **TR-08** 异步测试超时处理（默认 5 秒）
- [x] **TR-09** 异步测试错误捕获：Promise reject 转为测试失败

### 测试执行
- [x] **TR-10** `TestRunner.run()` 运行所有已注册的测试套件
- [x] **TR-11** `TestRunner.runModule(moduleName)` 只运行指定模块的测试
- [x] **TR-12** 测试执行顺序：按 suite 注册顺序，suite 内按 test 注册顺序
- [x] **TR-13** 测试隔离：每个 test 独立运行，失败不影响后续测试

### 测试报告
- [x] **TR-14** 控制台输出：用 ✓ / ✗ 标识通过/失败，显示耗时
- [x] **TR-15** 失败时打印详细错误信息和堆栈跟踪
- [x] **TR-16** 汇总统计：总用例数、通过数、失败数、耗时
- [x] **TR-17** 可选 HTML 报告输出（在页面中渲染结果列表）

### 测试文件组织
- [x] **TR-18** 创建 `docs/tests/` 目录
- [x] **TR-19** `docs/tests/test-runner.html`：总入口，运行全部模块测试
- [ ] **TR-20** `docs/tests/test-board.html`：BoardRenderer 独立测试
- [ ] **TR-21** `docs/tests/test-engine.html`：EngineModule 独立测试
- [ ] **TR-22** `docs/tests/test-storage.html`：StorageModule 独立测试
- [ ] **TR-23** `docs/tests/test-coordinate.html`：CoordinateModule 独立测试
- [ ] **TR-24** `docs/tests/test-blindfold.html`：BlindfoldModule 独立测试

### 各模块测试用例编写

#### BoardRenderer 测试
- [ ] **TR-25** 测试渲染空棋盘（64 格，颜色交替）
- [ ] **TR-26** 测试渲染初始局面（32 个棋子正确位置）
- [ ] **TR-27** 测试白方/黑方视角行列反转
- [ ] **TR-28** 测试高亮类正确添加/移除

#### EngineModule 测试
- [ ] **TR-29** 测试引擎初始化成功
- [ ] **TR-30** 测试设置难度后参数正确
- [ ] **TR-31** 测试返回 bestmove 格式正确
- [ ] **TR-32** 测试多 PV 分析返回列表

#### StorageModule 测试
- [ ] **TR-33** 测试 localStorage 读写
- [ ] **TR-34** 测试 IndexedDB 增删改查
- [ ] **TR-35** 测试导出 JSON 结构完整
- [ ] **TR-36** 测试导入后数据一致

#### CoordinateModule 测试
- [ ] **TR-37** 测试 ALL_SQUARES 包含 64 个坐标
- [ ] **TR-38** 测试随机坐标不重复（一轮内）
- [ ] **TR-39** 测试答错强制重选逻辑
- [ ] **TR-40** 测试计时器精度

#### BlindfoldModule 测试
- [ ] **TR-41** 测试走子验证（合法/非法）
- [ ] **TR-42** 测试终局判定（将杀/逼和）
- [ ] **TR-43** 测试 PGN 格式输出
- [ ] **TR-44** 测试自动保存触发

### 集成测试
- [ ] **TR-45** 测试 SettingsModule 主题切换后全站同步
- [ ] **TR-46** 测试 SettingsModule 语言切换后全站同步

### 测试与优化
- [x] **TR-47** 测试 TestRunner 自身：断言失败时正确报告
- [x] **TR-48** 测试 TestRunner 自身：异步测试超时处理
- [x] **TR-49** 确保测试运行器零依赖（不引入任何外部库）
