import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../api';

const SUGGESTIONS = [
  'Book haircut for Priya tomorrow at 10am at Banjara Hills',
  'Hair color for Deepika next Friday at 3pm',
  'Manicure for Kavitha today at 2pm at Jubilee Hills',
  'Full body massage for Meghana at Gachibowli at 5pm',
];

const WELCOME_MSG = {
  id: 'welcome',
  role: 'ai',
  content: '✨ Hi! I\'m your StyleSynk AI assistant. Describe a booking in plain English and I\'ll extract all the details automatically!\n\nTry: *"Book a hair color for Priya tomorrow at 3pm at Banjara Hills"*',
  timestamp: new Date(),
};

function formatTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWidget({ onFillBooking }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: msg, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await aiAPI.parseBooking(msg);
      const data = res.data;

      if (data.error === 'not_a_booking_request') {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'ai-error',
          content: '🤔 That doesn\'t look like a booking request. Try something like "Book a haircut for [name] tomorrow at 3pm at Banjara Hills"',
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'ai',
          content: `✅ Got it! Here's what I extracted:`,
          parsed: data,
          mode: res.mode,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai-error',
        content: '❌ Couldn\'t connect to the AI server. Make sure the backend is running on port 5000.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFill = (parsed) => {
    window.dispatchEvent(new CustomEvent('ai-fill-booking', { detail: parsed }));
    window.dispatchEvent(new CustomEvent('open-booking'));
    onFillBooking?.();
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'ai',
      content: '📋 I\'ve filled the booking form with these details. Review and confirm!',
      timestamp: new Date(),
    }]);
  };

  const FIELD_LABELS = {
    service: '💇 Service', date: '📅 Date', time: '🕐 Time',
    branch: '🏢 Branch', customer_name: '👤 Client', phone: '📱 Phone',
    stylist_preference: '✂️ Stylist', notes: '📝 Notes',
  };

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="chat-msg chat-msg-user">
          <div className="chat-bubble chat-bubble-user">{msg.content}</div>
          <div className="chat-timestamp">{formatTime(msg.timestamp)}</div>
        </div>
      );
    }
    if (msg.role === 'ai-error') {
      return (
        <div key={msg.id} className="chat-msg chat-msg-ai">
          <div className="chat-bubble chat-bubble-error">{msg.content}</div>
          <div className="chat-timestamp">{formatTime(msg.timestamp)}</div>
        </div>
      );
    }
    return (
      <div key={msg.id} className="chat-msg chat-msg-ai">
        <div className="chat-bubble chat-bubble-ai" style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
        {msg.parsed && (
          <div className="chat-parsed-result">
            {Object.entries(FIELD_LABELS).map(([key, label]) => {
              const val = msg.parsed[key];
              if (!val) return null;
              return (
                <div key={key} className="parsed-field">
                  <span className="parsed-field-key">{label}</span>
                  <span className="parsed-field-value">{val}</span>
                </div>
              );
            })}
            {msg.parsed.confidence && (
              <div className="parsed-field">
                <span className="parsed-field-key">🎯 Confidence</span>
                <span className="parsed-field-value">{Math.round(msg.parsed.confidence * 100)}%</span>
              </div>
            )}
            {msg.mode === 'mock' && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                ⚙️ Mock mode — set GROQ_API_KEY for full AI
              </div>
            )}
            <button className="chat-fill-btn" onClick={() => handleFill(msg.parsed)}>
              ✨ Auto-fill Booking Form →
            </button>
          </div>
        )}
        <div className="chat-timestamp">{formatTime(msg.timestamp)}</div>
      </div>
    );
  };

  return (
    <>
      {/* FAB */}
      <button
        id="ai-chat-fab"
        className="chat-fab"
        onClick={() => setOpen(o => !o)}
        title="AI Booking Assistant"
        aria-label="Open AI chat"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat window */}
      {open && (
        <div className="chat-window" role="dialog" aria-label="AI Booking Assistant">
          <div className="chat-header">
            <div className="chat-header-avatar">🤖</div>
            <div className="chat-header-info">
              <div className="chat-header-name">StyleSynk AI</div>
              <div className="chat-header-status">● Online · Smart booking assistant</div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-messages" id="chat-messages">
            {messages.map(renderMessage)}

            {loading && (
              <div className="chat-msg chat-msg-ai">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {showSuggestions && (
            <div className="chat-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chat-suggestion-chip" onClick={() => send(s)}>
                  {s.length > 38 ? s.slice(0, 38) + '…' : s}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-area">
            <input
              ref={inputRef}
              id="chat-input"
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Describe a booking in plain English…"
              disabled={loading}
            />
            <button
              id="chat-send-btn"
              className="chat-send-btn"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
