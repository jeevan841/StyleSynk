// server/src/config/groq.js
// Singleton Groq client — imported by ai/parser.js

const Groq = require('groq-sdk');

let groqClient = null;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    return null; // AI will use mock fallback
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

module.exports = { getGroqClient };
