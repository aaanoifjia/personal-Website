import { useEffect, useRef } from "react";

type Cursor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type Point = {
  x: number;
  y: number;
  cursor: Cursor;
};

type State = {
  bounding: DOMRect | null;
  lines: Point[][];
  paths: SVGPathElement[];
  mouse: {
    x: number;
    y: number;
    lx: number;
    ly: number;
    sx: number;
    sy: number;
    v: number;
    vs: number;
    a: number;
  };
};

const AWavesBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();
  const stateRef = useRef<State>({
    bounding: null,
    lines: [],
    paths: [],
    mouse: {
      x: 0,
      y: 0,
      lx: 0,
      ly: 0,
      sx: 0,
      sy: 0,
      v: 0,
      vs: 0,
      a: 0,
    },
  });

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    const state = stateRef.current;

    const setSize = () => {
      state.bounding = container.getBoundingClientRect();
      if (!state.bounding) return;
      svg.style.width = `${state.bounding.width}px`;
      svg.style.height = `${state.bounding.height}px`;
    };

    const setLines = () => {
      const bounding = state.bounding;
      if (!bounding) return;
      const { width, height } = bounding;
      state.lines = [];
      state.paths.forEach((path) => path.remove());
      state.paths = [];

      const xGap = 2.5;
      const yGap = 50;
      const oWidth = width + 200;
      const oHeight = height + 30;
      const totalRows = Math.ceil(oHeight / yGap);
      const totalCols = Math.ceil(oWidth / xGap);
      const xStart = (width - xGap * totalCols) / 2;
      const yStart = (height - yGap * totalRows) / 2;

      for (let row = 0; row <= totalRows; row++) {
        const points: Point[] = [];
        for (let col = 0; col <= totalCols; col++) {
          points.push({
            x: xStart + xGap * col,
            y: yStart + yGap * row,
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          });
        }
        state.lines.push(points);
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "rgba(241, 244, 203, 1)");
        path.setAttribute("stroke-width", "50");
        svg.appendChild(path);
        state.paths.push(path);
      }
    };

    const updateMousePosition = (pageX: number, pageY: number) => {
      const bounding = state.bounding;
      if (!bounding) return;
      state.mouse.x = pageX - bounding.left;
      state.mouse.y = pageY - bounding.top + window.scrollY;
    };

    const movePoints = () => {
      const { lines, mouse } = state;
      lines.forEach((points) => {
        points.forEach((point) => {
          const dx = point.x - mouse.sx;
          const dy = point.y - mouse.sy;
          const d = Math.hypot(dx, dy);
          const l = Math.max(175, mouse.vs);
          if (d < l) {
            const f = 1 - d / l;
            point.cursor.vx += Math.cos(mouse.a) * f * mouse.vs * 0.08;
            point.cursor.vy += Math.sin(mouse.a) * f * mouse.vs * 0.08;
          }

          point.cursor.vx += (0 - point.cursor.x) * 0.005;
          point.cursor.vy += (0 - point.cursor.y) * 0.005;

          point.cursor.vx *= 0.925;
          point.cursor.vy *= 0.925;

          point.cursor.x += point.cursor.vx * 2;
          point.cursor.y += point.cursor.vy * 2;

          point.cursor.x = Math.min(100, Math.max(-100, point.cursor.x));
          point.cursor.y = Math.min(100, Math.max(-100, point.cursor.y));
        });
      });
    };

    const moved = (point: Point, withCursorForce = true) => {
      const coords = {
        x: point.x + (withCursorForce ? point.cursor.x : 0),
        y: point.y + (withCursorForce ? point.cursor.y : 0),
      };
      coords.x = Math.round(coords.x * 10) / 10;
      coords.y = Math.round(coords.y * 10) / 10;
      return coords;
    };

    const drawLines = () => {
      state.lines.forEach((points, index) => {
        if (!points.length) return;
        const first = moved(points[0], false);
        let d = `M ${first.x} ${first.y}`;
        points.forEach((point, pIndex) => {
          const isLast = pIndex === points.length - 1;
          const coord = moved(point, !isLast);
          d += `L ${coord.x} ${coord.y}`;
        });
        state.paths[index]?.setAttribute("d", d);
      });
    };

    const tick = () => {
      const mouse = state.mouse;
      mouse.sx += (mouse.x - mouse.sx) * 0.1;
      mouse.sy += (mouse.y - mouse.sy) * 0.1;

      const dx = mouse.x - mouse.lx;
      const dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * 0.1;
      mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.a = Math.atan2(dy, dx);

      movePoints();
      drawLines();
      animationRef.current = requestAnimationFrame(tick);
    };

    setSize();
    setLines();
    animationRef.current = requestAnimationFrame(tick);

    const handleResize = () => {
      setSize();
      setLines();
    };
    const handleMouse = (event: MouseEvent) => {
      updateMousePosition(event.pageX, event.pageY);
    };
    const handleTouch = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) {
        updateMousePosition(touch.clientX, touch.clientY + window.scrollY);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("touchmove", handleTouch, { passive: false });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("touchmove", handleTouch);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      state.paths.forEach((path) => path.remove());
      state.paths = [];
      state.lines = [];
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0"
    >
      <svg
        ref={svgRef}
        className="w-full h-full opacity-80"
        style={{ filter: "blur(1.5px)" }}
      />
    </div>
  );
};

export default AWavesBackground;
