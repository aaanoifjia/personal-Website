import { Carousel } from "retro-react";
import BedModelView from "./bed-model";

function BedSlide() {
  return (
    <div
      className={"w-full h-screen flex flex-col items-center justify-center "}
    >
      <div className="font-handjet"> Step 1: design. </div>
      <div className="w-screen min-h-[500px] max-h-[600px] p-10 max-w-[900px]">
        <div className="border-[4px] w-full h-full bg-gray-100 border-opacity-75 border-black rounded-lg shadow-lg">
          <BedModelView />
        </div>
      </div>
    </div>
  );
}
// function ProcedureSlide1() {
//   return <div className={'w-full h-screen flex flex-col items-center justify-center '}>
//     <div className="font-handjet"> Step 2: build. </div>
//     <div className='w-full max-w-[1000px] h-[800px] p-10 grid grid-cols-2 gap-0'>
//       {Array.from({ length: 6 }, (_, i) => (
//         <div className="relative w-full h-full" >
//           <img className="absolute object-cover w-full" alt={`${i}`} src={`/bed/procedure${i}.gif`} />
//           <img className="hover:opacity-0 absolute inset-0 object-cover w-full" alt={`${i}`} src={`/bed/procedure${i}.png`} />
//         </div>
//       ))}
//     </div>
//   </div>
// }

function Bed() {
  return (
    <Carousel
      children={[<BedSlide />]}
      interval={1000000}
      pattern="solid"
      sx={{
        backgroundColor: "#f3f4f6",
      }}
    ></Carousel>
    // <BedSlide />
  );
}
export default Bed;
