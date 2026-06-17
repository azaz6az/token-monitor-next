import React, { useState, useEffect } from 'react';
import ServiceCard from './components/ServiceCard';
import SettingsPanel from './components/SettingsPanel';
import { useTokenData } from './hooks/useTokenData';

const App: React.FC = () => {
  const { deepseek, mimo, tokenPlan, deepseekAlert, mimoAlert, tokenPlanAlert, refresh } = useTokenData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setEntered(true));
  }, []);

  return (
    <div className={entered ? 'panel-enter' : ''} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
          title="隐藏到托盘"
        >−</button>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto',
        WebkitAppRegion: 'no-drag' as unknown as string,
      }}>
        <ServiceCard data={deepseek} alert={deepseekAlert} accentColor="#00d4aa" displayName="DeepSeek" rechargeUrl="https://platform.deepseek.com/top_up" />
        <ServiceCard data={mimo} alert={mimoAlert} accentColor="#ff8c42" displayName="MiMo" rechargeUrl="https://platform.xiaomimimo.com/console/balance" />
        <ServiceCard data={tokenPlan} alert={tokenPlanAlert} accentColor="#a78bfa" displayName="Token Plan" />
      </div>

      <div className="bottombar">
        <button onClick={() => setSettingsOpen(true)}>认证配置</button>
        <button onClick={refresh}>刷新</button>
      </div>

      <div style={{ height: 10, WebkitAppRegion: 'drag' as unknown as string, flexShrink: 0 }} />

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default App;
