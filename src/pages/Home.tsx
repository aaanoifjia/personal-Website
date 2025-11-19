import { Link } from "react-router-dom";
import Butterfly from "../components/butterfly";
import BO_URL from "../constants";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

function Home() {
  const title = useRef<HTMLDivElement>(null);
  const butterlfies = useRef<HTMLDivElement>(null);

  const elt1 = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);

  const floatingBubbles = [
    {
      position: "left-4 bottom-0",
      delay: 0,
      duration: 12,
      startY: 100,
      endY: -1000,
    },
    {
      position: "left-16 bottom-0",
      delay: 0.6,
      duration: 13,
      startY: 100,
      endY: -1000,
    },
    {
      position: "left-32 bottom-0",
      delay: 1.2,
      duration: 11,
      startY: 100,
      endY: -1000,
    },
    {
      position: "right-10 bottom-0",
      delay: 0.4,
      duration: 14,
      startY: 100,
      endY: -1000,
    },
    {
      position: "right-4 bottom-0",
      delay: 0.9,
      duration: 12.5,
      startY: 100,
      endY: -1000,
    },
    {
      position: "right-16 bottom-0",
      delay: 1.5,
      duration: 15,
      startY: 100,
      endY: -1000,
    },
  ];

  useGSAP(() => {
    gsap.fromTo(
      title.current,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        ease: "power1.inOut",
      }
    );
    gsap.fromTo(
      butterlfies.current,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        ease: "power1.inOut",
        delay: 0.3,
        stagger: 0.1,
      }
    );

    const tl = gsap.timeline({ repeat: -1 });

    tl.fromTo(
      elt1.current,
      { y: 100, opacity: 1, x: 0 },
      {
        y: -600,
        opacity: 0,
        duration: 7,
        ease: "none",
        onRepeat: () => {
          gsap.set(elt1.current, { x: 0 });
        },
      }
    );

    gsap.to(elt1.current, {
      x: "+=40",
      duration: 3,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    bubbleRefs.current.forEach((bubble, index) => {
      if (!bubble) return;
      const config = floatingBubbles[index];

      // 初始状态：从页面底端之外开始，不可见
      gsap.set(bubble, {
        y: config.startY,
        opacity: 0,
      });

      const timeline = gsap.timeline({
        repeat: -1,
        delay: config.delay,
      });

      timeline.to(
        bubble,
        {
          opacity: 0.9,
          duration: 0.8,
          ease: "sine.out",
        },
        0
      );

      timeline.to(
        bubble,
        {
          y: config.endY,
          duration: config.duration,
          ease: "sine.inOut",
        },
        0
      );
    });
  }, []);

  const bo_button = (
    <button
      onClick={() => (window.location.href = BO_URL)}
      style={{ backgroundImage: `url('/nav/bo.svg')` }}
      className="w-1/2 h-1/2 absolute"
    ></button>
  );
  const bed_button = (
    <Link
      to="/bed"
      className="w-full h-full absolute flex items-center justify-center"
    >
      <button
        style={{
          backgroundImage: `url('/nav/bed.svg')`,
          backgroundSize: "contain", // or 'contain' / 'auto'
          backgroundRepeat: "no-repeat", // Prevents tiling
          backgroundPosition: "center",
        }}
        className="w-1/2 h-1/2"
      ></button>
    </Link>
  );

  const butterfly_style = "w-[100px] h-[100px] md:w-[200px] md:h-[200px]";

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
        <div className="w-[90%] h-[80%] max-w-4xl rounded-[100px] bg-[radial-gradient(circle_at_30%_30%,rgba(134,192,255,0.85),rgba(88,149,255,0.65),rgba(46,82,255,0.25))] shadow-[0_40px_120px_rgba(50,70,150,0.55)] blur-xl"></div>
      </div>
      <div className="pointer-events-none absolute inset-0 z-0">
        {floatingBubbles.map((bubble, index) => (
          <div
            key={index}
            ref={(el) => (bubbleRefs.current[index] = el)}
            className={`absolute ${bubble.position} w-15 h-15 rounded-full bg-[radial-gradient(circle,rgba(40,40,40,0.95)_30%,rgba(10,10,10,0.8)_65%,rgba(0,0,0,0)_100%)] shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center text-center font-handjet text-xs text-gray-200`}
          >
            hi
          </div>
        ))}
      </div>
      {/* <div
        ref={elt1}
        className="fixed bottom-12 right-12 w-12 h-12 rounded-full bg-[radial-gradient(circle,_rgba(40,40,40,0.95)_30%,_rgba(10,10,10,0.8)_65%,_rgba(0,0,0,0)_100%)] shadow-[0_0_30px_rgba(0,0,0,0.6)] flex items-center justify-center text-center font-handjet text-xs text-gray-200"
      >
        hi
      </div> */}
      <div className="relative z-10 flex flex-col w-full h-full justify-center items-center pt-8 gap-9">
        <div
          ref={title}
          className="relative z-10 p-11 font-handjet font-bold animate-pulse"
        >
          {" "}
          Welcome to Fiona's Homepage
        </div>
        <div
          ref={butterlfies}
          id="buttons"
          className="relative z-10 flex gap-6"
        >
          <Butterfly className={butterfly_style} button={bo_button} />
          <Butterfly className={butterfly_style} button={bed_button} />
          <Butterfly className={butterfly_style} />
        </div>
      </div>
    </div>
  );
}
export default Home;
