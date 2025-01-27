import React from "react";
import "./Stylesheets/StarWarsIntro.css";

export default function StarWarsIntro() {
  return (
    
    <div className="star-wars-container">
      <div className="fade"></div> {/* Fades out text at the top */}
      <div className="crawl">
        <h1>Wednesday</h1>
        <p>7:30 - BJJ NoGi</p>
        <p>12:30 - BJJ NoGi</p>
        <p>5:15 - MMA</p>
        <p>6:15 - Wrestling</p>
        <p>7:15 - BJJ NoGi</p>
      </div>
    </div>
  );
}
