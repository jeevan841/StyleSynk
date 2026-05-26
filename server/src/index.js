require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/branches', require('./routes/branches'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/services', require('./routes/services'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'StyleSynk API' });
});

app.listen(PORT, () => {
  console.log(`\n✨ StyleSynk API running on http://localhost:${PORT}`);
  console.log(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Set' : '⚠️  Not set (AI will use mock mode)'}\n`);
});
