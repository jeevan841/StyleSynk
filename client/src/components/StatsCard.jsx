// client/src/components/StatsCard.jsx
// Reusable KPI card with trend indicator, icon, and animated counter

import { useEffect, useRef, useState } from 'react';
import { formatINR, formatINRCompact } from '../utils/formatCurrency';

function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start     = performance.now();
    const startVal  = 0;
    const endVal    = Number(target) || 0;

    const step = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setVal(Math.round(startVal + (endVal - startVal) * ease));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return val;
}

export default function StatsCard({
  title,
  value,
  icon      = '📊',
  trend,            // number (positive/negative %)
  trendLabel,       // "vs last month"
  format    = 'number',  // 'number' | 'currency' | 'compact_currency' | 'percentage'
  color     = 'purple',  // 'purple' | 'emerald' | 'blue' | 'amber'
  loading   = false,
  onClick,
}) {
  const animated = useCountUp(Number(value) || 0);

  const formatValue = (v) => {
    switch (format) {
      case 'currency':         return formatINR(v, 0);
      case 'compact_currency': return formatINRCompact(v);
      case 'percentage':       return `${v}%`;
      default:                 return v.toLocaleString('en-IN');
    }
  };

  const trendUp = trend > 0;

  return (
    <div
      className={`stats-card stats-card--${color}${onClick ? ' stats-card--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stats-card__header">
        <span className="stats-card__icon">{icon}</span>
        <div className="stats-card__meta">
          {loading ? (
            <div className="skeleton skeleton--value" />
          ) : (
            <div className="stats-card__value">{formatValue(animated)}</div>
          )}
          <div className="stats-card__title">{title}</div>
        </div>
      </div>

      {(trend !== undefined && trend !== null) && (
        <div className={`stats-card__trend ${trendUp ? 'trend--up' : 'trend--down'}`}>
          <span className="trend-arrow">{trendUp ? '↗' : '↘'}</span>
          <span className="trend-value">{Math.abs(trend)}%</span>
          {trendLabel && <span className="trend-label">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
