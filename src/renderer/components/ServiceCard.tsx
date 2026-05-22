import React from 'react';
import StatusDot from './StatusDot';
import AnimatedNumber from './AnimatedNumber';
import ProgressBar from './ProgressBar';
import MiniChart from './MiniChart';
import AlertBanner from './AlertBanner';

interface ServiceData {
  service: string;
  balance: number;
  tokensUsed: number;
  currentRate: number;
  recentRates: number[];
  estimatedMinutesLeft: number;
  tokensConsumed: number;
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
}

function formatRate(rate: number): string {
  if (rate >= 1000) return `${(rate / 1000).toFixed(1)}K`;
  return rate.toFixed(0);
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

const ServiceCard: React.FC<Props> = ({ data, alert, accentColor, displayName }) => {
  const dotLevel = rateLevel(data);
  const percent = Math.min(100, data.estimatedMinutesLeft > 0 && isFinite(data.estimatedMinutesLeft)
    ? Math.round((Math.min(data.estimatedMinutesLeft, 600) / 600) * 100)
    : 0);

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
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>余额</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            ¥<AnimatedNumber value={data.balance} decimals={2} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>消耗速率</span>
            <span>{formatRate(data.currentRate)} /min</span>
          </div>

          <ProgressBar percent={percent} color={accentColor} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 8, marginBottom: 2 }}>
            <span style={{ color: 'var(--text-secondary)' }}>已消耗 Token</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {data.tokensConsumed >= 1000
                ? `${(data.tokensConsumed / 1000).toFixed(1)}K`
                : data.tokensConsumed.toLocaleString()}
            </span>
          </div>

          <AlertBanner
            level={alert.level}
            message={alert.message}
            estimatedMinutes={data.estimatedMinutesLeft}
          />

          <MiniChart data={data.recentRates} color={accentColor} width={290} height={32} />
        </>
      )}
    </div>
  );
};

export default ServiceCard;
