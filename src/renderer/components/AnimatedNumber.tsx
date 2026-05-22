import React, { useEffect, useState } from 'react';

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

const AnimatedNumber: React.FC<Props> = ({ value, prefix = '', suffix = '', decimals = 2, className = '' }) => {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDisplay(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  const formatted = prefix + display.toFixed(decimals) + suffix;
  return (
    <span className={`animated-number ${className}`} key={formatted}>
      {formatted}
    </span>
  );
};

export default AnimatedNumber;
