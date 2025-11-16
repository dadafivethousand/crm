import React, { useRef, useEffect } from 'react';
import "../Stylesheets/EmailComposer.css"

export default function EmailComposer({
  open,
  onClose,
  onSend,
  sending,
  subject,
  setSubject,
  body,
  setBody,
  selectedCount = 0
}) {
  const emailRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose, sending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('[EmailComposer] handleSubmit fired. sending=', sending, 'onSend=', typeof onSend);
    if (sending) {
      console.log('[EmailComposer] submission blocked: already sending');
      return;
    }
    if (typeof onSend !== 'function') {
      console.warn('[EmailComposer] onSend is not a function:', onSend);
      return;
    }
    try {
      const result = onSend();
      // If onSend returns a promise, show that it was called
      if (result && typeof result.then === 'function') {
        console.log('[EmailComposer] onSend returned a Promise');
        result.catch(err => console.error('[EmailComposer] onSend rejected:', err));
      }
    } catch (err) {
      console.error('[EmailComposer] onSend threw:', err);
    }
  };

  if (!open) return null;

  return (
    <div
      className="email-modal-overlay"
      onClick={() => { if (!sending) onClose(); }}
    >
      <div
        ref={emailRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="email-modal"
      >
        <header className="email-modal-header">
          <h2>Compose Email</h2>
        </header>

        <form className="email-form" onSubmit={handleSubmit}>
          <div className="email-row">
            <label className="email-label">Subject</label>
            <input
              className="email-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              autoFocus
            />
          </div>

          <div className="email-row">
            <label className="email-label">Message</label>
            <textarea
              className="email-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              disabled={sending}
            />
            <div className="recipients-note">
              Recipients: {selectedCount} · Formatting (line breaks, tabs, spaces) will be preserved.
            </div>
          </div>

          <div className="email-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>

            {/* Submit button: keep type="submit" for proper form behavior,
                but add an onClick fallback so clicks show a console log immediately. */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending}
              onClick={() => console.log('[EmailComposer] Send button clicked (onClick fallback)')}
            >
              {sending ? 'Sending…' : 'Send Emails'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
