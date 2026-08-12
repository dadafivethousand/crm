import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useToast } from "./Components/Toast";
import "./Stylesheets/EmailBlaster.css";

const WORKER = "https://worker-consolidated.maxli5004.workers.dev";
const DEFAULT_TEST_ADDRESS = "maxli5004@gmail.com";

export default function EmailBlaster({ open, onClose, leadKeys = [], leads = [], buildHeaders, isMaple = true }) {
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

  // { done, total } while a batched send is in flight.
  const [progress, setProgress] = useState(null);

  const busy = generating || testing || sending;

  const brand = isMaple
    ? { name: "Maple Jiu-Jitsu", email: "admin@maplebjj.com", initial: "M" }
    : { name: "Richmond Hill BJJ", email: "info@rh-bjj.com", initial: "R" };

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

  // A disabled button with no explanation is indistinguishable from a broken
  // one, so every gate says which one it is.
  const sendBlockedReason = !html
    ? "Generate an email first"
    : selectedLeads.length === 0
    ? "No leads selected — close this and tick some rows"
    : withEmail.length === 0
    ? `None of the ${selectedLeads.length} selected leads have an email address`
    : !testSent
    ? "Send yourself a test first"
    : null;

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

    // Batched rather than one long request: a few hundred sends at ~120ms each
    // outlives a single fetch, and a batch that fails is a batch worth of
    // recipients rather than the whole list.
    const BATCH_SIZE = 25;
    const batches = [];
    for (let i = 0; i < leadKeys.length; i += BATCH_SIZE) {
      batches.push(leadKeys.slice(i, i + BATCH_SIZE));
    }

    setSending(true);
    setProgress({ done: 0, total: leadKeys.length });

    const totals = { attempted: 0, succeeded: 0, failed: 0 };
    const failures = [];
    const skipped = [];

    try {
      for (const batch of batches) {
        const { ok, payload } = await postJson("/api/email/send", {
          subject,
          html,
          text,
          leadKeys: batch,
          confirm: true,
        });

        if (!ok) {
          console.error("[blaster] send batch failed:", payload);
          toast.error(
            `${payload?.error || "Send failed."} Stopped after ${totals.succeeded} sent.`
          );
          return;
        }

        totals.attempted += payload.attempted || 0;
        totals.succeeded += payload.succeeded || 0;
        totals.failed += payload.failed || 0;
        failures.push(...(payload.failures || []));
        skipped.push(...(payload.skipped || []));

        setProgress((p) => ({ ...p, done: Math.min(p.done + batch.length, p.total) }));
      }

      if (failures.length) console.warn("[blaster] failures:", failures);
      if (skipped.length) console.warn("[blaster] skipped:", skipped);

      const skipNote = skipped.length ? `, ${skipped.length} skipped` : "";
      if (totals.failed > 0) {
        toast.error(
          `${totals.succeeded} sent, ${totals.failed} failed${skipNote}. See console for details.`
        );
      } else {
        toast.success(`Sent to ${totals.succeeded} lead${totals.succeeded === 1 ? "" : "s"}${skipNote}.`);
        onClose();
      }
    } catch (err) {
      console.error("[blaster] send error:", err);
      toast.error(`Network error after ${totals.succeeded} sent.`);
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  if (!open) return null;

  // eslint-disable-next-line no-console
  console.debug("[blaster] gate", {
    leadKeys: leadKeys.length,
    leadsLoaded: leads.length,
    matched: selectedLeads.length,
    withEmail: withEmail.length,
    hasHtml: !!html,
    testSent,
    blocked: sendBlockedReason,
  });

  return createPortal(
    <div className="blaster-overlay" onClick={() => { if (!busy) onClose(); }}>
      <div
        className="blaster-modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI email"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="blaster-header">
          <div>
            <h2 className="blaster-title">AI email</h2>
            <div className="blaster-meta">
              <span className="blaster-pill blaster-pill--brand">
                {selectedLeads.length} selected
              </span>
              {missingEmail > 0 && (
                <span className="blaster-pill blaster-pill--warn">
                  {missingEmail} without an email
                </span>
              )}
              <span className="blaster-pill">{brand.name}</span>
            </div>
          </div>
          <button className="blaster-close" onClick={onClose} disabled={busy} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="blaster-body">
          {/* ── Compose ─────────────────────────────────────────── */}
          <section className="blaster-pane">
            <div className="blaster-step">
              <span className="blaster-step-n">1</span>
              <span className="blaster-step-label">Describe the email</span>
            </div>

            <textarea
              className="blaster-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Invite past leads back for a free week of training in August. Mention the new beginner class times and that the first class is no-pressure."
              disabled={busy}
            />

            <div className="blaster-row-2">
              <div className="blaster-field">
                <label className="blaster-label" htmlFor="blaster-tone">Tone</label>
                <input
                  id="blaster-tone"
                  className="blaster-input"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="warm and direct"
                  disabled={busy}
                />
              </div>
              <div className="blaster-field">
                <label className="blaster-label" htmlFor="blaster-cta">Call to action</label>
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
              {generating ? (
                <><span className="blaster-spinner" />Writing…</>
              ) : html ? "Regenerate" : "Generate email"}
            </button>

            <div className="blaster-tokens">
              <span className="blaster-tokens-label">Fills in per lead</span>
              <span className="blaster-token">{"{{first_name}}"}</span>
              <span className="blaster-token">{"{{last_name}}"}</span>
              <p className="blaster-tokens-note">
                A lead with no first name gets “there”, so the sentence has to read
                correctly either way.
              </p>
            </div>
          </section>

          {/* ── Preview ─────────────────────────────────────────── */}
          <section className="blaster-pane">
            <div className="blaster-step">
              <span className="blaster-step-n">2</span>
              <span className="blaster-step-label">Review what they’ll get</span>
            </div>

            <label className="blaster-label" htmlFor="blaster-subject">Subject line</label>
            <input
              id="blaster-subject"
              className="blaster-input blaster-input--subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Appears once you generate"
              disabled={busy || !html}
            />

            <div className="blaster-inbox">
              <div className="blaster-inbox-bar">
                <div className="blaster-avatar">{brand.initial}</div>
                <div className="blaster-inbox-who">
                  <div className="blaster-from">{brand.name}</div>
                  <div className="blaster-addr">{brand.email}</div>
                </div>
                <div className="blaster-inbox-width">600px</div>
              </div>

              <div className="blaster-stage">
                {html ? (
                  <iframe className="blaster-preview" title="Email preview" srcDoc={html} sandbox="" />
                ) : (
                  <div className="blaster-empty">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M2 7l10 6 10-6" />
                    </svg>
                    <p>Your email previews here at the width it renders in an inbox.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="blaster-footer">
          <div className="blaster-foot-left">
            <span className="blaster-step-n blaster-step-n--sm">3</span>
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
            {testSent && (
              <span className="blaster-ok">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Test sent
              </span>
            )}
          </div>

          <div className="blaster-actions">
            {sendBlockedReason && <span className="blaster-gate">{sendBlockedReason}</span>}
            <button className="blaster-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button
              className="blaster-btn blaster-btn--send"
              onClick={handleSend}
              disabled={busy || !!sendBlockedReason}
              title={sendBlockedReason || undefined}
            >
              {sending
                ? progress
                  ? `Sending… ${progress.done}/${progress.total}`
                  : "Sending…"
                : `Send to ${withEmail.length} lead${withEmail.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
