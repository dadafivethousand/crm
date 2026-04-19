import React, { useState } from "react";
import { createPortal } from "react-dom";
import "../Stylesheets/NotesModal.css";

function parseNotes(raw) {
  if (!raw) return [];
  if (typeof raw === "string")
    return raw.trim() ? [{ text: raw.trim(), timestamp: null, author: "legacy" }] : [];
  if (Array.isArray(raw)) return raw;
  return [];
}

function formatTimestamp(ts) {
  if (!ts) return "legacy note";
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotesModal({
  open,
  onClose,
  recordKey,
  recordType,
  rawNotes,
  onNotesUpdated,
  buildHeaders,
}) {
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const notes = parseNotes(rawNotes);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    setError("");
    try {
      const headers = await buildHeaders();
      const res = await fetch(
        "https://worker-consolidated.maxli5004.workers.dev/add-note",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ key: recordKey, type: recordType, note: newNote.trim() }),
        }
      );
      if (!res.ok) {
        setError("Failed to save note.");
        return;
      }
      const { notes: updatedNotes } = await res.json();
      onNotesUpdated(recordKey, updatedNotes);
      setNewNote("");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
  };

  return createPortal(
    <div className="nm-overlay" onClick={onClose}>
      <div className="nm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nm-header">
          <h3>Notes {notes.length > 0 && <span className="nm-count">{notes.length}</span>}</h3>
          <button className="nm-close" onClick={onClose}>✕</button>
        </div>

        <div className="nm-body">
          <div className="nm-history">
            {notes.length === 0 ? (
              <p className="nm-empty">No notes yet.</p>
            ) : (
              notes.map((n, i) => (
                <div className="nm-note" key={i}>
                  <div className="nm-note-meta">
                    <span className="nm-note-author">
                      {n.author === "legacy" ? "Note" : n.author}
                    </span>
                    <span className="nm-note-ts">{formatTimestamp(n.timestamp)}</span>
                  </div>
                  <p className="nm-note-text">{n.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="nm-add-section">
            <textarea
              className="nm-textarea"
              placeholder="Add a new note… (Ctrl+Enter to save)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            {error && <p className="nm-error">{error}</p>}
            <button
              className="nm-add-btn"
              onClick={handleAdd}
              disabled={saving || !newNote.trim()}
            >
              {saving ? "Saving…" : "Add Note"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
