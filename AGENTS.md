# AGENTS.md — Blindfold Chess（盲棋项目）

## 项目概述

- **名称**：blindfold-chess（盲棋）
- **类型**：可互动的网页 / HTML 应用
- **技术栈**：纯 HTML + CSS + JS（手写，不引入框架）
- **仓库**：https://github.com/MichaelGao-watcher/blindfold-chess
- **本地路径**：`E:\工作文件\blindfold-chess`

## 技术决策（已确定，勿改）

| 决策项 | 选择 | 原因 |
|--------|------|------|
| 前端技术栈 | **HTML + CSS + JS** | 项目规模小，纯手写完全够用 |
| 框架 | **暂不使用 React / Vue** | 当前只需一个互动棋盘页面，框架会增加不必要复杂度 |
| 后续扩展 | 如需在线对战、用户系统等功能，再评估引入框架 |

> 记录日期：2026-05-15

## 项目结构

```
blindfold-chess/
├── index.html       # 主入口（正在开发的页面）
├── .gitignore       # Git 忽略规则
├── README.md        # 项目说明（含技术决策记录）
├── 备忘录.md        # 命令速查表（Git、终端、概念解释）
└── AGENTS.md        # 本文件（AI 上下文恢复）
```

## 当前状态

- ✅ GitHub 仓库已创建并连接
- ✅ 基础文件已推送（.gitignore、README、index.html、备忘录、AGENTS）
- ✅ `index.html` 只有一个深色主题的占位页面
- ⬜ 等待用户确定具体功能和交互设计

## 开发方式

**无外部依赖**，无需 npm / pip / 任何包管理器：
- 直接用 VS Code 编辑 `index.html`
- 双击 `index.html` 用浏览器打开即可预览
- 改完保存（Ctrl+S），浏览器按 F5 刷新看效果

## 常用命令

```bash
# 预览：双击 index.html 用浏览器打开

# 上传代码到 GitHub
git add .
git commit -m "修改说明"
git push

# 另一台电脑下载最新代码
git pull

# 新电脑第一次克隆
git clone https://github.com/MichaelGao-watcher/blindfold-chess.git
```

> 更详细的 Git 命令和终端操作说明，见 `备忘录.md`

## 新会话恢复规则

当用户说**"恢复"、"继续"、"状态"、"检查过状态"**等关键词时：

1. **优先读取本文件（`AGENTS.md`）**恢复项目上下文
2. 如用户问 Git 命令或技术概念，引导查看 `备忘录.md`
3. 所有源码修改直接通过工具操作文件系统
4. **不要猜测用户意图**——盲棋的具体功能设计（棋盘样式、交互方式、规则等）必须由用户明确说明后再实现

## 给后续 AI 的提醒

- 本项目**没有敏感配置**（无 .env、无 API 密钥）
- **不要擅自引入框架**（React/Vue/npm 等），除非用户明确要求
- 所有修改应最小化，保持代码简洁易懂
- 修改后记得 `git add` → `git commit` → `git push`
