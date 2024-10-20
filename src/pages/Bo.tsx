import React, { useEffect, useRef } from 'react';
import { StarField } from 'retro-react';

const Params = {
  nOsc: 7,
  nOsc_hold: 5,
  nBo: 7,
  tone: ['B', 'A', 'G', 'F', 'E', 'D', 'C'],
  Amp_0: [1, 1, 1, 1, 0.6, 0.3, 0.3],
  duration: [1, 1, 1, 1, 1, 0.2, 0.2],
};

const Freq = [
  [768, 766, 384, 386, 128, 1536, 3072], // B
  [720, 722, 360, 362, 120, 1440, 2880], // A
  [672, 674, 336, 334, 112, 1344, 2688], // G
  [594, 596, 298, 296, 99, 1188, 2376], // F
  [528, 530, 264, 262, 88, 1056, 2112], // E
  [480, 482, 240, 238, 80, 960, 1920], // D
  [432, 434, 216, 214, 72, 864, 1728], // C
  [432, 434, 216, 214, 72, 864, 1728], // test
];

const BoComponent: React.FC = () => {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const context = new (window.AudioContext || window.AudioContext)();
    const primaryGainControl = context.createGain();
    primaryGainControl.gain.setValueAtTime(0.4, 0);
    primaryGainControl.connect(context.destination);

    return () => {
      context.close();
    };
  }, []);

  const handleClickAnimation = (toneIndex: number) => {
    // Handle click animation logic for the button
    const span = document.createElement('div');
    span.className = `bg-contain absolute w-1/2 h-1/2 z-0 top-1/2 left-1/2 transform translate-x-[-50%] translate-y-[-50%] bg-radial-${toneIndex} animate-clickMove`
    pageRef.current?.append(span);
    setTimeout(() => {
      span.remove();
    }, 10000);  // Match the duration of the animation
  }

  return (
    <div className="w-screen h-screen">
    <StarField></StarField>

    </div>

    // <div className="flex flex-col p-4 min-h-screen max-h-screen w-full items-center md:justify-center overflow-hidden" ref={pageRef}>
    //   <StarField>
    //   <h1 className="self-start  text-center text-4xl font-bold mb-4">Bo Simulator</h1>
    //   <div className="flex w-full h-[400px] justify-center items-end flex-wrap md:h-4/5 ">
        
    //       {/* {Array.from({ length: Params.nBo }).map((_, index) => (
    //         <button
    //           key={index}
    //           id={`bo${index}`}
    //           className={`flex z-10 w-[1/4] h-[1/2] bg-transparent hover:brightness-110 focus:outline-none active:blur-md]`}
    //           onClick={() => handleClickAnimation(index)}
    //         >
    //           <img src='/src/assets/bo-original.svg' className={`object-contain ${index === 0
    //             ? 'w-[40px] md:w-[120px]'
    //             : index === 1
    //               ? 'w-[50px]md:w-[130px]'
    //               : index === 2
    //                 ? 'w-[60px] md:w-[140px]'
    //                 : index === 3
    //                   ? 'w-[70px] md:w-[160px]'
    //                   : index === 4
    //                     ? 'w-[80px] md:w-[180px]'
    //                     : index === 5
    //                       ? 'w-[90px] md:w-[200px]'
    //                       : 'w-[100px] md:w-[250px]'
    //             }`} alt="bo" />
    //         </button>
    //       ))} */}
    //   </div>
    //   </StarField>
    // </div>
  );
};

export default BoComponent;
