import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";

function Butterfly(prop: { className: string; button?: JSX.Element }) {
  const butterflies = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      butterflies.current,
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: 1,
        ease: "elastic",
      }
    );
  }, []);
  return (
    <div className={`group relative ${prop.className}`}>
      <img
        className="absolute rotate-40 group-hover:rotate-0 transition ease-in-out"
        src="/butterfly-wing.png"
      ></img>
      <img
        className="absolute rotate-[-40deg] group-hover:rotate-0 scale-x-[-1] transition ease-in-out"
        src="/butterfly-wing.png"
      ></img>
      <div className="hidden group-hover:flex absolute w-full h-full items-center justify-center">
        <span className="w-2/3 h-2/3 absolute animate-spin-slow-inverse bg-gradient-radial-left from-transparent via-yellow-300 to-transparent rounded-full blur-md"></span>
        <span className="w-full h-4/5 absolute animate-spin-fast-inverse bg-gradient-radial-left from-transparent via-white to-transparent rounded-full blur-md"></span>
        <span className="w-2/3 h-2/3 absolute animate-spin-mid bg-gradient-radial-top from-transparent via-transparent-pink to-transparent rounded-full blur-md"></span>
        <span className="w-2/3 h-2/3 absolute animate-spin-fast bg-gradient-radial-left from-transparent via-transparent-blue to-transparent rounded-full blur-md"></span>
        <div className="w-full h-full absolute flex items-center justify-center">
          {prop.button}
        </div>
      </div>
    </div>
  );
}
export default Butterfly;

// TODO tailwind js, hover on two elements: https://github.com/ben-rogerson/twin.macro
