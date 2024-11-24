import { useState } from "react";
import { Link } from "react-router-dom";
import BO_URL from "../constants"

const li_style = "border-solid border-white border-[6px] w-[80px] h-[80px]"

function Navbar() {
  const [tab, setTab] = useState("")
  return (
    <nav className='fixed w-screen h-[80px] md:w-[80px] bg-black md:h-full'>
      <ul className="flex md:flex-col">
        <li className={`${li_style} ${window.location.pathname === "/" ? "border-dashed" : ""}`}>
          <Link to="/">
            <button
              className={`w-full h-full bg-[url('/nav/avatar.svg')] hover:bg-[url('/nav/avatar-lighten.svg')] active:bg-[url('/nav/avatar-shadow.svg')]`}>
            </button>
          </Link>
        </li>
        <li className={li_style}>
          <button
            // dynamic bg img loading fails, so use static img url 
            onClick={() => window.location.href = BO_URL}
            style={{ backgroundImage: `url('/nav/bo.svg')` }}
            className="w-full h-full bg-[#c97fb2] grayscale-[0.5] hover:grayscale-[0] active:bg-[#ecfb4e]">
          </button>
        </li>
        <li className={li_style}>
        <Link to="/bed">
          <button
            style={{
              backgroundImage: `url('/nav/bed.svg')`,
              backgroundSize: '20px 20px', // or 'contain' / 'auto'
              backgroundRepeat: 'no-repeat', // Prevents tiling
              backgroundPosition: 'center',
            }}
            className="w-full h-full bg-[#dadada] hover:bg-[#c3fffa] active:bg-[#ecfb4e]">
          </button>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar;
