import { BrowserRouter, Route, Routes } from "react-router-dom"
import Navbar from "./components/nav"; 
import Home from "./pages/Home";
import Bed from "./pages/bed"

function App() {
  return (
    <>
    
      <Navbar />
      <div className="min-h-screen m-w-screen relative top-[80px] md:top-0 md:left-[80px]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bed" element={<Bed />} />
        </Routes>
      </div>
    </>
  )
}

export default App;