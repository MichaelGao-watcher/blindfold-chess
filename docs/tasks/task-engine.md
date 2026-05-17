# Task: EngineModule（引擎通信模块）

> 模块状态：已实现（需完善）  
> 目标：封装 Stockfish Web Worker，支持 UCI 通信、难度配置、多 PV 分析  
> 设计文档：high-Level Design.md §4.10

---

## 子任务清单

### Worker 管理
- [x] **EN-01** `EngineModule.init()` 加载 Stockfish Web Worker，返回 Promise
- [x] **EN-02** Worker 加载失败处理：重试机制或错误提示
- [x] **EN-03** Stockfish CDN 不可用时 Blob Worker 回退方案
- [x] **EN-04** `EngineModule.terminate()` 安全销毁引擎，释放资源
- [x] **EN-05** `EngineModule.isReady()` 检查引擎是否就绪

### UCI 通信封装
- [x] **EN-06** 发送 UCI 命令：`uci`, `isready`, `position`, `go`, `stop`
- [x] **EN-07** 接收 UCI 输出解析：`bestmove`, `info`, `readyok`
- [x] **EN-08** 命令队列管理：确保命令按顺序发送，避免并发冲突
- [x] **EN-09** 思考超时处理：防止引擎长时间无响应

### 难度配置
- [x] **EN-10** `EngineModule.setDifficulty(config)` 设置引擎难度
- [x] **EN-11** 预设难度映射：
  - Easy: Elo ~800, Skill Level ~5
  - Medium: Elo ~1400, Skill Level ~10
  - Hard: Elo ~2000, Skill Level ~15
  - Expert: Elo ~2800, Skill Level ~20
- [x] **EN-12** 自定义 Elo 映射：400~3200 映射到 Stockfish 内部参数（UCI_LimitStrength, UCI_Elo）
- [x] **EN-13** 设置 `UCI_LimitStrength true` 启用 Elo 限制模式
- [x] **EN-14** 思考深度配置（`Depth` 限制，用于低难度）

### 单 PV 思考
- [x] **EN-15** `EngineModule.go(callback)` 开始思考
- [x] **EN-16** 设置当前局面：`position fen <FEN>` 或 `position startpos moves ...`
- [x] **EN-17** 发送 `go movetime <ms>` 控制思考时间
- [x] **EN-18** 解析 `bestmove <move>` 返回最佳走法
- [x] **EN-19** 回调返回 UCI 格式走法（如 `e2e4`）
- [x] **EN-20** `EngineModule.stop()` 停止当前思考

### 多 PV 分析
- [x] **EN-21** `EngineModule.goMultiPv(callback, pvCount)` 多 PV 分析
- [x] **EN-22** 设置 `MultiPV <n>` 获取 Top N 候选走法
- [x] **EN-23** 解析 `info multipv <n> score cp <x> pv <moves>` 输出
- [x] **EN-24** 返回候选走法列表：`[{ move, score, pv }]`
- [x] **EN-25** 评分转换：centipawn 转人类可读格式（如 `+0.5`）

### 状态管理
- [x] **EN-26** 引擎状态机：idle → thinking → ready → terminated
- [x] **EN-27** 状态校验：思考中再次调用 go 时给出警告或自动 stop
- [x] **EN-28** 异步回调安全：引擎已销毁后忽略延迟到达的消息

### 测试与优化
- [x] **EN-29** 测试 Worker 加载成功/失败处理
- [x] **EN-30** 测试各难度下引擎回应是否符合配置（走法强度）
- [x] **EN-31** 测试多 PV 分析是否正确返回候选走法
- [x] **EN-32** 测试长时间对局引擎稳定性（内存泄漏检查）
- [x] **EN-33** 测试 `stop()` 和 `terminate()` 是否正确清理资源
