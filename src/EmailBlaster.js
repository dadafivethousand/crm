import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useToast } from "./Components/Toast";
import "./Stylesheets/EmailBlaster.css";

const WORKER = "https://worker-consolidated.maxli5004.workers.dev";
const DEFAULT_TEST_ADDRESS = "maxli5004@gmail.com";

export default function EmailBlaster({ open, onClose, leadKeys = [], leads = [], buildHeaders }) {
  const toast = useToast();

  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("");
  const [cta, setCta] = useState("");

  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");

  const [testTo, setTestTo] = useState(DEFAULT_TEST_ADDRESS);

  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);

  // Gates the real send. Reset whenever the draft changes, so the thing that
  // was checked in an inbox is always the thing that goes out.
  const [testSent, setTestSent] = useState(false);

  const busy = generating || testing || sending;

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose, busy]);

  const selectedLeads = useMemo(
    () => leads.filter((l) => leadKeys.includes(l.key)),
    [leads, leadKeys]
  );

  // Counted client-side only to warn before sending. The server re-derives all
  // of this from KV — the browser's copy of a lead can be stale, and leadKeys
  // is user-supplied.
  const withEmail = useMemo(
    () => selectedLeads.filter((l) => (l.data?.email || "").trim()),
    [selectedLeads]
  );
  const missingEmail = selectedLeads.length - withEmail.length;

  async function postJson(path, body) {
    const base = await buildHeaders();
    const headers = base instanceof Headers ? base : new Headers(base || {});
    headers.set("Content-Type", "application/json");
    const res = await fetch(`${WORKER}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, payload };
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Describe the email you want first.");
      return;
    }
    setGenerating(true);
    try {
      const { ok, payload } = await postJson("/api/email/generate", {
        prompt: prompt.trim(),
        ...(tone.trim() ? { tone: tone.trim() } : {}),
        ...(cta.trim() ? { cta: cta.trim() } : {}),
      });

      if (!ok) {
        console.error("[blaster] generate failed:", payload);
        toast.error(payload?.error || "Generation failed.");
        return;
      }

      setSubject(payload.subject || "");
      setHtml(payload.html || "");
      setText(payload.text || "");
      // A new draft has not been seen in an inbox yet.
      setTestSent(false);
      toast.success("Draft ready.");
    } catch (err) {
      console.error("[blaster] generate error:", err);
      toast.error("Network error while generating.");
    } finally {
      setGenerating(false);
    }
  };

  const handleTest = async () => {
    if (!html) {
      toast.error("Generate a draft first.");
      return;
    }
    if (!testTo.trim()) {
      toast.error("Enter a test address.");
      return;
    }
    setTesting(true);
    try {
      const { ok, payload } = await postJson("/api/email/test", {
        subject,
        html,
        text,
        to: testTo.trim(),
      });

      if (!ok) {
        console.error("[blaster] test failed:", payload);
        toast.error(payload?.error || "Test send failed.");
        return;
      }

      setTestSent(true);
      toast.success(`Test sent to ${payload.to}.`);
    } catch (err) {
      console.error("[blaster] test error:", err);
      toast.error("Network error while sending test.");
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    if (!testSent) return;

    const lines = [
      `Send this email to ${withEmail.length} lead${withEmail.length === 1 ? "" : "s"}?`,
    ];
    if (missingEmail > 0) {
      lines.push(
        `${missingEmail} of the ${selectedLeads.length} selected have no email address and will be skipped.`
      );
    }
    lines.push("", "This cannot be undone.");
    if (!window.confirm(lines.join("\n"))) return;

    setSending(true);
    try {
      const { ok, payload } = await postJson("/api/email/send", {
        subject,
        html,
        text,
        leadKeys,
        confirm: true,
      });

      if (!ok) {
        console.error("[blaster] send failed:", payload);
        toast.error(payload?.error || "Send failed.");
        return;
      }

      const { attempted = 0, succeeded = 0, failed = 0 } = payload;
      if (failed > 0) {
        toast.error(`${succeeded} of ${attempted} sent — ${failed} failed. See console.`);
        console.warn("[blaster] failures:", payload.failures);
      } else {
        toast.success(`Sent to ${succeeded} lead${succeeded === 1 ? "" : "s"}.`);
        onClose();
      }
    } catch (err) {
      console.error("[blaster] send error:", err);
      toast.error("Network error while sending.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="blaster-overlay" onClick={() => { if (!busy) onClose(); }}>
      <div
        className="blaster-modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI email blaster"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="blaster-header">
          <h2>Email {selectedLeads.length} selected lead{selectedLeads.length === 1 ? "" : "s"}</h2>
          <button className="blaster-close" onClick={onClose} disabled={busy} aria-label="Close">×</button>
        </header>

        <div className="blaster-body">
          <section className="blaster-col">
            <label className="blaster-label" htmlFor="blaster-prompt">What should the email say?</label>
            <textarea
              id="blaster-prompt"
              className="blaster-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Invite past leads back for a free week of training in August. Mention the new beginner class times."
              disabled={busy}
            />

            <div className="blaster-row-2">
              <div>
                <label className="blaster-label" htmlFor="blaster-tone">Tone (optional)</label>
                <input
                  id="blaster-tone"
                  className="blaster-input"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="warm and direct"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="blaster-label" htmlFor="blaster-cta">Call to action (optional)</label>
                <input
                  id="blaster-cta"
                  className="blaster-input"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Reply to book a free class"
                  disabled={busy}
                />
              </div>
            </div>

            <button className="blaster-btn blaster-btn--primary" onClick={handleGenerate} disabled={busy}>
              {generating ? "Generating…" : html ? "Regenerate" : "Generate"}
            </button>

            <p className="blaster-hint">
              Use <code>{"{{first_name}}"}</code> and <code>{"{{last_name}}"}</code> in the copy — they
              fill in per lead. <code>{"{{first_name}}"}</code> becomes “there” when a lead has no name.
            </p>
          </section>

          <section className="blaster-col">
            <label className="blaster-label" htmlFor="blaster-subject">Subject</label>
            <input
              id="blaster-subject"
              className="blaster-input"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setTestSent(false); }}
              placeholder="Generated subject appears here"
              disabled={busy || !html}
            />

            <div className="blaster-preview-wrap">
              {html ? (
                <iframe
                  className="blaster-preview"
                  title="Email preview"
                  srcDoc={html}
                  sandbox=""
                />
              ) : (
                <div className="blaster-preview-empty">
                  The generated email will preview here at 600px — the width it renders at in an inbox.
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="blaster-footer">
          <div className="blaster-test">
            <input
              className="blaster-input blaster-input--test"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
              disabled={busy || !html}
              aria-label="Test recipient address"
            />
            <button className="blaster-btn" onClick={handleTest} disabled={busy || !html}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>

          <div className="blaster-actions">
            {!testSent && html && (
              <span className="blaster-gate">Send a test first</span>
            )}
            <button className="blaster-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button
              className="blaster-btn blaster-btn--send"
              onClick={handleSend}
              disabled={busy || !testSent || withEmail.length === 0}
              title={!testSent ? "Send a test to yourself before mailing leads" : undefined}
            >
              {sending ? "Sending…" : `Send to ${withEmail.length} lead${withEmail.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
