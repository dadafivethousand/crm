import logo from './Images/logos.jpg'
import './Stylesheets/Schedule.css'
export default function Schedule() {



    return (
        <div className="schedule-container">
          
            <h1>Wednesday</h1>

            <div className='weekday morning'>  
            <h4>7:30AM - BJJ NOGI</h4>
            </div>

            <hr />

            <div className='weekday lunch'>  
            <h4>12:00PM - BJJ NOGI</h4>
            </div>


            <hr />
            <div className='weekday evening'>  
            <h4>5:15PM - MMA</h4>
            <h4>6:15PM - WRESTLING</h4>
            <h4>7:15AM - BJJ NOGI</h4>
            </div>




        <img src={logo}/>
        </div>

    )
}