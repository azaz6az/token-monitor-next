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
  const [mimoKey, setMimoKey] = useState('');

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getApiKeys().then(keys => {
        setDeepseekKey(keys.deepseek || '');
        setMimoKey(keys.mimo || '');
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await window.electronAPI.saveApiKeys({
      deepseek: deepseekKey || undefined,
      mimo: mimoKey || undefined,
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
        <label>MiMo API Key</label>
        <input
          type="password"
          value={mimoKey}
          onChange={e => setMimoKey(e.target.value)}
          placeholder="输入 MiMo API Key"
        />
        <button className="save-btn" onClick={handleSave}>保存</button>
      </div>
    </div>
  );
};

export default SettingsPanel;
