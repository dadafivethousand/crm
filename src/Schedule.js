 import logo from "./Images/logos.jpg"; // Adjust path if necessary
import './Stylesheets/Schedule.css'
import { useState, useEffect } from "react";
import TypeEffect from "./TypeEffect";
function Schedule({ day }) {

  const text = ["Pull Up", "Ossssssss"];
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [letter, setLetter] = useState('');
  const [isPausing, setIsPausing] = useState(false);
  const [currentText, setCurrentText] = useState(['Pull Up']);

  useEffect(() => {
    if (isPausing) {
        const pauseTimer = setTimeout(() => {
            setIsPausing(false);
            setIndex(index + 1);
        }, 1000); // 1-2 second pause
        return () => clearTimeout(pauseTimer);
    }

    const type = () => {
        if (count >= currentText.length) {
            setCount(0);
            return;
        }

        
            
        if (index <= currentText.length) {
            console.log(currentText)
            // Typing phase
            setLetter(currentText.slice(0, index));
            setIndex(index + 1);
        } else if (index > currentText.length && index <= currentText.length * 2) {
            // Deleting phase
            setLetter(currentText.slice(0, currentText.length * 2 - index));
            setIndex(index + 1);
        }

        if (index === currentText.length) {
            // Start pause after typing phase
            setIsPausing(true);
        } else if (index === currentText.length * 2) {
            // Reset for the next word
            setCount((prevCount) => (prevCount + 1) % currentText.length);
            setIndex(0);
        }
    };

    if (!isPausing) {
        const timerId = setTimeout(type, 120);
        return () => clearTimeout(timerId);
    }
}, [index, count, isPausing]);



  const schedule = {
    Monday: [
      { name: "BJJ - NoGi", start: 7.5, end: 8.5 },
      { name: "BJJ - NoGi", start: 12, end: 13 },
      { name: "MMA", start: 17.25, end: 18.25 },
      { name: "Wrestling", start: 18.25, end: 19.25 },
      { name: "BJJ - NoGi", start: 19.25, end: 20.25 }
    ],
    Tuesday: [
      { name: "BJJ - Gi", start: 7.5, end: 8.5 },
      { name: "BJJ - Gi", start: 12, end: 13 },
          { name: "Kids", start: 17.25, end: 18.25},
      { name: "Muay Thai", start: 18.25, end: 19.25 },
      { name: "BJJ - Gi", start: 19.25, end: 20.25 }
    ],
    Wednesday: [
      { name: "BJJ - NoGi", start: 7.5, end: 8.5 },
      { name: "BJJ - NoGi", start: 12, end: 13 },
      { name: "MMA", start: 17.25, end: 18.25 },
      { name: "Wrestling", start: 18.25, end: 19.25 },
      { name: "BJJ - NoGi", start: 19.25, end: 20.25 }
    ],
    Thursday: [
      { name: "BJJ - Gi", start: 7.5, end: 8.5 },
      { name: "BJJ - Gi", start: 12, end: 13 },
          { name: "Kids", start: 17.25, end: 18.25},
      { name: "Muay Thai", start: 18.25, end: 19.25},
      { name: "BJJ - Gi", start: 19.25, end: 20.25 }
    ],
    Friday: [
      { name: "BJJ - NoGi", start: 7.5, end: 8.5 },
      { name: "BJJ - NoGi", start: 12, end: 13 },
          { name: "MMA", start: 17.25, end: 18.25 },
      { name: "Wrestling", start: 18.25, end: 19.25 },
      { name: "BJJ - NoGi", start: 19.25, end: 20.25 }
    ],
    Saturday: [ 
      { name: "MMA", start: 11, end: 12},
      { name: "BJJ - NoGi", start: 12, end: 13},
       { name: "Kids", start: 14, end: 15},
    ]
    ,
    Sunday: [
      { name: "Kids", start: 11, end: 12},
      { name: "Open Mat", start: 12, end: 13},
    ]
  };
  const daySchedule = schedule[day] || [];

  return (
    <div className="schedule-container">

  


      <h1>{day}</h1>

      {daySchedule.length > 0 ? (
        <>
          {daySchedule.some((session) => session.start < 9) && (
            <>
              <div className="weekday morning">
                {daySchedule
                  .filter((session) => session.start < 9)
                  .map((session, index) => (
                    <h4 key={index}>
                      {formatTime(session.start)} - {session.name}
                    </h4>
                  ))}
              </div>
        
            </>
          )}

          {daySchedule.some((session) => session.start >= 12 && session.start < 14) && (
            <>
              <div className="weekday lunch">
                {daySchedule
                  .filter((session) => session.start >= 12 && session.start < 14)
                  .map((session, index) => (
                    <h4 key={index}>
                      {formatTime(session.start)} - {session.name}
                    </h4>
                  ))}
              </div>
 
            </>
          )}

          {daySchedule.some((session) => session.start >= 17) && (
            <div className="weekday evening">
              {daySchedule
                .filter((session) => session.start >= 17)
                .map((session, index) => (
                  <h4 key={index}>
                    {formatTime(session.start)} - {session.name}
                  </h4>
                ))}
            </div>
          )}
        </>
      ) : (
        <p>No classes scheduled for this day.</p>
      )}

     {/* <img src={logo} alt="Gym Logo" /> */}
    </div>
  );
}

// Helper function to convert time to readable format
function formatTime(decimalTime) {
  const hours = Math.floor(decimalTime);
  const minutes = (decimalTime % 1) * 60;
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")}${hours >= 12 ? "PM" : "AM"}`;
}
export default Schedule;