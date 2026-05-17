# Task: StorageModule（数据持久化模块）

> 模块状态：需新建  
> 目标：封装 localStorage 和 IndexedDB，实现数据持久化、导入导出  
> 设计文档：high-Level Design.md §4.11

---

## 子任务清单

### localStorage 封装
- [x] **SM-01** `StorageModule.set(key, value)` 存入 localStorage（自动 JSON 序列化）
- [x] **SM-02** `StorageModule.get(key)` 读取 localStorage（自动 JSON 反序列化）
- [x] **SM-03** `StorageModule.remove(key)` 删除指定 key
- [x] **SM-04** 异常处理：localStorage 满时给出提示
- [x] **SM-05** 键名命名规范：统一前缀 `blindfold_chess_`

### IndexedDB 初始化
- [x] **SM-06** `StorageModule.init()` 打开/创建 IndexedDB 数据库
- [x] **SM-07** 数据库名称：`BlindfoldChessDB`，版本管理
- [x] **SM-08** ObjectStore 设计：
  - `gameRecords`：对局记录（主键 id，索引 date/difficulty/result）
  - `stats`：统计条目（主键 id，索引 date/type）
  - `coordinateRecords`：坐标练习记录（主键 id，索引 date）
- [x] **SM-09** 数据库升级策略：版本变更时迁移旧数据

### 对局记录 CRUD
- [x] **SM-10** `StorageModule.addGameRecord(record)` 添加对局记录
- [x] **SM-11** `StorageModule.getGameRecords(filter?)` 查询对局记录（支持按难度、结果、日期范围筛选）
- [x] **SM-12** `StorageModule.getGameRecordById(id)` 按 ID 查询单条记录
- [x] **SM-13** `StorageModule.deleteGameRecord(id)` 删除单条记录
- [x] **SM-14** 对局记录数据结构验证（必填字段检查）

### 统计数据 CRUD
- [x] **SM-15** `StorageModule.addStat(entry)` 添加统计条目
- [x] **SM-16** `StorageModule.getStats(type?)` 查询统计数据（type: 'game'|'coordinate'）
- [x] **SM-17** `StorageModule.getStatsByDateRange(start, end)` 按日期范围查询

### 坐标练习记录
- [x] **SM-18** `StorageModule.addCoordinateRecord(record)` 添加坐标练习记录
- [x] **SM-19** `StorageModule.getCoordinateRecords()` 查询坐标练习历史
- [x] **SM-20** 坐标练习记录结构：`{ id, date, mode, side, score, total, accuracy, duration }`

### 数据导出
- [x] **SM-21** `StorageModule.exportAll()` 导出全部数据为 JSON 字符串
- [x] **SM-22** 导出内容包含：设置、对局记录、统计数据、坐标练习记录
- [x] **SM-23** `StorageModule.downloadPgn(pgnText)` 下载 PGN 文件（Blob + 临时 a 标签）
- [x] **SM-24** 导出文件名自动生成：`blindfold-chess-backup-YYYY-MM-DD.json`

### 数据导入
- [x] **SM-25** `StorageModule.importAll(jsonString)` 从 JSON 字符串导入数据
- [x] **SM-26** 导入数据校验：检查结构完整性，拒绝非法格式
- [x] **SM-27** 导入冲突处理：合并或覆盖策略（提示用户选择）
- [x] **SM-28** 文件上传 UI：隐藏的 `<input type="file">` 触发导入

### 数据清理
- [x] **SM-29** `StorageModule.clearAll()` 清空所有本地数据（localStorage + IndexedDB）
- [x] **SM-30** 清理前二次确认，防止误操作

### 测试与优化
- [x] **SM-31** 测试 localStorage 读写正常
- [x] **SM-32** 测试 IndexedDB 增删改查正常
- [x] **SM-33** 测试导出文件内容完整正确
- [x] **SM-34** 测试导入后数据恢复正确
- [x] **SM-35** 测试大数据量时性能（1000+ 对局记录）
