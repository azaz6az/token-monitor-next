import React from 'react';

interface Props {
  level: 'normal' | 'warning' | 'critical' | 'offline';
  color: string;
}

const StatusDot: React.FC<Props> = ({ level, color }) => {
  const className = level === 'offline' ? 'status-dot' : `status-dot ${level === 'normal' ? 'online' : level}`;
  return (
    <span
      className={className}
      style={{ background: color, boxShadow: level === 'normal' ? `0 0 6px ${color}` : undefined }}
    />
  );
};

export default StatusDot;
