import React, { useState } from 'react';
import ServiceCard from './components/ServiceCard';
import SettingsPanel from './components/SettingsPanel';
import { useTokenData } from './hooks/useTokenData';

const App: React.FC = () => {
  const { deepseek, mimo, deepseekAlert, mimoAlert, refresh } = useTokenData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editService, setEditService] = useState('');
  const [editValue, setEditValue] = useState('');

  const handleManualEdit = (service: string) => {
    setEditService(service);
    setEditValue(service === 'deepseek' ? deepseek.balance.toFixed(2) : mimo.balance.toFixed(2));
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && window.electronAPI) {
      window.electronAPI.updateBalance(editService, val);
    }
    setEditOpen(false);
  };

  return (
    <>
      <div className="titlebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="titlebar-dot" />
          <h1>Token Monitor</h1>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto',
        WebkitAppRegion: 'no-drag' as unknown as string,
      }}>
        <ServiceCard
          data={deepseek}
          alert={deepseekAlert}
          accentColor="#00d4aa"
          displayName="DeepSeek"
        />
        <ServiceCard
          data={mimo}
          alert={mimoAlert}
          accentColor="#ff8c42"
          displayName="MiMo"
        />
      </div>

      <div className="bottombar">
        <button onClick={() => setSettingsOpen(true)}>API 配置</button>
        <button onClick={() => handleManualEdit('deepseek')}>DeepSeek 修正</button>
        <button onClick={() => handleManualEdit('mimo')}>MiMo 修正</button>
        <button onClick={refresh}>刷新</button>
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {editOpen && (
        <div className="settings-overlay" onClick={() => setEditOpen(false)}>
          <div className="glass-card settings-panel" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              修改 {editService === 'deepseek' ? 'DeepSeek' : 'MiMo'} 余额
            </h3>
            <label>新余额 (¥)</label>
            <input
              type="number"
              step="0.01"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
            />
            <button className="save-btn" onClick={handleSaveEdit}>确认</button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
