import { useState } from 'react';
import { aiAPI } from '../api';

const EXAMPLES = [
  {
    label: 'Basic booking',
    msg: 'Book a haircut for Priya tomorrow at 10am at Banjara Hills',
  },
  {
    label: 'With stylist',
    msg: 'Schedule hair color for Deepika with Divya Krishnan on Friday at 3pm at Gachibowli',
  },
  {
    label: 'Complex request',
    msg: 'My client Ananya Reddy (+91 98765 11002) wants a bridal package next Monday at 9am at Hitech City. Please note she has sensitive skin.',
  },
  {
    label: 'Not a booking',
    msg: 'What are your salon timings?',
  },
];

export default function AIPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parse = async (msg) => {
    const text = msg || input;
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await aiAPI.parseBooking(text);
      setResult({ data: res.data, mode: res.mode, input: text });
    } catch {
      setError('⚠️ Could not reach the backend. Make sure the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const FIELD_LABELS = {
    service: '💇 Service', date: '📅 Date', time: '🕐 Time',
    branch: '🏢 Branch', customer_name: '👤 Client Name',
    phone: '📱 Phone', stylist_preference: '✂️ Stylist Preference',
    notes: '📝 Notes', confidence: '🎯 Confidence',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Booking Assistant</h1>
          <div className="page-subtitle">Parse natural language into structured appointment data</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Powered by Groq LLaMA
        </div>
      </div>

      {/* How it works */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(6,182,212,0.04))',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
      }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
          ✨ How it works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          {[
            { icon: '💬', title: 'Type naturally', desc: 'Describe a booking in plain English, just as you would say it out loud.' },
            { icon: '🤖', title: 'AI extracts', desc: 'Our LLaMA-powered AI identifies service, date, time, branch, stylist, and client details.' },
            { icon: '📋', title: 'Auto-fill form', desc: 'Click "Auto-fill Booking Form" and the booking modal is filled for you instantly.' },
          ].map(step => (
            <div key={step.title} style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{step.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Left: input */}
        <div>
          <div className="chart-card">
            <div className="chart-title">Try it now</div>
            <textarea
              id="ai-booking-input"
              className="form-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder='e.g. "Book a hair color for Priya tomorrow at 3pm at Banjara Hills"'
              style={{ minHeight: 120, marginBottom: 'var(--space-4)' }}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && parse()}
            />
            <button
              id="ai-parse-btn"
              className="btn btn-primary w-full"
              onClick={() => parse()}
              disabled={loading || !input.trim()}
            >
              {loading ? '⏳ Parsing...' : '🤖 Parse with AI'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
              Ctrl+Enter to parse
            </div>
          </div>

          {/* Examples */}
          <div style={{ marginTop: 'var(--space-5)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
              Try these examples
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {EXAMPLES.map(ex => (
                <button
                  key={ex.label}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: 'var(--space-3) var(--space-4)' }}
                  onClick={() => { setInput(ex.msg); parse(ex.msg); }}
                >
                  <span style={{ fontSize: 11, color: 'var(--brand-primary-light)', fontWeight: 700, minWidth: 90 }}>
                    {ex.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ex.msg}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: result */}
        <div>
          {error && (
            <div style={{
              background: 'var(--status-cancelled-bg)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', color: '#ef4444', marginBottom: 'var(--space-4)'
            }}>
              {error}
            </div>
          )}

          {loading && (
            <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 'var(--space-4)' }}>
              <div className="loading-spinner" />
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>AI is parsing your request…</div>
            </div>
          )}

          {result && !loading && (
            <div className="chart-card">
              <div className="chart-title">
                <span>Extracted Data</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {result.mode === 'mock' && (
                    <span style={{ fontSize: 11, color: 'var(--status-pending)', background: 'var(--status-pending-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                      Mock Mode
                    </span>
                  )}
                  {result.mode === 'groq' && (
                    <span style={{ fontSize: 11, color: 'var(--status-confirmed)', background: 'var(--status-confirmed-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                      ✅ Groq AI
                    </span>
                  )}
                </div>
              </div>

              {result.data.error ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Not a booking request</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>The AI detected this message doesn't describe a booking.</div>
                </div>
              ) : (
                <>
                  {/* Input echo */}
                  <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 'var(--space-4)', borderLeft: '3px solid var(--brand-primary)' }}>
                    "{result.input}"
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(FIELD_LABELS).map(([key, label]) => {
                      const val = key === 'confidence'
                        ? result.data[key] ? `${Math.round(result.data[key] * 100)}%` : null
                        : result.data[key];
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 160 }}>{label}</span>
                          <span style={{
                            fontSize: 14, fontWeight: 600,
                            color: val ? 'var(--brand-primary-light)' : 'var(--text-muted)',
                            background: val ? 'rgba(168,85,247,0.08)' : 'transparent',
                            padding: val ? '3px 10px' : '3px 0',
                            borderRadius: val ? 'var(--radius-full)' : 0,
                          }}>
                            {val || '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                      id="ai-fill-form-btn"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('ai-fill-booking', { detail: result.data }));
                        window.dispatchEvent(new CustomEvent('open-booking'));
                      }}
                    >
                      ✨ Auto-fill Booking Form
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setResult(null); setInput(''); }}>
                      Clear
                    </button>
                  </div>

                  {/* Raw JSON */}
                  <details style={{ marginTop: 'var(--space-4)' }}>
                    <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                      View raw JSON response
                    </summary>
                    <pre style={{
                      marginTop: 'var(--space-3)', padding: 'var(--space-4)',
                      background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
                      fontSize: 11, color: 'var(--brand-primary-light)', overflow: 'auto',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 'var(--space-3)', textAlign: 'center' }}>
              <div style={{ fontSize: 60 }}>🤖</div>
              <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Result will appear here
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Type a booking request on the left and click Parse
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
