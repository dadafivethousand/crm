import React, { useState, useEffect } from 'react';
import './Stylesheets/KidsForm.css'; // Separate CSS file for this component

export default function KidsForm({ kidsFormData, setKidsFormData }) {
 
  const handleKidInputChange = (index, field, value) => {
    const updatedKids = [...kidsFormData];
    updatedKids[index][field] = value;
    setKidsFormData( updatedKids );
    console.log(kidsFormData)
  };
  const addKid = () => {
    setKidsFormData(
      [...kidsFormData, { firstName: '', lastName: '' }]
    );
  };


  const removeKid = (index) => {
    const updatedKids = kidsFormData.filter((_, i) => i !== index);
    setKidsFormData( updatedKids );
  };

  return ( 
      <div className="kids-form-container">
        <h3>Kid's Info</h3>
  
        {kidsFormData.map((kid, index) => (
            <div key={index} className="kids-form">
              <div className='input-container'>
                <input
                  type="text"
                  className="kids-form-input"
                  placeholder="Child's First Name"
                  value={kid.firstName}
                  onChange={(e) => handleKidInputChange(index, 'firstName', e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="kids-form-input"
                  placeholder="Child's Last Name"
                  value={kid.lastName}
                  onChange={(e) => handleKidInputChange(index, 'lastName', e.target.value)}
                  required
                />
         
              </div>
              <button
                type="button"
                id="kids-form-remove-button"
                onClick={() => removeKid(index)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="kids-form-buttons">
            <button type="button" id="kids-form-add-button" onClick={addKid}>
             + Add Child
            </button>
   
          </div>
 
      </div>
  );
}