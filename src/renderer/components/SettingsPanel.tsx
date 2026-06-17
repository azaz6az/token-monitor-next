import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      getApiKeys: () => Promise<{ deepseekKey?: string; mimoCookies?: string }>;
      saveApiKeys: (keys: { deepseekKey?: string; mimoCookies?: string }) => Promise<{ success: boolean }>;
      captureMiMo: () => Promise<{ success: boolean }>;
    };
  }
}

const SettingsPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [dsKey, setDsKey] = useState('');
  const [mimoLoggedIn, setMiMoLoggedIn] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getApiKeys().then(keys => {
        setDsKey(keys.deepseekKey || '');
        setMiMoLoggedIn(!!keys.mimoCookies);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="glass-card settings-panel" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>认证配置</h3>

        <label style={{ color: '#00d4aa' }}>DeepSeek API Key</label>
        <input
          type="password"
          value={dsKey}
          onChange={e => setDsKey(e.target.value)}
          placeholder="sk-..."
        />
        <button
          className="save-btn"
          onClick={() => window.electronAPI.saveApiKeys({ deepseekKey: dsKey || undefined })}
          style={{ marginBottom: 14 }}
        >保存</button>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0 12px' }} />

        <label style={{ color: '#a78bfa' }}>MiMo 平台（含 Token Plan）</label>
        <button
          className="save-btn"
          onClick={async () => {
            setCapturing(true);
            const r = await window.electronAPI.captureMiMo();
            setCapturing(false);
            setMiMoLoggedIn(r.success);
          }}
          disabled={capturing}
          style={{ width: '100%' }}
        >
          {capturing ? '登录中…' : mimoLoggedIn ? '✓ 已登录（点击重新登录）' : '登录获取 Cookie'}
        </button>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>
          弹出浏览器窗口 → 登录 → 关闭窗口自动保存
        </p>
      </div>
    </div>
  );
};

export default SettingsPanel;
