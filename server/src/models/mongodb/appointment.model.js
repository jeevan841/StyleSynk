// server/src/models/mongodb/appointment.model.js
// Mongoose model for appointments with embedded customer, staff, and service details

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    phone: String,
    email: String
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
  staff: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    specialization: [String]
  },
  services: [{
    id: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    category: String
  }],
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },
  duration: {
    type: Number,
    required: true,
    min: 15
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  },
  notes: String,
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'partial'],
    default: 'unpaid'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  cancellationReason: String,
  createdBy: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    role: String
  },
  completedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true,
  collection: 'appointments'
});

// Compound indexes for efficient queries
appointmentSchema.index({ 'branch.id': 1, scheduledAt: 1 });
appointmentSchema.index({ 'staff.id': 1, scheduledAt: 1 });
appointmentSchema.index({ 'customer.id': 1, scheduledAt: -1 });
appointmentSchema.index({ status: 1, scheduledAt: 1 });

// Compound index for collision detection
appointmentSchema.index({ 
  'staff.id': 1, 
  scheduledAt: 1, 
  duration: 1,
  status: 1
});

// Index for date range queries
appointmentSchema.index({ 
  'branch.id': 1, 
  scheduledAt: 1,
  status: 1
});

// Virtual for end time
appointmentSchema.virtual('endTime').get(function() {
  return new Date(this.scheduledAt.getTime() + this.duration * 60000);
});

// Virtual for is past
appointmentSchema.virtual('isPast').get(function() {
  return this.scheduledAt < new Date();
});

// Virtual for is today
appointmentSchema.virtual('isToday').get(function() {
  const today = new Date();
  const appointmentDate = new Date(this.scheduledAt);
  return appointmentDate.toDateString() === today.toDateString();
});

// Method to check if appointment conflicts with another
appointmentSchema.methods.conflictsWith = function(otherAppointment) {
  const thisStart = this.scheduledAt.getTime();
  const thisEnd = thisStart + (this.duration * 60000);
  const otherStart = otherAppointment.scheduledAt.getTime();
  const otherEnd = otherStart + (otherAppointment.duration * 60000);
  
  return (thisStart < otherEnd && thisEnd > otherStart);
};

// Static method to find conflicts
appointmentSchema.statics.findConflicts = async function(staffId, scheduledAt, duration, excludeId = null) {
  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  const query = {
    'staff.id': staffId,
    status: { $nin: ['cancelled', 'no_show'] },
    $or: [
      {
        scheduledAt: { $lt: endTime },
        $expr: {
          $gt: [
            { $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] },
            startTime
          ]
        }
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

// Static method to get appointments for a date range
appointmentSchema.statics.findByDateRange = function(branchId, startDate, endDate, status = null) {
  const query = {
    'branch.id': branchId,
    scheduledAt: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query).sort({ scheduledAt: 1 });
};

// Static method to get today's appointments
appointmentSchema.statics.findToday = function(branchId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.findByDateRange(branchId, startOfDay, endOfDay);
};

// Pre-save hook to calculate total amount
appointmentSchema.pre('save', function(next) {
  if (this.services && this.services.length > 0) {
    this.totalAmount = this.services.reduce((sum, service) => sum + service.price, 0);
  }
  next();
});

// Pre-save hook to set completed/cancelled timestamps
appointmentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
    if (this.status === 'cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);

// Made with Bob
