import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      getApiKeys: () => Promise<{ deepseek?: string; mimo?: string }>;
      saveApiKeys: (keys: { deepseek?: string; mimo?: string }) => Promise<{ success: boolean }>;
      manualRefresh: () => Promise<{ success: boolean }>;
      updateBalance: (service: string, newBalance: number) => Promise<{ success: boolean }>;
      getHistory: (service: string) => Promise<{ tokens_per_minute: number; recorded_at: string }[]>;
      onTokenData: (cb: (payload: unknown) => void) => () => void;
    };
  }
}

const SettingsPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [tpServiceToken, setTpServiceToken] = useState('');
  const [tpUserId, setTpUserId] = useState('');

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getApiKeys().then(keys => {
        setDeepseekKey(keys.deepseek || '');
        setTpServiceToken(keys.tokenPlanServiceToken || '');
        setTpUserId(keys.tokenPlanUserId || '');
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await window.electronAPI.saveApiKeys({
      deepseek: deepseekKey || undefined,
      tokenPlanServiceToken: tpServiceToken || undefined,
      tokenPlanUserId: tpUserId || undefined,
    });
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="glass-card settings-panel" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>API 配置</h3>
        <label>DeepSeek API Key</label>
        <input
          type="password"
          value={deepseekKey}
          onChange={e => setDeepseekKey(e.target.value)}
          placeholder="sk-..."
        />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '12px 0' }} />
        <label style={{ color: '#a78bfa' }}>MiMo 平台（含 Token Plan）</label>
        <label>Service Token</label>
        <input
          type="password"
          value={tpServiceToken}
          onChange={e => setTpServiceToken(e.target.value)}
          placeholder="从浏览器 Cookie 复制 api-platform_serviceToken"
        />
        <label>User ID</label>
        <input
          type="text"
          value={tpUserId}
          onChange={e => setTpUserId(e.target.value)}
          placeholder="从浏览器 Cookie 复制 userId"
        />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '4px 0 12px' }}>
          登录 platform.xiaomimimo.com → F12 → Application → Cookies 复制
        </p>
        <button className="save-btn" onClick={handleSave}>保存</button>
      </div>
    </div>
  );
};

export default SettingsPanel;
