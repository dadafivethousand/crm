import React from "react";
import Schedule from "./Stylesheets/Schedule";
import "./PiratesSchedule.css";

export default function PiratesSchedule({ day }) {
  return (
    <div className="pirates-container">
      {/* Background: Old Treasure Map */}
      <div className="parchment">
 
        <Schedule day={day} />
      </div>

      {/* Red X - Marks The Spot */}
      <div className="x-mark">X</div>
    </div>
  );
}
