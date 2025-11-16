import React, { useRef, useEffect } from 'react';
import "../Stylesheets/TextComposer.css";

export default function TextComposer({
  open,
  onClose,
  onSend,
  sending,
  message,
  setMessage,
  selectedCount = 0
}) {
  const textRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose, sending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('[TextComposer] handleSubmit fired. sending=', sending, 'onSend=', typeof onSend);

    if (sending) {
      console.log('[TextComposer] submission blocked: already sending');
      return;
    }
    if (typeof onSend !== 'function') {
      console.warn('[TextComposer] onSend is not a function:', onSend);
      return;
    }
    try {
      const result = onSend();
      if (result && typeof result.then === 'function') {
        console.log('[TextComposer] onSend returned a Promise');
        result.catch(err => console.error('[TextComposer] onSend rejected:', err));
      }
    } catch (err) {
      console.error('[TextComposer] onSend threw:', err);
    }
  };

  if (!open) return null;

  return (
    <div
      className="text-modal-overlay"
      onClick={() => { if (!sending) onClose(); }}
    >
      <div
        ref={textRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="text-modal"
      >
        <header className="text-modal-header">
          <h2>Compose Text Message</h2>
        </header>

        <form className="text-form" onSubmit={handleSubmit}>
          <div className="text-row">
            <label className="text-label">Message</label>
            <textarea
              className="text-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              disabled={sending}
              autoFocus
            />
            <div className="recipients-note">
              Recipients: {selectedCount} · Message formatting will be preserved.
            </div>
          </div>

          <div className="text-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending}
              onClick={() => console.log('[TextComposer] Send button clicked (onClick fallback)')}
            >
              {sending ? 'Sending…' : 'Send Texts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
