// server/src/app.js
// Main Express application — middleware stack, routes, Socket.IO, error handling

require('dotenv').config();
const express      = require('express');
const http         = require('http');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const { Server }   = require('socket.io');
const { initSocket } = require('./socket');
const { setIO }    = require('./services/notification');

const app    = express();
const server = http.createServer(app);

// ============================================================
// SOCKET.IO
// ============================================================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});
initSocket(io);
// Inject io into the notification service for emit-from-service pattern
setIO(io);
// Attach io to every request so controllers can emit events
app.set('io', io);

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ============================================================
// RATE LIMITING
// ============================================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX || '200'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many auth attempts, please wait.' },
});

// ============================================================
// BODY PARSING
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// LOGGING
// ============================================================
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', async (req, res) => {
  const { pool } = require('./config/db');
  let dbStatus = 'disconnected';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch { /* DB not reachable */ }

  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'StyleSynk API v1.0',
      environment: process.env.NODE_ENV,
      database: dbStatus,
      ai: process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here' ? 'groq' : 'mock',
    },
  });
});

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth',         authLimiter, require('./routes/auth'));
app.use('/api/branches',     require('./routes/branches'));
app.use('/api/staff',        require('./routes/staff'));
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/services',     require('./routes/services'));
app.use('/api/billing',      require('./routes/billing'));
app.use('/api/inventory',    require('./routes/inventory'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/ai',           require('./routes/ai'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/customer',     require('./routes/customer'));
app.use('/api/commissions',  require('./routes/commissions'));

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n✨ StyleSynk API running on http://localhost:' + PORT);
  console.log('   DB:  ' + (process.env.DB_NAME || 'stylesynk') + ' @ ' + (process.env.DB_HOST || 'localhost'));
  console.log('   AI:  ' + (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here' ? '✅ Groq active' : '⚠️  Mock mode'));
  console.log('   WS:  Socket.IO ready\n');
});

module.exports = { app, server, io };
