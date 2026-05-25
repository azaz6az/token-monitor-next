import React, { useState } from 'react';
import ServiceCard from './components/ServiceCard';
import SettingsPanel from './components/SettingsPanel';
import { useTokenData } from './hooks/useTokenData';

const App: React.FC = () => {
  const { deepseek, mimo, tokenPlan, deepseekAlert, mimoAlert, tokenPlanAlert, refresh } = useTokenData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editService, setEditService] = useState('');
  const [editValue, setEditValue] = useState('');

  const handleManualEdit = (service: string) => {
    setEditService(service);
    const bal = service === 'deepseek' ? deepseek.balance : service === 'mimo' ? mimo.balance : tokenPlan.balance;
    setEditValue(bal.toFixed(2));
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
        <button
          onClick={() => window.close()}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 16, cursor: 'pointer', padding: '0 8px', lineHeight: 1,
            WebkitAppRegion: 'no-drag' as unknown as string,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          title="关闭（最小化到托盘）"
        >×</button>
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
        <ServiceCard
          data={tokenPlan}
          alert={tokenPlanAlert}
          accentColor="#a78bfa"
          displayName="Token Plan"
          unit="🪙"
        />
      </div>

      <div className="bottombar">
        <button onClick={() => setSettingsOpen(true)}>API 配置</button>
        <button onClick={() => handleManualEdit('deepseek')}>DeepSeek 修正</button>
        <button onClick={() => handleManualEdit('mimo')}>MiMo 修正</button>
        <button onClick={() => handleManualEdit('token-plan')}>Token Plan 修正</button>
        <button onClick={refresh}>刷新</button>
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {editOpen && (
        <div className="settings-overlay" onClick={() => setEditOpen(false)}>
          <div className="glass-card settings-panel" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              修改 {editService === 'deepseek' ? 'DeepSeek' : editService === 'token-plan' ? 'Token Plan' : 'MiMo'} 余额
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
