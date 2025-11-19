import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import AWavesBackground from "../../components/AWavesBackground";

gsap.registerPlugin(useGSAP);

function Home() {
  const ease_in_ref = useRef<HTMLDivElement>(null);

  const elt1 = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollOffset(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const floatingBubbles = [
    {
      position: "left-4 bottom-0",
      delay: 0,
      duration: 20,
      startY: 100,
      endY: -1000,
    },
    {
      position: "left-16 bottom-0",
      delay: 0.6,
      duration: 22,
      startY: 100,
      endY: -1000,
    },
    {
      position: "left-32 bottom-0",
      delay: 1.2,
      duration: 18,
      startY: 100,
      endY: -1000,
    },
    {
      position: "right-10 bottom-0",
      delay: 0.4,
      duration: 24,
      startY: 100,
      endY: -1000,
    },
    {
      position: "right-4 bottom-0",
      delay: 0.9,
      duration: 21,
      startY: 100,
      endY: -1000,
    },
    {
      position: "right-16 bottom-0",
      delay: 1.5,
      duration: 25,
      startY: 100,
      endY: -1000,
    },
  ];

  useGSAP(() => {
    gsap.fromTo(
      ease_in_ref.current,
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="relative w-full h-screen overflow-visible"
        style={{
          backgroundImage: "url(/susnet.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
          <div className="w-[90%] h-[80%] max-w-4xl rounded-[100px] bg-[radial-gradient(circle_at_30%_30%,rgba(134,192,255,0.85),rgba(88,149,255,0.65),rgba(46,82,255,0.25))] shadow-[0_40px_120px_rgba(50,70,150,0.55)] blur-xl"></div>
        </div>
        <AWavesBackground scrollOffset={scrollOffset} />
        <div className="pointer-events-none absolute inset-0 z-0">
          {floatingBubbles.map((bubble, index) => (
            <div
              key={index}
              ref={(el) => (bubbleRefs.current[index] = el)}
              className={`absolute ${bubble.position} w-15 h-15 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.5)_20%,rgba(22,163,74,0.35)_50%,rgba(5,150,105,0.2)_75%,rgba(0,0,0,0)_100%)] shadow-[0_0_30px_rgba(34,197,94,0.4),0_0_60px_rgba(22,163,74,0.25),inset_0_0_15px_rgba(34,197,94,0.2)] flex items-center justify-center text-center font-handjet text-xs text-green-300 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]`}
            >
              hi
            </div>
          ))}
        </div>
        <div className="relative z-10 flex flex-col w-full h-full justify-center items-center pt-8 gap-9">
          <div
            ref={ease_in_ref}
            className="relative z-10 p-11 font-handjet font-bold animate-pulse text-xl text-black"
          >
            {" "}
            Welcome to Fiona's Homepage
          </div>
        </div>
      </div>
      <div className="bg-[#050505] py-24 px-6 md:px-12 space-y-16">
        <div className="max-w-5xl mx-auto space-y-8 text-gray-300">
          <h2 className="text-2xl font-semibold text-white">
            Placeholder Section
          </h2>
          <p className="text-base text-gray-400">
            这里是用于测试滚动效果的占位内容。滚动页面时可以观察顶部条纹逐渐向上收起的动画。
          </p>
        </div>
        <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
          {["Snapshot A", "Snapshot B", "Snapshot C"].map((title) => (
            <div
              key={title}
              className="h-48 rounded-3xl border border-white/10 bg-linear-to-br from-[#111] via-[#080808] to-[#050505] shadow-[0_25px_60px_rgba(0,0,0,0.45)] flex flex-col items-start justify-between p-6"
            >
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                placeholder
              </p>
              <div>
                <p className="text-xl font-semibold text-white">{title}</p>
                <p className="text-sm text-gray-500 mt-2">
                  未来内容占位，用于延长页面高度。
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="max-w-4xl mx-auto h-64 rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(5,5,5,0.9))] flex items-center justify-center text-gray-400 text-lg tracking-wide">
          更多内容即将到来...
        </div>
      </div>
    </div>
  );
}
export default Home;
