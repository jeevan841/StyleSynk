// server/src/models/mongodb/user.model.js
// Mongoose model for users with embedded role and branch information

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    name: {
      type: String,
      enum: ['owner', 'branch_manager', 'receptionist', 'stylist', 'customer'],
      required: true,
      index: true
    },
    permissions: {
      type: Map,
      of: Boolean,
      default: {}
    }
  },
  branch: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    name: String,
    address: String,
    city: String
  },
  name: {
    type: String,
    required: true
  },
  phone: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastLogin: Date,
  metadata: {
    specialization: [String],  // For stylists
    experience: Number,
    rating: Number,
    bio: String
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for common queries
userSchema.index({ email: 1 });
userSchema.index({ 'role.name': 1 });
userSchema.index({ 'branch.id': 1 });
userSchema.index({ isActive: 1, 'role.name': 1 });

// Virtual for full name
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
  return this.role.permissions.get(permission) === true;
};

// Static method to find active users by role
userSchema.statics.findByRole = function(roleName, branchId = null) {
  const query = {
    'role.name': roleName,
    isActive: true
  };
  
  if (branchId) {
    query['branch.id'] = branchId;
  }
  
  return this.find(query);
};

module.exports = mongoose.model('User', userSchema);

// Made with Bob
