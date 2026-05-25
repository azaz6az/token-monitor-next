import { BrowserWindow, screen, Notification, Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { AlertState } from '../engine/alerts';
import { getIsQuitting } from '../state';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const bubbleWindows: BrowserWindow[] = [];
const BUBBLE_WIDTH = 280;
const BUBBLE_HEIGHT = 150;
const BUBBLE_OFFSET = 80;
const bubbleCooldown: Record<string, number> = {};

function createTrayIcon(): Electron.NativeImage {
  // 16x16 简单图标：深色背景 + 绿色圆点
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = x - 7.5, cy = y - 7.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < 5) {
        // 绿色圆点
        buffer[i] = 0; buffer[i + 1] = 200; buffer[i + 2] = 120; buffer[i + 3] = 255;
      } else if (dist < 6) {
        // 边缘抗锯齿
        buffer[i] = 20; buffer[i + 1] = 30; buffer[i + 2] = 50; buffer[i + 3] = 200;
      } else {
        // 透明背景
        buffer[i] = 0; buffer[i + 1] = 0; buffer[i + 2] = 0; buffer[i + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Token Monitor');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.restore();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.restore();
        mainWindow.focus();
      }
    } else {
      // 窗口已被销毁，重新创建
      createMainWindow();
    }
  });
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    type: 'toolbar',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));

  // 点击关闭时隐藏到托盘，不退出
  mainWindow.on('close', (e) => {
    if (!getIsQuitting()) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  createTray();

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function showBubble(alert: AlertState, service: string): void {
  if (alert.level === 'normal') return;

  // 同服务同级别 5 分钟内不重复弹
  const key = service + ':' + alert.level;
  const now = Date.now();
  if (bubbleCooldown[key] && now - bubbleCooldown[key] < 5 * 60 * 1000) return;
  bubbleCooldown[key] = now;

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const x = screenWidth - BUBBLE_WIDTH - 16;
  const offsetIndex = bubbleWindows.length;
  const y = screenHeight - BUBBLE_HEIGHT - 16 - offsetIndex * BUBBLE_OFFSET;

  const bubble = new BrowserWindow({
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const html = buildBubbleHtml(alert, service);
  bubble.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  if (alert.autoClose && alert.duration > 0) {
    setTimeout(() => {
      if (!bubble.isDestroyed()) bubble.close();
      const idx = bubbleWindows.indexOf(bubble);
      if (idx !== -1) bubbleWindows.splice(idx, 1);
    }, alert.duration);
  }

  bubbleWindows.push(bubble);
  bubble.on('closed', () => {
    const idx = bubbleWindows.indexOf(bubble);
    if (idx !== -1) bubbleWindows.splice(idx, 1);
  });

  if (alert.systemNotify) {
    new Notification({ title: 'Token Monitor 紧急预警', body: alert.message }).show();
  }
}

function buildBubbleHtml(alert: AlertState, service: string): string {
  const colors: Record<string, string> = {
    reminder: '#f0c040',
    warning: '#f08030',
    critical: '#e04040',
  };
  const color = colors[alert.level] || '#888';
  const name = service === 'deepseek' ? 'DeepSeek' : 'MiMo';
  const levelText = alert.level === 'critical' ? '紧急' : alert.level === 'warning' ? '警告' : '提醒';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei",sans-serif;background:transparent;overflow:hidden}
.bubble{background:rgba(20,20,40,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:16px;margin:8px;color:#e0e0e0;backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,0.4);border-left:3px solid ${color}}
.title{font-size:13px;font-weight:600;margin-bottom:8px;color:${color}}
.msg{font-size:12px;line-height:1.5;margin-bottom:12px}
.actions{display:flex;gap:8px}
button{border:none;border-radius:6px;padding:6px 14px;font-size:11px;cursor:pointer;background:rgba(255,255,255,0.08);color:#ccc}
button.primary{background:${color};color:#111}
</style></head><body>
<div class="bubble">
<div class="title">${levelText} · ${name}</div>
<div class="msg">${alert.message}</div>
<div class="actions">
<button class="primary" onclick="window.close()">忽略</button>
</div>
</div>
</body></html>`;
}
