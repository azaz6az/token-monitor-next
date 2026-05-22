import React from 'react';

interface Props {
  percent: number;
  color: string;
}

const ProgressBar: React.FC<Props> = ({ percent, color }) => {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="progress-bar">
      <div
        className="fill"
        style={{
          width: `${clamped}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
        }}
      />
    </div>
  );
};

export default ProgressBar;
