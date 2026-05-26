// server/src/models/mongodb/bill.model.js
// Mongoose model for bills with embedded line items and payment details

const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  branch: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    name: String,
    address: String
  },
  customer: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    name: String,
    phone: String,
    membershipTier: String,
    loyaltyPoints: Number
  },
  appointment: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    scheduledAt: Date
  },
  items: [{
    type: {
      type: String,
      enum: ['service', 'product'],
      required: true
    },
    id: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: Number,
    staff: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      commissionRate: Number,
      commissionAmount: Number
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'membership', 'loyalty'],
      default: 'fixed'
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    reason: String,
    code: String
  },
  gst: {
    rate: {
      type: Number,
      default: 18,
      min: 0
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  roundOff: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet', 'netbanking', 'split'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    cardLast4: String,
    upiId: String,
    splitPayments: [{
      method: String,
      amount: Number
    }]
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded'],
    default: 'pending',
    index: true
  },
  loyaltyPoints: {
    earned: {
      type: Number,
      default: 0,
      min: 0
    },
    redeemed: {
      type: Number,
      default: 0,
      min: 0
    },
    balance: Number
  },
  notes: String,
  createdBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: String,
    role: String
  },
  paidAt: Date,
  refundedAt: Date,
  refundReason: String,
  refundAmount: Number
}, {
  timestamps: true,
  collection: 'bills'
});

// Indexes for common queries
billSchema.index({ billNumber: 1 });
billSchema.index({ 'branch.id': 1, createdAt: -1 });
billSchema.index({ 'customer.id': 1, createdAt: -1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ paymentStatus: 1, createdAt: -1 });
billSchema.index({ 'appointment.id': 1 });

// Index for analytics queries
billSchema.index({ 
  'branch.id': 1, 
  createdAt: -1,
  paymentStatus: 1
});

// Virtual for net amount (after discount, before tax)
billSchema.virtual('netAmount').get(function() {
  return this.subtotal - this.discount.amount;
});

// Virtual for final amount (after rounding)
billSchema.virtual('finalAmount').get(function() {
  return this.total + this.roundOff;
});

// Method to calculate totals
billSchema.methods.calculateTotals = function() {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => {
    item.subtotal = (item.price * item.quantity) - (item.discount || 0);
    return sum + item.subtotal;
  }, 0);
  
  // Apply discount
  const netAmount = this.subtotal - this.discount.amount;
  
  // Calculate GST
  this.gst.amount = (netAmount * this.gst.rate) / 100;
  
  // Calculate total
  this.total = netAmount + this.gst.amount;
  
  // Apply rounding
  const rounded = Math.round(this.total);
  this.roundOff = rounded - this.total;
  this.total = rounded;
  
  return this;
};

// Method to calculate commissions
billSchema.methods.calculateCommissions = function() {
  this.items.forEach(item => {
    if (item.staff && item.staff.commissionRate) {
      item.staff.commissionAmount = (item.subtotal * item.staff.commissionRate) / 100;
    }
  });
  return this;
};

// Method to calculate loyalty points
billSchema.methods.calculateLoyaltyPoints = function() {
  // ₹10 = 1 point
  this.loyaltyPoints.earned = Math.floor(this.total / 10);
  return this;
};

// Static method to generate bill number
billSchema.statics.generateBillNumber = async function(branchId) {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  const prefix = `BIL${year}${month}${day}`;
  
  // Find the last bill number for today
  const lastBill = await this.findOne({
    billNumber: new RegExp(`^${prefix}`)
  }).sort({ billNumber: -1 });
  
  let sequence = 1;
  if (lastBill) {
    const lastSequence = parseInt(lastBill.billNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Static method to get revenue by date range
billSchema.statics.getRevenue = function(branchId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'branch.id': branchId,
        paymentStatus: 'paid',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        billCount: { $sum: 1 },
        averageBill: { $avg: '$total' }
      }
    }
  ]);
};

// Static method to get top services
billSchema.statics.getTopServices = function(branchId, startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        'branch.id': branchId,
        paymentStatus: 'paid',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.type': 'service'
      }
    },
    {
      $group: {
        _id: '$items.name',
        count: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: limit }
  ]);
};

// Pre-save hook to calculate totals
billSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isModified('discount') || this.isModified('gst')) {
    this.calculateTotals();
    this.calculateCommissions();
    this.calculateLoyaltyPoints();
  }
  next();
});

// Pre-save hook to set paid timestamp
billSchema.pre('save', function(next) {
  if (this.isModified('paymentStatus') && this.paymentStatus === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Bill', billSchema);

// Made with Bob
