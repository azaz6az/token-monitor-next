import React from 'react';

interface Props {
  level: 'reminder' | 'warning' | 'critical' | 'normal';
  message: string;
  estimatedMinutes: number;
}

const AlertBanner: React.FC<Props> = ({ level, message, estimatedMinutes }) => {
  if (level === 'normal') return null;
  const timeStr = estimatedMinutes >= 60
    ? `${Math.round(estimatedMinutes / 60)} 小时`
    : `${Math.round(estimatedMinutes)} 分钟`;
  return (
    <div className={`alert-banner ${level}`}>
      {message}（剩余约 {timeStr}）
    </div>
  );
};

export default AlertBanner;
