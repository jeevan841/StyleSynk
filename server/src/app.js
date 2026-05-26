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
const { testConnection, closePool } = require('./config/db');

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
// Attach io to every request so controllers can emit events
app.set('io', io);

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet());

// CORS configuration - support multiple origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ============================================================
// REQUEST TIMEOUT MIDDLEWARE
// ============================================================
const timeoutMiddleware = (timeout) => (req, res, next) => {
  req.setTimeout(timeout);
  res.setTimeout(timeout);
  
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'REQUEST_TIMEOUT',
        message: 'Request took too long to process'
      });
    }
  }, timeout);
  
  res.on('finish', () => clearTimeout(timeoutId));
  res.on('close', () => clearTimeout(timeoutId));
  
  next();
};

// Default 10 second timeout for all routes
app.use(timeoutMiddleware(10000));

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
  let dbStatus = 'disconnected';
  try {
    const connected = await testConnection();
    dbStatus = connected ? 'connected' : 'disconnected';
  } catch (error) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString()
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

// AI route with extended 15 second timeout
app.use('/api/ai', timeoutMiddleware(15000), require('./routes/ai'));

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
// VALIDATE REQUIRED ENVIRONMENT VARIABLES
// ============================================================
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n✨ StyleSynk API running on http://localhost:' + PORT);
  console.log('   DB:  ' + (process.env.DB_NAME || 'stylesynk') + ' @ ' + (process.env.DB_HOST || 'localhost'));
  console.log('   AI:  ' + (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here' ? '✅ Groq active' : '⚠️  Mock mode'));
  console.log('   WS:  Socket.IO ready\n');
});

// ============================================================
// GRACEFUL SHUTDOWN HANDLERS
// ============================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close database pool
    await closePool();
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server, io };

// Made with Bob
