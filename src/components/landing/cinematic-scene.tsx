"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

import { BRAND } from "@/lib/brand";

const COINS = [
  {
    id: "front-left",
    asset: "coin-front",
    x: "9%",
    y: "72%",
    size: "clamp(130px, 20vw, 300px)",
    exitX: "-95vw",
    exitY: "23vh",
    tilt: "-20deg",
    spin: "-70deg",
    depth: 1.1,
    blur: "1.5px",
    z: 18,
  },
  {
    id: "upper-left",
    asset: "coin-front",
    x: "24%",
    y: "9%",
    size: "clamp(55px, 8vw, 120px)",
    exitX: "-65vw",
    exitY: "-35vh",
    tilt: "18deg",
    spin: "100deg",
    depth: 0.5,
    blur: "0px",
    z: 4,
  },
  {
    id: "left-edge",
    asset: "coin-edge",
    x: "29%",
    y: "57%",
    size: "clamp(42px, 5.5vw, 84px)",
    exitX: "-70vw",
    exitY: "-20vh",
    tilt: "-15deg",
    spin: "-110deg",
    depth: 0.7,
    blur: "0px",
    z: 5,
  },
  {
    id: "lower-left",
    asset: "coin-edge",
    x: "22%",
    y: "94%",
    size: "clamp(64px, 10vw, 155px)",
    exitX: "-85vw",
    exitY: "35vh",
    tilt: "-30deg",
    spin: "70deg",
    depth: 0.9,
    blur: "1px",
    z: 16,
  },
  {
    id: "upper-right",
    asset: "coin-front",
    x: "67%",
    y: "7%",
    size: "clamp(28px, 3.6vw, 56px)",
    exitX: "65vw",
    exitY: "-45vh",
    tilt: "20deg",
    spin: "120deg",
    depth: 0.3,
    blur: "0px",
    z: 2,
  },
  {
    id: "right-edge",
    asset: "coin-edge",
    x: "88%",
    y: "52%",
    size: "clamp(60px, 8.5vw, 130px)",
    exitX: "85vw",
    exitY: "-12vh",
    tilt: "12deg",
    spin: "110deg",
    depth: 0.7,
    blur: "0px",
    z: 15,
  },
  {
    id: "front-right",
    asset: "coin-front",
    x: "94%",
    y: "88%",
    size: "clamp(100px, 15vw, 230px)",
    exitX: "95vw",
    exitY: "35vh",
    tilt: "32deg",
    spin: "-80deg",
    depth: 1,
    blur: "1px",
    z: 19,
  },
];

function Coin({ coin, index }: { coin: (typeof COINS)[number]; index: number }) {
  const style = {
    left: coin.x,
    top: coin.y,
    width: coin.size,
    zIndex: coin.z,
    "--exit-x": coin.exitX,
    "--exit-y": coin.exitY,
    "--tilt": coin.tilt,
    "--spin": coin.spin,
    "--depth": coin.depth,
    "--blur": coin.blur,
    "--float-delay": `${index * -1.1}s`,
    "--float-duration": `${6 + index * 0.7}s`,
  } as CSSProperties;

  return (
    <div className="soll-coin" data-coin={coin.id} style={style}>
      <div className="soll-coin-drift">
        <Image
          src={`/assets/soll/${coin.asset}.png`}
          alt=""
          width={1024}
          height={1024}
          sizes="(max-width: 767px) 130px, 300px"
        />
      </div>
    </div>
  );
}

