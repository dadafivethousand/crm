import React from "react";
import "./Stylesheets/StarWarsIntro.css";
import { useState, useEffect } from "react";
import starwars from './Images/maple_jiu_jitsu_star_wars_style_final.png'

export default function StarWarsIntro() {

  const [showText, setShowText] = useState(false)
  const [shrinkLogo, setShrinkLogo] = useState(false)
  useEffect(() => {
    setShrinkLogo(true)    
    const firstEffect = setTimeout(() => {
      setShowText(true)

    }, 2000)
 
  }, [])

  return (

    <div className="star-wars-container">
      <img className={`log ${shrinkLogo? 'small': 'big'}`} src={starwars}/>
      <div className="fade"></div> {/* Fades out text at the top */}
      <div className={`${showText? 'crawl': 'none'}`}>
        <h1>Wednesday</h1>
        <p>7:30 am - BJJ NoGi</p>
        <p>12:00 pm - BJJ NoGi</p>
        <p>5:15 pm - MMA</p>
        <p>6:15 pm - Wrestling</p>
        <p>7:15 pm - BJJ NoGi</p>
      </div>
    </div>
  );
}
