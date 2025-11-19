import { Route, Routes } from "react-router-dom";
import Navbar from "./components/nav";
import Home from "./pages/home/Home";
import Bed from "./pages/bed/bed";

function App() {
  return (
    <>
      <div className="flex min-h-screen w-screen min-w-screen">
        <Navbar />
        <div className=" min-h-screen pl-0 pt-[80px] md:pl-[80px] w-full top-[80px] md:pt-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bed" element={<Bed />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
