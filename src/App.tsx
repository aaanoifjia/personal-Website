import Navbar from './components/nav';
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from 'react-router-dom';
import BoComponent from './pages/Bo';
import Home from './pages/Home';

function App() {


  return (
    <Router >
      <div className="flex flex-col md:flex-row right-0 bottom-0 min-h-full bg-slate-200">
        <Navbar />
        <div className="relative md:left-[80px] top-[80px] right-0 bottom-0 min-h-full justify-center p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Bo" element={<BoComponent />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