function ChartPanel() {
  return (
    <div className="soll-scene-chart soll-market-card">
      <div className="soll-panel-heading">
        <span>SOL / USDC</span>
        <span>MARKET PREVIEW</span>
      </div>
      <svg viewBox="0 0 300 140" fill="none" aria-hidden="true">
        <defs>
          <linearGradient
            id="soll-chart-glow"
            x1="0"
            y1="0"
            x2="0"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#55E9B8" stopOpacity=".22" />
            <stop offset="1" stopColor="#55E9B8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 60, 90, 120].map((y) => (
          <path key={y} d={`M0 ${y}H300`} stroke="#FFFFFF" strokeOpacity=".07" />
        ))}
        <path
          d="M8 114 30 100 48 110 65 85 83 91 100 74 118 84 137 61 153 72 174 48 190 57 211 34 229 41 248 20 265 27 290 9V140H8Z"
          fill="url(#soll-chart-glow)"
        />
        <path
          d="M8 114 30 100 48 110 65 85 83 91 100 74 118 84 137 61 153 72 174 48 190 57 211 34 229 41 248 20 265 27 290 9"
          stroke="#55E9B8"
          strokeWidth="2"
        />
        {[
          { x: 25, y: 96, h: 17 },
          { x: 58, y: 82, h: 23 },
          { x: 94, y: 70, h: 20 },
          { x: 132, y: 57, h: 23 },
          { x: 168, y: 43, h: 20 },
          { x: 205, y: 29, h: 19 },
          { x: 241, y: 16, h: 19 },
          { x: 279, y: 5, h: 17 },
        ].map((c) => (
          <g key={c.x}>
            <path d={`M${c.x + 3} ${c.y - 6}v${c.h + 12}`} stroke="#64F0BD" strokeWidth="1" />
            <rect x={c.x} y={c.y} width="6" height={c.h} rx="1" fill="#64F0BD" />
          </g>
        ))}
      </svg>
      <div className="soll-panel-footer">
        <span>LIVE QUOTES IN THE TERMINAL</span>
        <span>↗</span>
      </div>
    </div>
  );
}

export function CinematicScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const hero = scene?.closest<HTMLElement>(".soll-hero");
    if (!scene || !hero) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const bounds = hero.getBoundingClientRect();
      const progress = reducedMotion.matches
        ? 0
        : Math.max(0, Math.min(1, -bounds.top / (bounds.height * 0.82)));
      hero.style.setProperty("--soll-scroll", progress.toFixed(4));
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      scene.dataset.active = String(entry.isIntersecting);
    });

    observer.observe(hero);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    update();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      hero.style.removeProperty("--soll-scroll");
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      className="soll-scene"
      aria-label="Astronaut trading among floating coins"
      role="img"
    >
      <div className="soll-scene-halo" aria-hidden="true" />
      <div aria-hidden="true">
        <ChartPanel />
        <div className="soll-scene-watchlist soll-market-card">
          <div className="soll-panel-heading">
            <span>YOUR ORBIT</span>
            <span>···</span>
          </div>
          <div className="soll-watchlist-row">
            <span className="soll-token-dot">S</span>
            <div>
              <strong>Solana</strong>
              <span>SOL</span>
            </div>
            <span>↗</span>
          </div>
          <div className="soll-watchlist-row">
            <span className="soll-token-dot soll-token-dollar">$</span>
            <div>
              <strong>USD Coin</strong>
              <span>USDC</span>
            </div>
            <span>⇄</span>
          </div>
          <div className="soll-mini-bars">
            {[30, 45, 22, 60, 42, 70, 55, 82, 65, 95].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="soll-scene-route soll-market-card">
          <span className="soll-route-dot" />
          <div>
            <strong>One chain. Every move.</strong>
            <span>SOL ↔ USDC</span>
          </div>
        </div>
      </div>
      <div className="soll-astronaut">
        <div className="soll-astronaut-drift">
          <Image
            src={BRAND.hero}
            alt=""
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 767px) 115vw, (min-width: 1440px) 1080px, 80vw"
          />
        </div>
      </div>
      <div aria-hidden="true">
        {COINS.map((coin, index) => (
          <Coin key={coin.id} coin={coin} index={index} />
        ))}
      </div>
      <div className="soll-asteroid soll-asteroid-left" aria-hidden="true">
        <Image
          src="/assets/soll/asteroid.png"
          alt=""
          width={1024}
          height={1024}
          sizes="(max-width: 767px) 100px, 190px"
        />
      </div>
      <div className="soll-asteroid soll-asteroid-right" aria-hidden="true">
        <Image
          src="/assets/soll/asteroid.png"
          alt=""
          width={1024}
          height={1024}
          sizes="(max-width: 767px) 140px, 300px"
        />
      </div>
      <div className="soll-scene-caption" aria-hidden="true">
        <span /> SCROLL TO EXPLORE <span>↓</span>
      </div>
    </div>
  );
}
