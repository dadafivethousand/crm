import React from "react";
import "./WaiverNotice.css";
import logo from "../Images/your-logo.png"; // <-- Replace with your actual logo path
import qrCode from "../Images/maple_waiver_qr.png"; // <-- Replace with your QR code path

export default function WaiverNotice() {
  return (
    <div className="waiver-notice-container">
      <img src={logo} alt="Logo" className="waiver-logo" />
      <h2 className="waiver-message">
        All new students must fill out the waiver before participating in any of the classes.
      </h2>
      <img src={qrCode} alt="SmartWaiver QR Code" className="waiver-qr" />
      <p className="waiver-url">www.smartwaiver.com/v/maple</p>
    </div>
  );
}
