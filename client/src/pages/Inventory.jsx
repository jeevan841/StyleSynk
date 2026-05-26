// client/src/pages/Inventory.jsx
// Per-branch inventory management with low-stock alerts

import { useState, useEffect } from 'react';
import { inventoryAPI } from '../api';
import { useSocket } from '../hooks/useSocket';

export default function Inventory() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all'); // 'all' | 'low'
  const [search,  setSearch]  = useState('');
  const { on } = useSocket();

  const load = () => {
    setLoading(true);
    inventoryAPI.getAll(filter === 'low' ? { low_stock: true } : {})
      .then(data => setItems(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time low-stock alerts
  useEffect(() => {
    const unsub = on('inventory:low', (item) => {
      setItems(prev => prev.map(i => i.id === item.inventory_id ? { ...i, quantity: item.quantity } : i));
    });
    return unsub;
  }, [on]);

  const filtered = items.filter(i =>
    i.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = items.filter(i => i.quantity <= i.low_stock_threshold).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-sub">Per-branch stock management</p>
        </div>
        {lowCount > 0 && (
          <div className="low-stock-banner">
            ⚠️ {lowCount} item{lowCount > 1 ? 's' : ''} low on stock
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          <button className={`filter-tab ${filter==='all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Items</button>
          <button className={`filter-tab ${filter==='low' ? 'active' : ''}`} onClick={() => setFilter('low')}>
            Low Stock {lowCount > 0 && <span className="badge-red">{lowCount}</span>}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">Loading inventory…</div>
      ) : (
        <div className="inventory-grid">
          {filtered.map(item => {
            const isLow = item.quantity <= item.low_stock_threshold;
            return (
              <div key={item.id} className={`inventory-card ${isLow ? 'low-stock' : ''}`}>
                <div className="inv-card-top">
                  <div>
                    <p className="inv-name">{item.product_name}</p>
                    <p className="inv-branch">{item.branch_name}</p>
                  </div>
                  {isLow && <span className="badge-red">Low</span>}
                </div>
                <div className="inv-stats">
                  <div className="inv-stat">
                    <span className="inv-stat-label">Stock</span>
                    <span className={`inv-stat-val ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="inv-stat">
                    <span className="inv-stat-label">Min</span>
                    <span className="inv-stat-val">{item.low_stock_threshold}</span>
                  </div>
                  <div className="inv-stat">
                    <span className="inv-stat-label">Category</span>
                    <span className="inv-stat-val capitalize">{item.category}</span>
                  </div>
                  <div className="inv-stat">
                    <span className="inv-stat-label">Price</span>
                    <span className="inv-stat-val">₹{item.unit_price}</span>
                  </div>
                </div>
                {item.supplier && (
                  <p className="inv-supplier">Supplier: {item.supplier}</p>
                )}
                {/* Stock level bar */}
                <div className="inv-bar-bg">
                  <div
                    className="inv-bar-fill"
                    style={{
                      width: `${Math.min(100, (item.quantity / Math.max(item.quantity, item.low_stock_threshold * 3)) * 100)}%`,
                      background: isLow ? '#ef4444' : '#10b981',
                    }}
                  />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty-state">No inventory items found</div>
          )}
        </div>
      )}
    </div>
  );
}
