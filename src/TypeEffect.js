import React, { useState, useEffect } from 'react';
import './Stylesheets/TypeEffect.css';

export default function TypeEffect() {
    const texts = ["Inclusive Environment", "Beginners Welcome", "Ossssssssss"];
    const [count, setCount] = useState(0);  // Tracks which word is currently being typed
    const [index, setIndex] = useState(0);  // Tracks letter position
    const [letter, setLetter] = useState('');  // Displays the currently typed text
    const [isDeleting, setIsDeleting] = useState(false);

    const typingSpeed = 100;  // Speed of typing (milliseconds)
    const deleteSpeed = 50;   // Speed of deleting
    const pauseTime = 1500;   // Pause before deleting and moving to next word

    useEffect(() => {
        const currentText = texts[count]; // Get the current word
        let timer;

        if (isDeleting) {
            if (index > 0) {
                timer = setTimeout(() => {
                    setLetter(currentText.slice(0, index - 1));
                    setIndex(index - 1);
                }, deleteSpeed);
            } else {
                setIsDeleting(false);
                setCount((prev) => (prev + 1) % texts.length); // Move to next word
            }
        } else {
            if (index < currentText.length) {
                timer = setTimeout(() => {
                    setLetter(currentText.slice(0, index + 1));
                    setIndex(index + 1);
                }, typingSpeed);
            } else {
                timer = setTimeout(() => {
                    setIsDeleting(true);
                }, pauseTime);
            }
        }

        return () => clearTimeout(timer);
    }, [index, isDeleting, count]);

    return <div className="TypeEffect"><span className="cursor">|</span>{letter}<span className="cursor">|</span></div>;
}
