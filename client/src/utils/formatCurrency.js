// client/src/utils/formatCurrency.js
// Indian Rupee formatting utilities

/**
 * formatINR — formats a number as ₹ Indian Rupee
 * e.g. 1500 → "₹1,500.00"
 */
export function formatINR(amount, decimals = 2) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * formatINRCompact — compact form for cards
 * e.g. 150000 → "₹1.5L"
 */
export function formatINRCompact(amount) {
  const num = Number(amount) || 0;
  if (num >= 10_000_000) return `₹${(num / 10_000_000).toFixed(1)}Cr`;
  if (num >= 100_000)    return `₹${(num / 100_000).toFixed(1)}L`;
  if (num >= 1_000)      return `₹${(num / 1_000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

/**
 * parseLoyaltyToRupees — 10 points = ₹1
 */
export function parseLoyaltyToRupees(points) {
  return Math.floor(points / 10);
}

export default formatINR;
