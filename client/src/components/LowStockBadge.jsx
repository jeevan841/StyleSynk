// client/src/components/LowStockBadge.jsx
// Real-time low-stock indicator — listens to inventory:low Socket.IO event

import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

export default function LowStockBadge({ branchId, inline = false }) {
  const [alerts, setAlerts] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const { on } = useSocket();

  // Subscribe to real-time low-stock events
  useEffect(() => {
    const unsub = on('inventory:low', (item) => {
      if (branchId && item.branch_id !== branchId) return;
      setAlerts(prev => {
        const exists = prev.find(a => a.id === item.id);
        if (exists) return prev.map(a => a.id === item.id ? item : a);
        return [item, ...prev].slice(0, 20); // cap at 20
      });
    });
    return unsub;
  }, [on, branchId]);

  if (!alerts.length) return null;

  if (inline) {
    return (
      <span className="low-stock-badge low-stock-badge--inline">
        ⚠️ {alerts.length} low
      </span>
    );
  }

  return (
    <div className="low-stock-widget">
      <button
        className="low-stock-trigger"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className="low-stock-icon">📦</span>
        <span className="low-stock-count">{alerts.length}</span>
        <span className="low-stock-label">Low Stock Alerts</span>
        <span className="low-stock-chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="low-stock-panel">
          {alerts.map(item => (
            <div key={item.id} className="low-stock-item">
              <span className="low-stock-item__icon">⚠️</span>
              <div className="low-stock-item__info">
                <div className="low-stock-item__name">{item.product_name}</div>
                <div className="low-stock-item__qty">
                  Only <strong>{item.quantity}</strong> {item.unit} left
                  &nbsp;(threshold: {item.low_stock_threshold})
                </div>
              </div>
              <button
                className="low-stock-item__dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlerts(prev => prev.filter(a => a.id !== item.id));
                }}
                title="Dismiss"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
