# Token Monitor

桌面端 LLM 余额实时监控工具，支持 DeepSeek 和 小米 MiMo。

![platform](https://img.shields.io/badge/platform-Windows-blue)
![tech](https://img.shields.io/badge/tech-Electron%20%2B%20React%20%2B%20TypeScript-brightgreen)

## 功能

- **多服务监控** — DeepSeek、MiMo、Token Plan 三合一
- **纯托盘运行** — 启动后隐藏到系统托盘，零窗口干扰
- **双击弹出面板** — 右下角毛玻璃弹窗，入场动画，失焦自动隐藏
- **极简模式** — 鼠标悬停托盘图标显示余额，不用打开任何窗口
- **Cookie 自动捕获** — MiMo 一键登录弹窗，登录后自动抓取 Cookie（不用手动复制）
- **今日消耗** — 显示今日已花费金额，直观实用
- **百分比展示** — Token Plan 显示剩余百分比 + 彩色进度条
- **快捷充值** — 卡片内置充值链接，一键跳转
- **三级预警** — 剩余时间 ≤ 2h 提醒 / ≤ 1h 警告 / ≤ 15min 紧急，气泡 5 秒自动消失
- **桌面快捷方式** — 首次启动自动创建，静默启动无黑窗

## 界面

托盘 + 右下角弹出面板，暗色毛玻璃风格。

- 呼吸灯状态指示（正常 / 警告 / 紧急 / 离线）
- 数字过渡动画
- Token Plan 百分比进度条
- 告警横幅 + 桌面气泡通知

## 快速开始

### 环境要求

- Node.js 18+
- Windows 10/11

### 安装运行

```bash
git clone https://github.com/azaz6az/token-monitor-next.git
cd token-monitor-next
npm install
npm start
```

> 国内用户如遇 Electron 下载失败：
> ```bash
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm install electron
> ```

### 使用

1. 启动后托盘出现绿色圆点图标
2. 右键托盘 → 「显示/隐藏面板」→ 点击「认证配置」
3. **DeepSeek**：填写 API Key（`sk-...`）→ 保存
4. **MiMo**：点击「登录获取 Cookie」→ 弹出浏览器窗口登录 → 关闭窗口自动保存
5. 每 60 秒自动轮询刷新余额
6. 双击托盘图标弹出完整面板
7. 右键托盘 → 「极简模式」→ 悬停图标看余额

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Electron 42 |
| 前端 | React 19 + TypeScript |
| 构建 | Vite + tsc |
| 存储 | JSON 文件本地持久化（防抖批量写入）|
| 安全 | safeStorage 加密 / contextIsolation |

## 项目结构

```
src/
├── main/
│   ├── main.ts               # 入口，生命周期，极简模式
│   ├── constants.ts           # 共享常量
│   ├── api/clients.ts        # DeepSeek/MiMo API + Cookie 自动捕获
│   ├── db/database.ts        # JSON 存储（防抖批量写入）
│   ├── engine/
│   │   ├── poller.ts         # 60s 轮询 + 统一 pollService
│   │   ├── rate.ts           # 速率计算
│   │   └── alerts.ts         # 三级预警（5s 自动消失）
│   ├── ipc/handlers.ts       # IPC 通道
│   └── windows/manager.ts    # 托盘 / 弹窗面板 / 气泡通知
├── preload/preload.ts        # contextBridge
└── renderer/
    ├── App.tsx
    ├── global.css            # 暗色毛玻璃 + 入场动画
    ├── components/
    │   ├── ServiceCard.tsx   # 服务卡片（余额/今日消耗/百分比/充值）
    │   ├── StatusDot.tsx     # 呼吸灯
    │   ├── AnimatedNumber.tsx # 数字动画
    │   ├── AlertBanner.tsx   # 预警横幅
    │   └── SettingsPanel.tsx # 认证配置
    └── hooks/useTokenData.ts # 数据订阅
```

## License

MIT
