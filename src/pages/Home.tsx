import { Link } from 'react-router-dom';
import Butterfly from '../components/butterfly';
import BO_URL from "../constants"


function Home() {
  const bo_button = <button
    onClick={() => window.location.href = BO_URL}
    style={{ backgroundImage: `url('/nav/bo.svg')` }}
    className="w-1/2 h-1/2 absolute">
  </button>

  const bed_button = <Link to="/bed" className='w-full h-full absolute flex items-center justify-center'>
  <button
    style={{
      backgroundImage: `url('/nav/bed.svg')`,
      backgroundSize: 'contain', // or 'contain' / 'auto'
      backgroundRepeat: 'no-repeat', // Prevents tiling
      backgroundPosition: 'center',
    }}
    className="w-1/2 h-1/2">
  </button>
  </Link>

  const butterfly_style = 'w-[100px] h-[100px] md:w-[200px] md:h-[200px]'

  return (
    <div className="flex flex-col w-full h-full justify-center items-center pt-8">
      <div className="p-11 font-handjet font-bold animate-bounce"> Welcome to Jiaying Li's Home Page</div>
      <div className='flex gap-6'>
        <Butterfly className={butterfly_style} button={bo_button}/>
        <Butterfly className={butterfly_style} button={bed_button}/>
        <Butterfly className={butterfly_style} />
      </div>
    </div>
  )
}
export default Home;