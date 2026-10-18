import React from "react";
import "../Stylesheets/BeltPicker.css";

// IBJJF kids belts, lowest to highest
export const KIDS_BELTS = [
  "White",
  "Grey/White",
  "Grey",
  "Grey/Black",
  "Yellow/White",
  "Yellow",
  "Yellow/Black",
  "Orange/White",
  "Orange",
  "Orange/Black",
  "Green/White",
  "Green",
  "Green/Black",
];

export const MAX_STRIPES = 4;

const SWATCH = {
  White: "#f4f4f4",
  Grey: "#8a8f98",
  Yellow: "#f2c500",
  Orange: "#f07f13",
  Green: "#2e9e44",
  Black: "#111",
};

// Kids without a saved belt are white with no stripes
export function readBelt(data) {
  const belt = KIDS_BELTS.includes(data?.belt) ? data.belt : KIDS_BELTS[0];
  const n = parseInt(data?.stripes, 10);
  const stripes = Number.isFinite(n) ? Math.min(Math.max(n, 0), MAX_STRIPES) : 0;
  return { belt, stripes };
}

// Single number for sorting: belt first, then stripes
export function beltRank(data) {
  const { belt, stripes } = readBelt(data);
  return KIDS_BELTS.indexOf(belt) * (MAX_STRIPES + 1) + stripes;
}

// The belt colour IS the dropdown: click the colour and the list opens. A
// native select is laid invisibly over the coloured block, the same size as the stripe bar under it, so the two line
// up. The name still shows in the list and on hover.
function BeltSelect({ belt, onChange, disabled }) {
  const [main, bar] = belt.split("/");
  return (
    <span
      className="bp-belt"
      style={{ background: SWATCH[main] }}
      title={belt}
    >
      {bar && <span className="bp-belt-band" style={{ background: SWATCH[bar] }} />}
      <select
        className="bp-belt-select"
        value={belt}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Belt"
      >
        {KIDS_BELTS.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
    </span>
  );
}

// The black rank bar at the end of a belt, with one white tape mark per
// stripe. Clicking a slot sets the count to it; clicking the last filled
// slot takes that stripe off again.
function StripeBar({ stripes, onChange, disabled }) {
  return (
    <span
      className="bp-bar"
      role="group"
      aria-label={`${stripes} ${stripes === 1 ? "stripe" : "stripes"}`}
      title={`${stripes} ${stripes === 1 ? "stripe" : "stripes"}`}
    >
      {Array.from({ length: MAX_STRIPES }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            className={`bp-tape${n <= stripes ? " is-on" : ""}`}
            onClick={() => onChange(n === stripes ? n - 1 : n)}
            disabled={disabled}
            aria-label={`Set ${n} ${n === 1 ? "stripe" : "stripes"}`}
          />
        );
      })}
    </span>
  );
}

export default function BeltPicker({ data, onChange, disabled }) {
  const { belt, stripes } = readBelt(data);
  const beltIndex = KIDS_BELTS.indexOf(belt);

  const setBelt = (b) => onChange({ belt: b, stripes });
  const setStripes = (s) => onChange({ belt, stripes: s });

  return (
    <div className="bp-picker">
      <div className="bp-group">
        <button
          type="button"
          className="bp-step"
          onClick={() => setBelt(KIDS_BELTS[beltIndex - 1])}
          disabled={disabled || beltIndex === 0}
          aria-label="Previous belt"
        >
          −
        </button>
        <BeltSelect belt={belt} onChange={setBelt} disabled={disabled} />
        <button
          type="button"
          className="bp-step"
          onClick={() => setBelt(KIDS_BELTS[beltIndex + 1])}
          disabled={disabled || beltIndex === KIDS_BELTS.length - 1}
          aria-label="Next belt"
        >
          +
        </button>
      </div>

      <div className="bp-group">
        <button
          type="button"
          className="bp-step"
          onClick={() => setStripes(stripes - 1)}
          disabled={disabled || stripes === 0}
          aria-label="Remove stripe"
        >
          −
        </button>
        <StripeBar stripes={stripes} onChange={setStripes} disabled={disabled} />
        <button
          type="button"
          className="bp-step"
          onClick={() => setStripes(stripes + 1)}
          disabled={disabled || stripes === MAX_STRIPES}
          aria-label="Add stripe"
        >
          +
        </button>
      </div>
    </div>
  );
}
