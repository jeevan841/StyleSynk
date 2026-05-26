// client/src/pages/POS.jsx
// Point-of-Sale billing page — cart → invoice → close bill (cascades all services)

import { useState, useEffect } from 'react';
import { billingAPI, customersAPI, servicesAPI, staffAPI } from '../api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const GST_RATE = 18;

export default function POS() {
  const [customers, setCustomers] = useState([]);
  const [services,  setServices]  = useState([]);
  const [staff,     setStaff]     = useState([]);
  const [bills,     setBills]     = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedService,  setSelectedService]  = useState('');
  const [selectedStaff,    setSelectedStaff]    = useState('');
  const [cart,             setCart]             = useState([]);
  const [discountPct,      setDiscountPct]      = useState(0);
  const [loyaltyRedeem,    setLoyaltyRedeem]    = useState(0);
  const [paymentMethod,    setPaymentMethod]    = useState('cash');
  const [currentBillId,    setCurrentBillId]    = useState(null);
  const [closedBill,       setClosedBill]       = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [message,          setMessage]          = useState('');

  useEffect(() => {
    Promise.all([
      customersAPI.getAll({ limit: 200 }),
      servicesAPI.getAll(),
      staffAPI.getAll(),
      billingAPI.getAll({ status: 'draft', limit: 20 }),
    ]).then(([c, s, st, b]) => {
      setCustomers(c || []);
      setServices(s || []);
      setStaff(st || []);
      setBills(b || []);
    }).catch(console.error);
  }, []);

  // ── Totals ─────────────────────────────────────────────
  const subtotal       = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discountAmt    = subtotal * (discountPct / 100);
  const afterDiscount  = subtotal - discountAmt;
  const loyaltyCash    = Math.min(loyaltyRedeem, afterDiscount);
  const taxable        = afterDiscount - loyaltyCash;
  const gstAmount      = taxable * (GST_RATE / 100);
  const total          = taxable + gstAmount;

  // ── Add to cart ────────────────────────────────────────
  const addToCart = () => {
    const svc = services.find(s => s.id === selectedService);
    if (!svc) return;
    setCart(prev => {
      const existing = prev.findIndex(i => i.service_id === svc.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return updated;
      }
      return [...prev, {
        service_id: svc.id,
        staff_id:   selectedStaff || null,
        item_name:  svc.name,
        item_type:  'service',
        quantity:   1,
        unit_price: parseFloat(svc.price),
        discount_pct: 0,
      }];
    });
  };

  const removeFromCart = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));

  // ── Create & close bill ────────────────────────────────
  const handleCloseBill = async () => {
    if (!cart.length) return setMessage('Add items to the cart first.');
    setLoading(true);
    setMessage('');
    try {
      // 1. Create draft if not already done
      let billId = currentBillId;
      if (!billId) {
        const draft = await billingAPI.createDraft({
          branch_id:      staff[0]?.branch_id, // use first staff branch
          customer_id:    selectedCustomer || undefined,
          payment_method: paymentMethod,
        });
        billId = draft.id;
        setCurrentBillId(billId);
      }

      // 2. Add all cart items
      for (const item of cart) {
        await billingAPI.addItem(billId, item);
      }

      // 3. Close bill (triggers cascade)
      const closed = await billingAPI.closeBill(billId, {
        discount_pct:     discountPct,
        payment_method:   paymentMethod,
        loyalty_redeemed: loyaltyRedeem,
      });

      setClosedBill(closed);
      setCart([]);
      setCurrentBillId(null);
      setMessage('✅ Bill closed! Commission, inventory, and loyalty points updated.');
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetBill = () => {
    setClosedBill(null);
    setCart([]);
    setCurrentBillId(null);
    setDiscountPct(0);
    setLoyaltyRedeem(0);
    setSelectedCustomer('');
    setMessage('');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Point of Sale</h1>
          <p className="page-sub">Bill services, track payments, auto-calculate commissions</p>
        </div>
      </div>

      {/* Closed Bill Receipt */}
      {closedBill && (
        <div className="receipt-card">
          <div className="receipt-header">
            <h2>✅ Bill Closed</h2>
            <p className="receipt-num">{closedBill.bill_number}</p>
          </div>
          <div className="receipt-row"><span>Subtotal</span><span>{fmt(closedBill.subtotal)}</span></div>
          <div className="receipt-row"><span>Discount</span><span>-{fmt(closedBill.discount_amount)}</span></div>
          <div className="receipt-row"><span>GST (18%)</span><span>{fmt(closedBill.gst_amount)}</span></div>
          <div className="receipt-row total-row"><span>Total</span><span>{fmt(closedBill.total_amount)}</span></div>
          {closedBill.loyalty && (
            <p className="receipt-loyalty">⭐ +{closedBill.loyalty.earned} loyalty points earned</p>
          )}
          {closedBill.commissions?.length > 0 && (
            <p className="receipt-commission">
              💼 Commissions calculated for {closedBill.commissions.length} service(s)
            </p>
          )}
          <button onClick={resetBill} className="btn-primary mt-4 w-full">New Bill</button>
        </div>
      )}

      {!closedBill && (
        <div className="pos-layout">
          {/* Cart builder */}
          <div className="pos-left">
            {/* Customer select */}
            <div className="pos-section">
              <h3 className="pos-section-title">Customer</h3>
              <select className="form-select" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone || 'No phone'}</option>)}
              </select>
            </div>

            {/* Add service */}
            <div className="pos-section">
              <h3 className="pos-section-title">Add Service</h3>
              <div className="pos-add-row">
                <select className="form-select flex-1" value={selectedService} onChange={e => setSelectedService(e.target.value)}>
                  <option value="">Select service…</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} — ₹{s.price}</option>)}
                </select>
                <select className="form-select flex-1" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                  <option value="">Any stylist</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={addToCart} className="btn-primary px-4" disabled={!selectedService}>Add</button>
              </div>
            </div>

            {/* Cart */}
            <div className="pos-section">
              <h3 className="pos-section-title">Cart ({cart.length})</h3>
              {cart.length === 0 ? (
                <p className="text-slate-500 text-sm">No items yet</p>
              ) : (
                <div className="cart-items">
                  {cart.map((item, idx) => (
                    <div key={idx} className="cart-item">
                      <div className="cart-item-info">
                        <p className="cart-item-name">{item.item_name}</p>
                        <p className="cart-item-price">{fmt(item.unit_price)} × {item.quantity}</p>
                      </div>
                      <div className="cart-item-right">
                        <span className="cart-item-total">{fmt(item.unit_price * item.quantity)}</span>
                        <button onClick={() => removeFromCart(idx)} className="btn-icon-danger">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invoice summary */}
          <div className="pos-right">
            <div className="invoice-card">
              <h3 className="invoice-title">Invoice Summary</h3>

              <div className="invoice-rows">
                <div className="inv-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>

                <div className="inv-form-row">
                  <label>Discount %</label>
                  <input type="number" min={0} max={100} value={discountPct}
                    onChange={e => setDiscountPct(Number(e.target.value))}
                    className="inv-input" />
                </div>
                {discountAmt > 0 && <div className="inv-row text-emerald-400"><span>Discount</span><span>-{fmt(discountAmt)}</span></div>}

                <div className="inv-form-row">
                  <label>Redeem Points</label>
                  <input type="number" min={0} value={loyaltyRedeem}
                    onChange={e => setLoyaltyRedeem(Number(e.target.value))}
                    className="inv-input" />
                </div>
                {loyaltyCash > 0 && <div className="inv-row text-cyan-400"><span>Loyalty</span><span>-{fmt(loyaltyCash)}</span></div>}

                <div className="inv-row"><span>GST (18%)</span><span>{fmt(gstAmount)}</span></div>
                <div className="inv-row total-row"><span>Total</span><span>{fmt(total)}</span></div>
              </div>

              <div className="inv-payment">
                <label>Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="wallet">Wallet</option>
                  <option value="membership">Membership</option>
                </select>
              </div>

              {message && (
                <div className={`pos-msg ${message.startsWith('✅') ? 'success' : 'error'}`}>{message}</div>
              )}

              <button
                onClick={handleCloseBill}
                disabled={loading || cart.length === 0}
                className="btn-primary w-full mt-4 py-3 text-lg"
              >
                {loading ? 'Processing…' : `Close Bill — ${fmt(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
