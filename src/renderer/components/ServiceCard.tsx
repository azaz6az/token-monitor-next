import React from 'react';
import StatusDot from './StatusDot';
import AnimatedNumber from './AnimatedNumber';
import AlertBanner from './AlertBanner';

interface ServiceData {
  service: string;
  balance: number;
  tokensUsed: number;
  currentRate: number;
  recentRates: number[];
  estimatedMinutesLeft: number;
  todayCost: number;
  error: string | null;
  lastUpdated: number;
}

interface AlertData {
  level: 'normal' | 'reminder' | 'warning' | 'critical';
  message: string;
}

interface Props {
  data: ServiceData;
  alert: AlertData;
  accentColor: string;
  displayName: string;
  unit?: string;
  rechargeUrl?: string;
}

function rateLevel(data: ServiceData): 'normal' | 'warning' | 'critical' | 'offline' {
  if (data.error) return 'offline';
  if (!isFinite(data.estimatedMinutesLeft)) return 'normal';
  if (data.estimatedMinutesLeft <= 15) return 'critical';
  if (data.estimatedMinutesLeft <= 60) return 'warning';
  return 'normal';
}

function formatTime(ts: number): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

const ServiceCard: React.FC<Props> = ({ data, alert, accentColor, displayName, unit = '¥', rechargeUrl }) => {
  const dotLevel = rateLevel(data);

  return (
    <div className="glass-card" style={{ WebkitAppRegion: 'no-drag' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <StatusDot level={dotLevel} color={accentColor} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {formatTime(data.lastUpdated)}
        </span>
      </div>

      {data.error ? (
        <div style={{
          padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(224,64,64,0.1)', border: '1px solid rgba(224,64,64,0.2)',
          color: 'var(--alert-critical)', fontSize: 11, marginBottom: 6,
        }}>
          {data.error}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                {data.percentage !== undefined ? '剩余' : '余额'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {data.percentage !== undefined
                  ? <><span style={{ color: data.percentage > 20 ? accentColor : data.percentage > 10 ? 'var(--alert-warning)' : 'var(--alert-critical)' }}>{data.percentage}%</span></>
                  : <>{unit}<AnimatedNumber value={data.balance} decimals={unit === '¥' ? 2 : 0} /></>
                }
              </div>
            </div>
            {data.percentage !== undefined && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                🪙{data.balance >= 1000 ? (data.balance / 1000).toFixed(1) + 'K' : data.balance.toFixed(0)}
              </span>
            )}
            {rechargeUrl && data.percentage === undefined && (
              <button
                onClick={() => window.open(rechargeUrl)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >充值 ↗</button>
            )}
          </div>

          {/* Token Plan 百分比进度条 */}
          {data.percentage !== undefined && (
            <div className="progress-bar" style={{ marginTop: 8, height: 6, borderRadius: 3 }}>
              <div className="fill" style={{
                width: `${data.percentage}%`,
                background: data.percentage > 20 ? accentColor : data.percentage > 10 ? 'var(--alert-warning)' : 'var(--alert-critical)',
              }} />
            </div>
          )}

          {/* 今日消耗（非百分比模式） */}
          {data.percentage === undefined && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 11,
              marginTop: 10, padding: '6px 10px',
              background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>今日消耗</span>
              <span style={{ color: data.todayCost > 0 ? '#f08030' : 'var(--text-secondary)', fontWeight: 500 }}>
                {unit}{data.todayCost.toFixed(2)}
              </span>
            </div>
          )}

          <AlertBanner
            level={alert.level}
            message={alert.message}
            estimatedMinutes={data.estimatedMinutesLeft}
          />
        </>
      )}
    </div>
  );
};

export default ServiceCard;
