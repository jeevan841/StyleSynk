# MongoDB Models for StyleSynk

This directory contains Mongoose models for MongoDB support in StyleSynk.

## Overview

StyleSynk primarily uses **PostgreSQL** for its transactional operations. MongoDB support is provided as an **optional alternative** for specific use cases.

## Models

### 1. User Model (`user.model.js`)
- User accounts with embedded role and branch information
- Supports: owner, branch_manager, receptionist, stylist, customer roles
- Includes metadata for stylists (specialization, experience, rating)

### 2. Customer Model (`customer.model.js`)
- Customer profiles with flexible schema
- Embedded membership and loyalty information
- Preferences, allergies, and visit history
- Methods for loyalty points management

### 3. Appointment Model (`appointment.model.js`)
- Appointments with embedded customer, staff, and service details
- Collision detection for scheduling conflicts
- Status tracking and payment information
- Virtual properties for time calculations

### 4. Bill Model (`bill.model.js`)
- Bills with embedded line items
- Automatic calculation of totals, GST, and commissions
- Loyalty points calculation
- Payment tracking and refund support

## Usage

### Enable MongoDB

Set in `.env`:
```bash
USE_MONGODB=true
MONGODB_URI=mongodb://localhost:27017/stylesynk
```

### Import Models

```javascript
const { User, Customer, Appointment, Bill } = require('./models/mongodb');
```

### Example Queries

```javascript
// Find active stylists in a branch
const stylists = await User.findByRole('stylist', branchId);

// Create appointment with conflict check
const conflicts = await Appointment.findConflicts(
  staffId, 
  scheduledAt, 
  duration
);

if (conflicts.length === 0) {
  const appointment = await Appointment.create(appointmentData);
}

// Add loyalty points to customer
await customer.addLoyaltyPoints(billAmount);

// Generate bill number
const billNumber = await Bill.generateBillNumber(branchId);
```

## Indexes

All models include optimized indexes for common queries:
- User: email, role, branch
- Customer: phone, email, membership tier
- Appointment: branch + date, staff + date, customer
- Bill: bill number, branch + date, customer

## Best Practices

1. **Use PostgreSQL for:**
   - Transactional operations (billing, commissions)
   - Operations requiring ACID guarantees
   - Complex joins and analytics

2. **Use MongoDB for:**
   - Customer profiles (flexible fields)
   - Chat history and logs
   - Notifications
   - Audit trails

3. **Hybrid Approach:**
   - Keep critical data in PostgreSQL
   - Use MongoDB for supplementary data
   - Sync IDs between databases

## Migration

See `MONGODB_MIGRATION_GUIDE.md` in the project root for migration instructions.

## Notes

- MongoDB connection is optional and won't prevent the app from starting
- All models include validation and business logic
- Virtual properties provide computed fields
- Static methods offer common query patterns