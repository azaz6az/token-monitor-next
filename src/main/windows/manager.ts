import { BrowserWindow, screen, Notification, Tray, Menu, nativeImage, app, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { AlertState } from '../engine/alerts';
import { getIsQuitting } from '../state';
import { BUBBLE_COOLDOWN_MS } from '../constants';

// ── 面板 ────────────────────────────────────────────────────────
const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 500;
const PANEL_MARGIN = 16;
const PANEL_BOTTOM_EXTRA = 40;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let minimalMode = false;

// ── 托盘图标 ────────────────────────────────────────────────────

function createTrayIcon(): Electron.NativeImage {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = x - 7.5, cy = y - 7.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < 5) {
        buffer[i] = 0; buffer[i + 1] = 200; buffer[i + 2] = 120; buffer[i + 3] = 255;
      } else if (dist < 6) {
        buffer[i] = 20; buffer[i + 1] = 30; buffer[i + 2] = 50; buffer[i + 3] = 200;
      } else {
        buffer[i] = 0; buffer[i + 1] = 0; buffer[i + 2] = 0; buffer[i + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createTray(): void {
  if (tray && !tray.isDestroyed()) return; // 防止重复创建
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Token Monitor — 双击显示面板');

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示/隐藏面板', click: () => togglePanel() },
    {
      label: '极简模式', type: 'checkbox', checked: minimalMode,
      click: () => {
        minimalMode = !minimalMode;
        if (!minimalMode) {
          tray?.setTitle('');
          tray?.setToolTip('Token Monitor — 双击显示面板');
        }
      },
    },
    { label: '创建桌面快捷方式', click: () => ensureDesktopShortcut() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => togglePanel());
}

/** 更新托盘图标旁边的余额文字 */
export function setTrayTitle(text: string): void {
  if (!tray || tray.isDestroyed()) return;
  // 始终更新 tooltip（悬停可见）
  tray.setToolTip(text ? `Token Monitor  ${text}` : 'Token Monitor — 双击显示面板');
  // 极简模式额外尝试显示在图标旁边
  if (minimalMode) {
    tray.setTitle(text);
  } else {
    tray.setTitle('');
  }
}

// ── 面板窗口 ────────────────────────────────────────────────────

function positionPanel(): void {
  if (!mainWindow) return;
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setBounds({
    x: screenWidth - PANEL_WIDTH - PANEL_MARGIN,
    y: screenHeight - PANEL_HEIGHT - PANEL_MARGIN - PANEL_BOTTOM_EXTRA,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  });
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    type: 'toolbar',
    icon: path.join(__dirname, '../../../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));

  mainWindow.on('blur', () => mainWindow?.hide());
  mainWindow.on('close', (e) => {
    if (!getIsQuitting()) { e.preventDefault(); mainWindow?.hide(); }
  });

  createTray();
  ensureDesktopShortcut();
  return mainWindow;
}

export function togglePanel(): void {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
  const win = mainWindow!;
  if (win.isVisible()) { win.hide(); }
  else { positionPanel(); win.show(); win.focus(); }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// ── 桌面快捷方式 ────────────────────────────────────────────────

function ensureDesktopShortcut(): void {
  const shortcutPath = path.join(app.getPath('desktop'), 'Token Monitor.lnk');
  if (fs.existsSync(shortcutPath)) return;
  const projectDir = path.join(__dirname, '..', '..', '..');
  const electronExe = path.join(projectDir, 'node_modules', 'electron', 'dist', 'electron.exe');
  const ps = [
    `$ws=New-Object -ComObject WScript.Shell`,
    `$s=$ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')`,
    `$s.TargetPath='${electronExe.replace(/'/g, "''")}'`,
    `$s.Arguments='.'`,
    `$s.WorkingDirectory='${projectDir.replace(/'/g, "''")}'`,
    `$s.WindowStyle=7`,
    `$s.Description='Token Monitor'`,
    `$s.Save()`,
  ].join(';');
  exec(`powershell -NoProfile -Command "${ps}"`, (err) => {
    if (err) console.error('[Shortcut] create failed:', err.message);
  });
}

// ── 告警气泡 ────────────────────────────────────────────────────

const bubbleWindows: BrowserWindow[] = [];
const BUBBLE_WIDTH = 280;
const BUBBLE_HEIGHT = 150;
const BUBBLE_OFFSET = 80;
const bubbleCooldown: Record<string, number> = {};
const mutedBubbles = new Set<string>();

ipcMain.on('mute-bubble', (_event, key: string) => { mutedBubbles.add(key); });

export function showBubble(alert: AlertState, service: string): void {
  if (alert.level === 'normal') return;
  const key = service + ':' + alert.level;
  if (mutedBubbles.has(key)) return;
  const now = Date.now();
  if (bubbleCooldown[key] && now - bubbleCooldown[key] < BUBBLE_COOLDOWN_MS) return;
  bubbleCooldown[key] = now;

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const x = screenWidth - BUBBLE_WIDTH - 16;
  const panelVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
  const baseY = panelVisible
    ? screenHeight - PANEL_HEIGHT - PANEL_MARGIN - PANEL_BOTTOM_EXTRA - BUBBLE_HEIGHT - 8
    : screenHeight - BUBBLE_HEIGHT - 16;
  const y = baseY - bubbleWindows.length * BUBBLE_OFFSET;

  const bubble = new BrowserWindow({
    width: BUBBLE_WIDTH, height: BUBBLE_HEIGHT, x, y,
    frame: false, transparent: true, alwaysOnTop: true, resizable: false, skipTaskbar: true, focusable: true,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const html = buildBubbleHtml(alert, service, key);
  bubble.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  bubble.webContents.on('did-finish-load', () => {
    bubble.webContents.executeJavaScript(`
      document.getElementById('muteBtn').onclick = function() {
        window.electronAPI.muteBubble('${key}');
        window.close();
      };
    `).catch(() => {});
  });

  if (alert.autoClose && alert.duration > 0) {
    setTimeout(() => { if (!bubble.isDestroyed()) bubble.close(); }, alert.duration);
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

function buildBubbleHtml(alert: AlertState, service: string, muteKey: string): string {
  const colors: Record<string, string> = { reminder: '#f0c040', warning: '#f08030', critical: '#e04040' };
  const color = colors[alert.level] || '#888';
  const name = service === 'deepseek' ? 'DeepSeek' : service === 'token-plan' ? 'Token Plan' : 'MiMo';
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
<button id="muteBtn">本次不再提醒</button>
</div></div></body></html>`;
}
