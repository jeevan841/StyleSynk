// server/src/models/mongodb/customer.model.js
// Mongoose model for customers with loyalty and membership information

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    index: true
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  membership: {
    tier: {
      type: String,
      enum: ['none', 'silver', 'gold', 'platinum'],
      default: 'none',
      index: true
    },
    validUntil: Date,
    discount: {
      type: Number,
      default: 0
    },
    benefits: [String]
  },
  loyalty: {
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    visitCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastVisit: Date
  },
  preferences: {
    favoriteServices: [String],
    preferredStaff: [{
      id: mongoose.Schema.Types.ObjectId,
      name: String
    }],
    allergies: [String],
    skinType: String,
    hairType: String,
    notes: String
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  source: {
    type: String,
    enum: ['walk_in', 'referral', 'online', 'social_media', 'advertisement'],
    default: 'walk_in'
  },
  referredBy: {
    id: mongoose.Schema.Types.ObjectId,
    name: String
  }
}, {
  timestamps: true,
  collection: 'customers'
});

// Indexes for common queries
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ 'membership.tier': 1 });
customerSchema.index({ 'loyalty.lastVisit': -1 });
customerSchema.index({ isActive: 1, 'membership.tier': 1 });
customerSchema.index({ tags: 1 });

// Virtual for membership status
customerSchema.virtual('isMembershipActive').get(function() {
  if (!this.membership.validUntil) return false;
  return new Date(this.membership.validUntil) > new Date();
});

// Virtual for customer tier
customerSchema.virtual('customerTier').get(function() {
  const spent = this.loyalty.totalSpent;
  if (spent >= 50000) return 'VIP';
  if (spent >= 25000) return 'Premium';
  if (spent >= 10000) return 'Regular';
  return 'New';
});

// Method to add loyalty points
customerSchema.methods.addLoyaltyPoints = function(amount) {
  // ₹10 = 1 point
  const points = Math.floor(amount / 10);
  this.loyalty.points += points;
  this.loyalty.totalSpent += amount;
  this.loyalty.visitCount += 1;
  this.loyalty.lastVisit = new Date();
  return this.save();
};

// Method to redeem loyalty points
customerSchema.methods.redeemPoints = function(points) {
  if (this.loyalty.points < points) {
    throw new Error('Insufficient loyalty points');
  }
  this.loyalty.points -= points;
  return this.save();
};

// Static method to find customers by membership tier
customerSchema.statics.findByMembershipTier = function(tier) {
  return this.find({
    'membership.tier': tier,
    isActive: true
  });
};

// Static method to find inactive customers
customerSchema.statics.findInactive = function(days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    'loyalty.lastVisit': { $lt: cutoffDate },
    isActive: true
  });
};

module.exports = mongoose.model('Customer', customerSchema);

// Made with Bob
