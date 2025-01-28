import React from "react";
import Schedule from "./Schedule";
import "./Stylesheets/Pirates.css";

export default function PiratesSchedule({ day }) {
  return (
    <div className="pirates-container">
      {/* Old Treasure Map Background */}
      <div className="parchment">
        <h1 className="pirates-title">{day}</h1>
        <Schedule day={day} />
      </div>

      {/* Red X - Marks The Spot */}
      <div className="x-mark">X</div>
    </div>
  );
}
