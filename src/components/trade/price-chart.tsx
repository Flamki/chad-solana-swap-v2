import { useMemo, useState, useRef, useEffect } from "react";

type Point = { time: number; value: number };

export function PriceChart({ data }: { data: Point[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 360 });
  const [hover, setHover] = useState<{ x: number; pt: Point } | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(300, r.width), h: Math.max(200, r.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padL = 8, padR = 56, padT = 12, padB = 28;

  const { path, area, min, max, xAt, yAt, ticksY, ticksX } = useMemo(() => {
    if (!data.length) return { path: "", area: "", min: 0, max: 0, xAt: () => 0, yAt: () => 0, ticksY: [] as number[], ticksX: [] as { x: number; label: string }[] };
    const innerW = size.w - padL - padR;
    const innerH = size.h - padT - padB;
    const xs = data.map((d) => d.time);
    const ys = data.map((d) => d.value);
    const tMin = xs[0], tMax = xs[xs.length - 1];
    const vMin = Math.min(...ys);
    const vMax = Math.max(...ys);
    const range = vMax - vMin || vMax * 0.001 || 1;
    const vLo = vMin - range * 0.08;
    const vHi = vMax + range * 0.08;
    const xAt = (t: number) => padL + ((t - tMin) / (tMax - tMin || 1)) * innerW;
    const yAt = (v: number) => padT + (1 - (v - vLo) / (vHi - vLo)) * innerH;
    const linePts = data.map((d) => `${xAt(d.time)},${yAt(d.value)}`).join(" L");
    const path = `M${linePts}`;
    const area = `${path} L${xAt(tMax)},${padT + innerH} L${xAt(tMin)},${padT + innerH} Z`;
    const ticksY = Array.from({ length: 5 }, (_, i) => vLo + ((vHi - vLo) * i) / 4);
    const ticksX = Array.from({ length: 6 }, (_, i) => {
      const t = tMin + ((tMax - tMin) * i) / 5;
      const d = new Date(t * 1000);
      const label = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
      return { x: xAt(t), label };
    });
    return { path, area, min: vMin, max: vMax, xAt, yAt, ticksY, ticksX };
  }, [data, size]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!data.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const innerW = size.w - padL - padR;
    const ratio = Math.max(0, Math.min(1, (x - padL) / innerW));
    const idx = Math.round(ratio * (data.length - 1));
    setHover({ x: xAt(data[idx].time), pt: data[idx] });
  };

  const fmt = (v: number) => v < 0.01 ? v.toExponential(2) : v < 1 ? v.toFixed(4) : v.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div ref={wrapRef} className="relative h-full w-full min-h-[300px] overflow-hidden" style={{ height: "100%" }}>
      <svg
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        className="block max-w-full"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.86 0.24 142)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="oklch(0.86 0.24 142)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* horizontal gridlines */}
        {ticksY.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={size.w - padR} y1={yAt(v)} y2={yAt(v)} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
            <text x={size.w - padR + 6} y={yAt(v) + 4} fontSize="10" fill="#7c8197" fontFamily="JetBrains Mono, monospace">
              {fmt(v)}
            </text>
          </g>
        ))}
        {/* x-axis labels */}
        {ticksX.map((t, i) => (
          <text key={i} x={t.x} y={size.h - 8} fontSize="10" fill="#7c8197" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {t.label}
          </text>
        ))}
        {/* area + line */}
        <path d={area} fill="url(#chartFill)" />
        <path d={path} fill="none" stroke="oklch(0.86 0.24 142)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* hover */}
        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={padT} y2={size.h - padB} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 3" />
            <circle cx={hover.x} cy={yAt(hover.pt.value)} r={4} fill="oklch(0.86 0.24 142)" stroke="#0b0a1a" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-border bg-background/90 px-2.5 py-1.5 text-xs font-mono backdrop-blur"
          style={{ left: Math.min(hover.x + 8, size.w - 120) }}
        >
          <div className="text-primary">${fmt(hover.pt.value)}</div>
          <div className="text-muted-foreground text-[10px]">{new Date(hover.pt.time * 1000).toLocaleTimeString()}</div>
        </div>
      )}
      <div className="pointer-events-none absolute top-2 left-3 text-[10px] font-mono text-muted-foreground">
        24h range · ${fmt(min)} – ${fmt(max)}
      </div>
    </div>
  );
}