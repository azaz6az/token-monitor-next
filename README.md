# Token Monitor

桌面端 LLM API Token 用量实时监控工具，支持 DeepSeek 和 小米 MiMo。

![screenshot](https://img.shields.io/badge/platform-Windows-blue)
![tech](https://img.shields.io/badge/tech-Electron%20%2B%20React%20%2B%20TypeScript-brightgreen)

## 功能

- **多服务监控** — 同时监控 DeepSeek 和 MiMo 余额
- **实时轮询** — 每 30 秒自动拉取最新余额
- **消耗速率** — 基于余额变化估算 Token 消耗速率（/min）
- **已消耗 Token** — 会话累计 Token 消耗量
- **三级预警** — 剩余时间 ≤ 2h 提醒 / ≤ 1h 警告 / ≤ 15min 紧急
- **气泡弹窗** — 桌面右下角弹出预警通知
- **API Key 加密** — 使用 Electron safeStorage 加密存储
- **手动修正** — 支持手动修改余额数值

## 界面

暗色毛玻璃风格小窗（340×480），始终置顶，无边框可拖拽。

- 毛玻璃半透明卡片 + 渐变流光进度条
- 呼吸灯状态指示
- Canvas 迷你消耗趋势折线图
- 数字过渡动画

## 快速开始

### 环境要求

- Node.js 18+
- Windows 10/11

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/azaz6az/token-monitor-next.git
cd token-monitor-next

# 安装依赖
npm install

# 启动（首次会下载 Electron 二进制）
npm start
```

> 国内用户如遇 Electron 下载失败，先设置镜像：
> ```bash
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm install electron
> ```

### 使用

1. 启动后看到两个服务卡片
2. 点击底部「API 配置」输入 API Key
3. 保存后自动开始 30 秒轮询
4. 卡片显示实时余额、消耗速率、已消耗 Token
5. 余额不足时自动弹出气泡预警

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Electron 42 |
| 前端 | React 19 + TypeScript |
| 构建 | Vite + tsc |
| 存储 | JSON 文件本地持久化 |
| 安全 | safeStorage 加密 / contextIsolation |

## 项目结构

```
src/
├── main/                     # Electron 主进程
│   ├── main.ts               # 入口，生命周期
│   ├── api/clients.ts        # DeepSeek / MiMo API 客户端
│   ├── db/database.ts        # JSON 文件存储
│   ├── engine/
│   │   ├── poller.ts         # 30s 轮询调度
│   │   ├── rate.ts           # 滑动窗口速率计算
│   │   └── alerts.ts         # 三级预警引擎
│   ├── ipc/handlers.ts       # IPC 通道
│   └── windows/manager.ts    # 窗口 / 气泡管理
├── preload/preload.ts        # contextBridge
└── renderer/                 # React 渲染进程
    ├── App.tsx
    ├── global.css            # 暗色毛玻璃主题
    ├── components/
    │   ├── ServiceCard.tsx   # 服务卡片
    │   ├── ProgressBar.tsx   # 渐变进度条
    │   ├── StatusDot.tsx     # 呼吸灯
    │   ├── MiniChart.tsx     # 迷你折线图
    │   ├── AnimatedNumber.tsx # 数字动画
    │   ├── AlertBanner.tsx   # 预警横幅
    │   └── SettingsPanel.tsx # API 配置面板
    └── hooks/useTokenData.ts # 数据订阅
```

## License

MIT
