# StyleSynk — MongoDB Migration Guide

> Guide for adding MongoDB support as an alternative database option to PostgreSQL

---

## ⚠️ Important Notice

**StyleSynk is currently built on PostgreSQL** and uses advanced features like:
- Advisory locks for concurrency control
- ACID transactions
- Foreign key constraints
- Complex joins for analytics
- Triggers and stored procedures

**This guide provides MongoDB as an ALTERNATIVE option**, not a replacement. PostgreSQL is recommended for production use due to the transactional nature of salon management operations.

---

## 📋 Table of Contents

1. [Why MongoDB?](#why-mongodb)
2. [Architecture Comparison](#architecture-comparison)
3. [Prerequisites](#prerequisites)
4. [MongoDB Setup](#mongodb-setup)
5. [Schema Design](#schema-design)
6. [Data Migration](#data-migration)
7. [Code Changes](#code-changes)
8. [Hybrid Approach](#hybrid-approach)
9. [Performance Considerations](#performance-considerations)
10. [Troubleshooting](#troubleshooting)

---

## 🤔 Why MongoDB?

### Use Cases for MongoDB

✅ **Good for:**
- Rapid prototyping
- Flexible schema requirements
- Document-heavy operations
- Horizontal scaling needs
- Cloud-native deployments (MongoDB Atlas)

❌ **Not ideal for:**
- Complex transactions (billing, commissions)
- Strong consistency requirements
- Relational data with many joins
- Financial calculations

### Recommendation

**Keep PostgreSQL for:**
- Appointments (concurrency control)
- Billing & invoices
- Commissions
- Inventory transactions

**Consider MongoDB for:**
- Customer profiles (flexible fields)
- AI chat history
- Notifications
- Analytics logs
- Audit trails

---

## 🏗️ Architecture Comparison

### PostgreSQL (Current)

```
┌─────────────────────────────────────────┐
│         PostgreSQL Database             │
│                                         │
│  ┌──────────┐  ┌──────────┐           │
│  │  Users   │──│  Roles   │           │
│  └────┬─────┘  └──────────┘           │
│       │                                │
│  ┌────▼──────────┐  ┌──────────────┐  │
│  │ Appointments  │──│   Services   │  │
│  └───────┬───────┘  └──────────────┘  │
│          │                             │
│  ┌───────▼────────┐  ┌─────────────┐  │
│  │    Billing     │──│ Commissions │  │
│  └────────────────┘  └─────────────┘  │
└─────────────────────────────────────────┘
```

### MongoDB (Alternative)

```
┌─────────────────────────────────────────┐
│         MongoDB Database                │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  users (embedded roles)          │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  appointments (embedded services)│  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  bills (embedded line items)     │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## ✅ Prerequisites

### Local Development

```bash
# Install MongoDB
# macOS
brew tap mongodb/brew
brew install mongodb-community@7.0

# Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Windows
# Download from https://www.mongodb.com/try/download/community
```

### MongoDB Atlas (Cloud)

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0)
3. Get connection string
4. Whitelist your IP address

### Node.js Dependencies

```bash
cd server
npm install mongoose mongodb
```

---

## 🗄️ MongoDB Setup

### Local MongoDB

```bash
# Start MongoDB service
# macOS
brew services start mongodb-community@7.0

# Ubuntu
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh
```

### MongoDB Atlas Setup

```bash
# Connection string format
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/stylesynk?retryWrites=true&w=majority
```

---

## 📊 Schema Design

### Mongoose Models

Create `server/src/models/mongodb/` directory:

#### 1. User Model (`user.model.js`)

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    name: {
      type: String,
      enum: ['owner', 'branch_manager', 'receptionist', 'stylist', 'customer'],
      required: true
    },
    permissions: {
      type: Map,
      of: Boolean,
      default: {}
    }
  },
  branch: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String
  },
  name: String,
  phone: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  metadata: {
    specialization: [String],  // For stylists
    experience: Number,
    rating: Number
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'role.name': 1 });
userSchema.index({ 'branch.id': 1 });

module.exports = mongoose.model('User', userSchema);
```

#### 2. Appointment Model (`appointment.model.js`)

```javascript
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    name: String,
    phone: String,
    email: String
  },
  branch: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: String
  },
  staff: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String
  },
  services: [{
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    duration: Number,
    price: Number
  }],
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  notes: String,
  totalAmount: Number,
  createdBy: {
    id: mongoose.Schema.Types.ObjectId,
    name: String
  }
}, {
  timestamps: true,
  collection: 'appointments'
});

// Indexes for queries
appointmentSchema.index({ 'branch.id': 1, scheduledAt: 1 });
appointmentSchema.index({ 'staff.id': 1, scheduledAt: 1 });
appointmentSchema.index({ 'customer.id': 1 });
appointmentSchema.index({ status: 1 });

// Compound index for collision detection
appointmentSchema.index({ 
  'staff.id': 1, 
  scheduledAt: 1, 
  duration: 1 
});

module.exports = mongoose.model('Appointment', appointmentSchema);
```

#### 3. Bill Model (`bill.model.js`)

```javascript
const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  branch: {
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  customer: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    phone: String,
    membershipTier: String
  },
  appointment: {
    id: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  items: [{
    type: {
      type: String,
      enum: ['service', 'product']
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    quantity: Number,
    price: Number,
    staff: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      commissionRate: Number,
      commissionAmount: Number
    }
  }],
  subtotal: Number,
  discount: {
    type: String,
    amount: Number,
    reason: String
  },
  gst: {
    rate: Number,
    amount: Number
  },
  total: Number,
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  loyaltyPoints: {
    earned: Number,
    redeemed: Number
  },
  createdBy: {
    id: mongoose.Schema.Types.ObjectId,
    name: String
  }
}, {
  timestamps: true,
  collection: 'bills'
});

// Indexes
billSchema.index({ billNumber: 1 });
billSchema.index({ 'branch.id': 1, createdAt: -1 });
billSchema.index({ 'customer.id': 1 });
billSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Bill', billSchema);
```

#### 4. Customer Model (`customer.model.js`)

```javascript
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  email: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  membership: {
    tier: String,
    validUntil: Date,
    discount: Number
  },
  loyalty: {
    points: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    visitCount: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    favoriteServices: [String],
    preferredStaff: [{
      id: mongoose.Schema.Types.ObjectId,
      name: String
    }],
    allergies: [String],
    notes: String
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  lastVisit: Date
}, {
  timestamps: true,
  collection: 'customers'
});

// Indexes
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ 'membership.tier': 1 });
customerSchema.index({ lastVisit: -1 });

module.exports = mongoose.model('Customer', customerSchema);
```

---

## 🔄 Data Migration

### Migration Script

Create `server/src/scripts/migrate-to-mongodb.js`:

```javascript
const { Pool } = require('pg');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/mongodb/user.model');
const Customer = require('../models/mongodb/customer.model');
const Appointment = require('../models/mongodb/appointment.model');
const Bill = require('../models/mongodb/bill.model');

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stylesynk';

async function migrateUsers() {
  console.log('Migrating users...');
  
  const result = await pgPool.query(`
    SELECT u.*, r.name as role_name, b.name as branch_name, b.address as branch_address
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN branches b ON u.branch_id = b.id
  `);
  
  const users = result.rows.map(row => ({
    email: row.email,
    passwordHash: row.password_hash,
    role: {
      name: row.role_name,
      permissions: {}
    },
    branch: row.branch_id ? {
      id: row.branch_id,
      name: row.branch_name,
      address: row.branch_address
    } : undefined,
    name: row.name,
    isActive: row.is_active,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  
  await User.insertMany(users);
  console.log(`✓ Migrated ${users.length} users`);
}

async function migrateCustomers() {
  console.log('Migrating customers...');
  
  const result = await pgPool.query(`
    SELECT c.*, m.name as membership_name, m.discount_percent
    FROM customers c
    LEFT JOIN memberships m ON c.membership_id = m.id
  `);
  
  const customers = result.rows.map(row => ({
    name: row.name,
    phone: row.phone,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    membership: row.membership_id ? {
      tier: row.membership_name,
      validUntil: row.membership_valid_until,
      discount: row.discount_percent
    } : undefined,
    loyalty: {
      points: row.loyalty_points || 0,
      totalSpent: 0,
      visitCount: 0
    },
    isActive: row.is_active,
    lastVisit: row.last_visit,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  
  await Customer.insertMany(customers);
  console.log(`✓ Migrated ${customers.length} customers`);
}

async function migrateAppointments() {
  console.log('Migrating appointments...');
  
  const result = await pgPool.query(`
    SELECT 
      a.*,
      c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
      b.name as branch_name,
      u.name as staff_name,
      s.name as service_name, s.duration as service_duration, s.price as service_price
    FROM appointments a
    LEFT JOIN customers c ON a.customer_id = c.id
    LEFT JOIN branches b ON a.branch_id = b.id
    LEFT JOIN users u ON a.staff_id = u.id
    LEFT JOIN services s ON a.service_id = s.id
  `);
  
  const appointments = result.rows.map(row => ({
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email
    },
    branch: {
      id: row.branch_id,
      name: row.branch_name
    },
    staff: {
      id: row.staff_id,
      name: row.staff_name
    },
    services: [{
      id: row.service_id,
      name: row.service_name,
      duration: row.service_duration,
      price: row.service_price
    }],
    scheduledAt: row.scheduled_at,
    duration: row.duration,
    status: row.status,
    notes: row.notes,
    totalAmount: row.service_price,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  
  await Appointment.insertMany(appointments);
  console.log(`✓ Migrated ${appointments.length} appointments`);
}

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    
    // Clear existing data (optional)
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Appointment.deleteMany({});
    await Bill.deleteMany({});
    console.log('✓ Cleared existing MongoDB data');
    
    // Run migrations
    await migrateUsers();
    await migrateCustomers();
    await migrateAppointments();
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pgPool.end();
    await mongoose.disconnect();
  }
}

// Run migration
migrate();
```

### Run Migration

```bash
cd server
node src/scripts/migrate-to-mongodb.js
```

---

## 💻 Code Changes

### Database Configuration

Create `server/src/config/mongodb.js`:

```javascript
const mongoose = require('mongoose');

const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stylesynk';
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✓ MongoDB connected');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = { connectMongoDB, mongoose };
```

### Update `server/src/app.js`

```javascript
// Add MongoDB connection
const { connectMongoDB } = require('./config/mongodb');

// Connect to databases
if (process.env.USE_MONGODB === 'true') {
  connectMongoDB();
} else {
  // Use PostgreSQL (default)
  const { pool } = require('./config/db');
  pool.query('SELECT 1').then(() => {
    console.log('✓ PostgreSQL connected');
  });
}
```

### Dual Database Controller Example

Create `server/src/controllers/appointments.mongo.js`:

```javascript
const Appointment = require('../models/mongodb/appointment.model');
const { successResponse, errorResponse } = require('../utils/response');

// Get appointments
exports.getAppointments = async (req, res) => {
  try {
    const { branchId, date, staffId } = req.query;
    
    const query = {};
    if (branchId) query['branch.id'] = branchId;
    if (staffId) query['staff.id'] = staffId;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.scheduledAt = { $gte: startOfDay, $lte: endOfDay };
    }
    
    const appointments = await Appointment.find(query)
      .sort({ scheduledAt: 1 })
      .lean();
    
    return successResponse(res, appointments);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Create appointment
exports.createAppointment = async (req, res) => {
  try {
    const appointmentData = req.body;
    
    // Check for conflicts
    const conflict = await Appointment.findOne({
      'staff.id': appointmentData.staff.id,
      scheduledAt: {
        $lt: new Date(new Date(appointmentData.scheduledAt).getTime() + appointmentData.duration * 60000),
        $gte: appointmentData.scheduledAt
      },
      status: { $nin: ['cancelled', 'no_show'] }
    });
    
    if (conflict) {
      return errorResponse(res, 'Time slot not available', 409);
    }
    
    const appointment = await Appointment.create(appointmentData);
    
    // Emit Socket.IO event
    req.app.get('io').to(`branch:${appointmentData.branch.id}`).emit('appointment:created', appointment);
    
    return successResponse(res, appointment, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
```

---

## 🔀 Hybrid Approach

### Best of Both Worlds

```javascript
// server/src/config/database.js
const useMongoDB = process.env.USE_MONGODB === 'true';

module.exports = {
  // Transactional operations → PostgreSQL
  appointments: useMongoDB ? require('./controllers/appointments.mongo') : require('./controllers/appointments'),
  billing: require('./controllers/billingController'), // Always PostgreSQL
  
  // Flexible schema → MongoDB
  customers: useMongoDB ? require('./controllers/customers.mongo') : require('./controllers/customers'),
  notifications: useMongoDB ? require('./controllers/notifications.mongo') : require('./controllers/notificationsController'),
};
```

---

## ⚡ Performance Considerations

### Indexing Strategy

```javascript
// Create indexes
db.appointments.createIndex({ "branch.id": 1, "scheduledAt": 1 });
db.appointments.createIndex({ "staff.id": 1, "scheduledAt": 1 });
db.customers.createIndex({ "phone": 1 }, { unique: true });
db.bills.createIndex({ "createdAt": -1 });
```

### Aggregation Pipeline Example

```javascript
// Monthly revenue by branch
const revenue = await Bill.aggregate([
  {
    $match: {
      createdAt: {
        $gte: new Date('2026-01-01'),
        $lt: new Date('2026-02-01')
      }
    }
  },
  {
    $group: {
      _id: '$branch.id',
      branchName: { $first: '$branch.name' },
      totalRevenue: { $sum: '$total' },
      billCount: { $sum: 1 }
    }
  },
  {
    $sort: { totalRevenue: -1 }
  }
]);
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Timeout

```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# Verify connection string
echo $MONGODB_URI
```

#### 2. Slow Queries

```javascript
// Enable profiling
db.setProfilingLevel(2);

// Check slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 });
```

#### 3. Memory Issues

```javascript
// Use lean() for read-only queries
const appointments = await Appointment.find().lean();

// Use cursor for large datasets
const cursor = Appointment.find().cursor();
for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
  // Process doc
}
```

---

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Guide](https://mongoosejs.com/docs/guide.html)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [MongoDB University](https://university.mongodb.com/)

---

## ✅ Migration Checklist

- [ ] MongoDB installed/Atlas cluster created
- [ ] Mongoose models created
- [ ] Migration script tested
- [ ] Indexes created
- [ ] Controllers updated
- [ ] Environment variables configured
- [ ] Performance tested
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Documentation updated

---

**Recommendation**: Keep PostgreSQL as the primary database for StyleSynk. Use MongoDB only if you have specific requirements for flexible schemas or need to scale horizontally.

**Last Updated**: 2026-05-26