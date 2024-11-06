import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "./pages/Home";
import Navbar from "./components/nav"; 

function App() {
  return (
    <>
    
      <Navbar />
      <div className="min-h-screen m-w-screen relative top-[80px] md:top-0 md:left-[80px]">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </>
  )
}

export default App;