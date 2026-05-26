// server/src/services/invoice.js
// Invoice calculation service — pure business logic, no HTTP concerns

const GST_RATE = 18; // percent

/**
 * calculateInvoice — builds full invoice totals from line items
 *
 * @param {Array}  items          - [{ unit_price, quantity, discount_pct }]
 * @param {number} discountPct    - bill-level discount %
 * @param {number} gstRate        - override GST (default 18%)
 * @param {number} loyaltyRedeemed - points redeemed (1 point = ₹1)
 * @returns {{ subtotal, discount, taxable, gst_amount, total, gst_rate }}
 */
function calculateInvoice(items, discountPct = 0, gstRate = GST_RATE, loyaltyRedeemed = 0) {
  // Line-level totals (item discount already applied)
  const lineTotal = items.reduce((sum, item) => {
    const base = parseFloat(item.unit_price) * (parseInt(item.quantity) || 1);
    const itemDiscount = base * (parseFloat(item.discount_pct || 0) / 100);
    return sum + (base - itemDiscount);
  }, 0);

  // Bill-level discount
  const billDiscount  = lineTotal * (parseFloat(discountPct || 0) / 100);
  const afterDiscount = lineTotal - billDiscount;

  // Loyalty redemption (capped at afterDiscount)
  const loyaltyCash   = Math.min(parseFloat(loyaltyRedeemed || 0), afterDiscount);
  const taxable       = afterDiscount - loyaltyCash;

  // GST on taxable amount
  const gst_amount    = taxable * (gstRate / 100);
  const total         = taxable + gst_amount;

  return {
    subtotal:        round2(lineTotal),
    discount_amount: round2(billDiscount),
    discount_pct:    parseFloat(discountPct || 0),
    loyalty_cash:    round2(loyaltyCash),
    taxable:         round2(taxable),
    gst_rate:        gstRate,
    gst_amount:      round2(gst_amount),
    total:           round2(total),
  };
}

/**
 * generateBillNumber — creates readable invoice number
 * Format: SS-{BRANCH_CODE}-{YYYYMMDD}-{SEQ}
 */
function generateBillNumber(branchCode, seq) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqStr = String(seq).padStart(3, '0');
  return `SS-${branchCode.toUpperCase()}-${date}-${seqStr}`;
}

/** Round to 2 decimal places */
function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateInvoice, generateBillNumber, round2, GST_RATE };
