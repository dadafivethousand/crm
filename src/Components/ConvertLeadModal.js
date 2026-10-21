// ./Components/ConvertLeadModal.js
//
// "Convert to Client" from the leads list: pick Adult or Kid before the client
// form opens. The choice starts on a guess from the lead's own fields (see
// guessLeadType), but it is only a starting point — click the other one.
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "../Stylesheets/DeleteOptionsModal.css";
import "../Stylesheets/ConvertLeadModal.css";

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== "";

// Years old from a date of birth, or null if it does not parse.
const ageFrom = (dob) => {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
};

// Kid or adult, and the reason, from whatever fields the lead carries. The
// website and kiosk forms only send name / email / phone today, so most leads
// land on "adult"; any parent, guardian, child or kid field (or a young age,
// or a kids program) tips it to "kid".
export function guessLeadType(data = {}) {
  for (const [key, value] of Object.entries(data)) {
    if (!filled(value) || value === false) continue;
    if (/parent|guardian/i.test(key)) return { type: "kid", reason: "it has a parent's name" };
    if (/child|kid|minor/i.test(key)) return { type: "kid", reason: `it has a "${key}" field` };
  }
  const age = filled(data.age) ? Number(data.age) : ageFrom(data.dob || data.dateOfBirth || data.birthday);
  if (age !== null && !isNaN(age) && age < 13) return { type: "kid", reason: `the age is ${Math.floor(age)}` };
  const program = [data.program, data.interest, data.class, data.classType].filter(filled).join(" ");
  if (/kid|child|junior|youth/i.test(program)) return { type: "kid", reason: "it is for a kids program" };
  return { type: "adult", reason: "there is no parent or child info on it" };
}

export default function ConvertLeadModal({ lead, onCancel, onConfirm }) {
  const guess = guessLeadType(lead?.data);
  const [type, setType] = useState(guess.type);

  // a different lead opened the modal: start from its own guess
  useEffect(() => setType(guessLeadType(lead?.data).type), [lead]);

  useEffect(() => {
    if (!lead) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.(type);
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lead, type, onCancel, onConfirm]);

  if (!lead) return null;
  const d = lead.data || {};
  const name = [d.firstName, d.lastName].filter(filled).join(" ") || d.email || "this lead";

  return createPortal(
    <div className="modal-overlay dom-overlay" role="dialog" aria-modal="true" onMouseDown={onCancel}>
      <div className="dom-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dom-title">Convert {name} to a client</div>
        <div className="dom-message">
          What kind of client is this? We guessed <strong>{guess.type}</strong> because {guess.reason}.
        </div>

        <div className="clm-choices" role="radiogroup" aria-label="Client type">
          {[
            { value: "adult", label: "Adult", hint: "Adult membership" },
            { value: "kid", label: "Kid", hint: "Lead is the parent, add the child" },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={type === o.value}
              className={`clm-choice${type === o.value ? " is-on" : ""}`}
              onClick={() => setType(o.value)}
            >
              <span className="clm-choice__label">
                {o.label}
                {guess.type === o.value && <span className="clm-badge">Suggested</span>}
              </span>
              <span className="clm-choice__hint">{o.hint}</span>
            </button>
          ))}
        </div>

        <div className="dom-actions">
          <button className="dom-btn dom-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="dom-btn dom-primary" type="button" onClick={() => onConfirm(type)}>
            Continue as {type === "kid" ? "Kid" : "Adult"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
