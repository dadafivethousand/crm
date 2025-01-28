import React, { useEffect, useRef } from "react";
import Schedule from "./Schedule";
import "./Stylesheets/MatrixSchedule.css";

export default function MatrixSchedule({ day }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = Math.floor(canvas.width / 20); // Number of text columns
    const drops = Array(columns).fill(1); // Initial Y position for each column

    const matrixChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()-=+";

    function drawMatrix() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Fading effect for smooth trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00FF00"; // Matrix Green
      ctx.font = "18px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0; // Restart randomly
        }

        drops[i]++;
      }
    }

    const interval = setInterval(drawMatrix, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="matrix-container">
      {/* The Falling Matrix Code Effect */}
      <canvas ref={canvasRef} className="matrix-canvas"></canvas>

      {/* Overlaying the Schedule in Hacker Style */}
      <div className="matrix-schedule">
         <Schedule day={day} />
      </div>
    </div>
  );
}
