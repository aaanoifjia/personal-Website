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
  rowFactor: number;
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

type AWavesBackgroundProps = {
  scrollOffset?: number;
};

const AWavesBackground = ({ scrollOffset = 0 }: AWavesBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const defsRef = useRef<SVGDefsElement | null>(null);
  const gradientRef = useRef<SVGRadialGradientElement | null>(null);
  const animationRef = useRef<number>();
  const scrollRef = useRef(0);
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

    const ensureSvgStructure = () => {
      if (!svg) return;
      if (!defsRef.current) {
        const defs = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "defs"
        );

        const gradient = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "radialGradient"
        );
        gradient.setAttribute("id", "waveGradient");
        gradient.setAttribute("gradientUnits", "userSpaceOnUse");
        gradient.setAttribute("cx", "50%");
        gradient.setAttribute("cy", "50%");
        gradient.setAttribute("r", "50%");

        const stopCenter = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "stop"
        );
        stopCenter.setAttribute("offset", "0%");
        stopCenter.setAttribute("stop-color", "rgba(255, 255, 255,0.2)");

        const stopOuter = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "stop"
        );
        stopOuter.setAttribute("offset", "70%");
        stopOuter.setAttribute("stop-color", "rgb(243, 217, 186)");

        const stopOutermost = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "stop"
        );
        stopOutermost.setAttribute("offset", "100%");
        stopOutermost.setAttribute("stop-color", "rgba(0, 0, 0, 0)");

        gradient.appendChild(stopCenter);
        gradient.appendChild(stopOuter);
        gradient.appendChild(stopOutermost);
        defs.appendChild(gradient);
        gradientRef.current = gradient;

        const filter = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "filter"
        );
        filter.setAttribute("id", "waveShadow");
        filter.setAttribute("x", "-20%");
        filter.setAttribute("y", "-20%");
        filter.setAttribute("width", "140%");
        filter.setAttribute("height", "160%");

        const dropShadow = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "feDropShadow"
        );
        dropShadow.setAttribute("dx", "0");
        dropShadow.setAttribute("dy", "-1.3");
        dropShadow.setAttribute("stdDeviation", "1.6");
        dropShadow.setAttribute("flood-color", "#040404");
        dropShadow.setAttribute("flood-opacity", "0.55");

        filter.appendChild(dropShadow);
        defs.appendChild(filter);
        svg.appendChild(defs);
        defsRef.current = defs;
      }

      if (!groupRef.current) {
        const group = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        group.setAttribute("filter", "url(#waveShadow)");
        group.style.mixBlendMode = "screen";
        svg.appendChild(group);
        groupRef.current = group;
      }
    };

    const state = stateRef.current;

    const setSize = () => {
      state.bounding = container.getBoundingClientRect();
      if (!state.bounding) return;
      svg.style.width = `${state.bounding.width}px`;
      // SVG 高度会在 setLines 中根据实际需要设置
      // 先设置一个初始高度，避免首次渲染时没有高度
      if (!svg.style.height) {
        const maxCursorOffset = 100;
        const strokeWidth = 50;
        const extraHeight = maxCursorOffset + strokeWidth / 2;
        svg.style.height = `${state.bounding.height + extraHeight}px`;
      }
    };

    const setLines = () => {
      const bounding = state.bounding;
      if (!bounding) return;
      const { width, height } = bounding;
      state.lines = [];
      state.paths.forEach((path) => path.remove());
      state.paths = [];

      const xGap = 30;
      const yGap = 20;
      const strokeWidth = 50;
      const maxCursorOffset = 100; // 线条向下弯曲的最大偏移
      // 增加高度以容纳线条向下弯曲，确保不会被截断
      const extraHeight = maxCursorOffset + strokeWidth / 2;
      const oWidth = width + 200;
      // 线条数量基于屏幕高度计算，确保刚好覆盖屏幕
      const totalRows = Math.ceil(height / yGap);
      const totalCols = Math.ceil(oWidth / xGap);
      const xStart = (width - xGap * totalCols) / 2;
      const yStart = (height - yGap * totalRows) / 2;

      // SVG 高度增加以容纳弯曲，但线条只生成到屏幕高度
      svg.style.height = `${height + extraHeight}px`;

      // 径向渐变使用百分比，自动居中，无需更新位置

      const group = groupRef.current;
      if (!group) return;
      group.innerHTML = "";

      for (let row = 0; row <= totalRows; row++) {
        const y = yStart + yGap * row;
        // 确保线条不超过屏幕高度
        if (y > height) break;

        const rowFactor =
          totalRows === 0 ? 0 : Math.min(1, Math.max(0, row / totalRows));
        const points: Point[] = [];
        for (let col = 0; col <= totalCols; col++) {
          const x = xStart + xGap * col;
          // 确保线条不超过屏幕宽度
          if (x > width) break;
          points.push({
            x,
            y,
            rowFactor,
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          });
        }
        state.lines.push(points);
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "url(#waveGradient)");
        path.setAttribute("stroke-width", "50");
        path.setAttribute("stroke-linecap", "butt");
        path.setAttribute("stroke-linejoin", "miter");
        group.appendChild(path);
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

    ensureSvgStructure();
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
      if (groupRef.current) {
        groupRef.current.remove();
        groupRef.current = null;
      }
      if (defsRef.current) {
        defsRef.current.remove();
        defsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    scrollRef.current = scrollOffset;
  }, [scrollOffset]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        overflow: "visible",
      }}
    >
      <svg ref={svgRef} className="w-full" style={{ filter: "blur(1.5px)" }} />
    </div>
  );
};

export default AWavesBackground;
