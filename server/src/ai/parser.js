// server/src/ai/parser.js
// Groq-powered NLP booking parser with mock fallback
// System prompt matches spec exactly.

const { getGroqClient } = require('../config/groq');

// Exact system prompt from spec
const SYSTEM_PROMPT = `You are StyleSynk's AI salon booking assistant.

Extract appointment details from the customer's message and return ONLY a valid JSON object with these fields:
- service (string or null)
- date (string or null)
- time (string in 12-hour format or null)
- branch (string or null)
- stylist_preference (string or null)
- customer_name (string or null)
- phone (string or null)
- notes (string or null)
- confidence (float 0-1)

If the message is not a booking request, return: {"error": "not_a_booking_request"}
Return ONLY the JSON. No explanation, no markdown.`;

/**
 * parseBookingMessage — main entry point
 * @param {string} message
 * @returns {{ data: object, mode: 'groq'|'mock' }}
 */
async function parseBookingMessage(message) {
  const groq = getGroqClient();

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: message },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() || '';

      // Strip markdown code fences if model wraps in ```json ... ```
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

      const parsed = JSON.parse(cleaned);
      return { data: parsed, mode: 'groq' };
    } catch (err) {
      console.error('Groq parse failed, falling back to mock:', err.message);
    }
  }

  // Mock fallback
  return { data: mockParse(message), mode: 'mock' };
}

/** Regex-based mock parser for local development without API key */
function mockParse(message) {
  const lower = message.toLowerCase();

  const services = [
    'haircut','hair color','hair spa','blowout','facial','gold facial','cleanup',
    'manicure','pedicure','full body massage','eyebrow threading','waxing','bridal package',
    'keratin treatment','highlights','balayage',
  ];
  const branches = ['banjara hills','jubilee hills','gachibowli','hitech city'];
  const timeRegex = /(\d{1,2}(?::\d{2})?)\s*(am|pm)/i;
  const nameRegex = /\bfor\s+([A-Z][a-z]+)/i;
  const phoneRegex = /(\+?\d[\d\s\-]{8,})/;
  const dateKeywords = ['today','tomorrow','monday','tuesday','wednesday','thursday','friday','saturday','sunday','next week'];

  const foundService = services.find(s => lower.includes(s));
  const foundBranch  = branches.find(b => lower.includes(b));
  const timeMatch    = message.match(timeRegex);
  const nameMatch    = message.match(nameRegex);
  const phoneMatch   = message.match(phoneRegex);
  const foundDate    = dateKeywords.find(d => lower.includes(d));

  // Reject non-booking messages
  if (!foundService && !foundBranch && !foundDate && !timeMatch) {
    return { error: 'not_a_booking_request' };
  }

  const capitalize = (s) => s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

  return {
    service:            foundService ? capitalize(foundService) : null,
    date:               foundDate    ? capitalize(foundDate)    : null,
    time:               timeMatch    ? `${timeMatch[1].includes(':') ? timeMatch[1] : timeMatch[1] + ':00'} ${timeMatch[2].toUpperCase()}` : null,
    branch:             foundBranch  ? capitalize(foundBranch)  : null,
    stylist_preference: null,
    customer_name:      nameMatch    ? nameMatch[1]             : null,
    phone:              phoneMatch   ? phoneMatch[1].trim()     : null,
    notes:              null,
    confidence:         (foundService && foundDate && timeMatch) ? 0.88 : 0.55,
    _mock:              true,
  };
}

module.exports = { parseBookingMessage, SYSTEM_PROMPT };
