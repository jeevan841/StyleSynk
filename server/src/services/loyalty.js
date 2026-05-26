// server/src/services/loyalty.js
// Loyalty points: earn on bill close, redeem at checkout

const { query } = require('../config/db');

const POINTS_PER_RUPEE = 0.01;   // 1 point per ₹100 spent
const MIN_REDEEM       = 100;    // minimum points to redeem

/**
 * awardLoyaltyPoints — called when bill is paid
 * Awards 1 point per ₹100 spent (rounded down).
 * Deducts redeemed points, records both in loyalty_points log.
 *
 * @param {string} customerId
 * @param {string} billId
 * @param {number} totalPaid         - final bill total
 * @param {number} loyaltyRedeemed   - points redeemed on this bill
 * @param {object|null} client       - pg client for transaction
 */
async function awardLoyaltyPoints(customerId, billId, totalPaid, loyaltyRedeemed = 0, client = null) {
  if (!customerId) return null;

  const db = client || { query: (sql, p) => query(sql, p) };

  // Get current balance
  const custResult = await db.query(
    'SELECT loyalty_points FROM customers WHERE id = $1',
    [customerId]
  );
  if (!custResult.rows.length) return null;

  let balance = custResult.rows[0].loyalty_points;

  // Deduct redeemed points first
  if (loyaltyRedeemed > 0) {
    balance = Math.max(0, balance - loyaltyRedeemed);
    await db.query(
      `INSERT INTO loyalty_points (customer_id, bill_id, points_earned, points_redeemed, balance_after, reason)
       VALUES ($1, $2, 0, $3, $4, 'Redeemed at billing')`,
      [customerId, billId, loyaltyRedeemed, balance]
    );
  }

  // Award earned points (1 point per ₹100)
  const earned = Math.floor(totalPaid * POINTS_PER_RUPEE);
  balance += earned;

  await db.query(
    `INSERT INTO loyalty_points (customer_id, bill_id, points_earned, points_redeemed, balance_after, reason)
     VALUES ($1, $2, $3, 0, $4, 'Earned on bill payment')`,
    [customerId, billId, earned, balance]
  );

  // Update customer balance + stats
  await db.query(
    `UPDATE customers
     SET loyalty_points = $1,
         total_spent    = total_spent + $2,
         visit_count    = visit_count + 1,
         updated_at     = NOW()
     WHERE id = $3`,
    [balance, totalPaid, customerId]
  );

  return { earned, redeemed: loyaltyRedeemed, balance_after: balance };
}

/**
 * getPointsBalance — returns current loyalty points for a customer
 */
async function getPointsBalance(customerId) {
  const result = await query(
    'SELECT loyalty_points FROM customers WHERE id = $1',
    [customerId]
  );
  return result.rows[0]?.loyalty_points ?? 0;
}

module.exports = { awardLoyaltyPoints, getPointsBalance, POINTS_PER_RUPEE, MIN_REDEEM };
