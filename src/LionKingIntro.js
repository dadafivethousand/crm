import React, { useState, useEffect } from "react";
import './Stylesheets/LionKingIntro.css'
import Schedule from "./Schedule";
export default function LionKingIntro() {
  const [brightness, setBrightness] = useState(0);
  const [sunPosition, setSunPosition] = useState(100); // Sun starts below the horizon

  useEffect(() => {
    let interval = setInterval(() => {
      setBrightness((prev) => Math.min(prev + 2, 100)); // Brighten the background
      setSunPosition((prev) => Math.max(prev - 2, -50)); // Move the sun up
    }, 100);

    return () => clearInterval(interval);
  }, []);
  const day = 'Tuesday'

  return (
    <div
      className="scene"
      style={{
        background: `rgb(${brightness}, ${brightness * 0.7}, ${brightness * 0.3})`,
        transition: "background 3s ease",
      }}
    >

        <Schedule day={day} />
      {/* Sun Rising */}
      <div
        className="sun"
        style={{
          transform: `translateY(${sunPosition}px)`, // Moves the sun dynamically
        }}
      ></div>

      {/* Black Horizon */}
      <div className="horizon"></div>
    </div>
  );
}
