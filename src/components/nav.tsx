import React from 'react';
import { StarField } from 'retro-react';
import { Link } from 'react-router-dom';


const Navbar: React.FC = () => {
    return (
        <nav className='fixed bg-black w-screen h-[80px] md:w-[80px] bg-radial-1 md:h-full'>
            <ul className="relative md:flex-col sm:flex-row items-center md:h-screen md:w-60 sm:w-full p-4 gap-4">
                <li className="hover:bg-gray-700 px-4 py-2 rounded">
                    <Link to="/">Home</Link>
                </li>
                <li className="hover:bg-gray-700 px-4 py-2 rounded">
                    <Link to="/Bo">Bo</Link>
                </li>
            </ul>

        </nav>
    );
};

export default Navbar;
