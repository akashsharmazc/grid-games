import React, { memo } from 'react';

// Memoized style component to prevent re-creation of CSS on every render
export const StyleTag = memo(() => (
  <style>{`
    /* --- Visual Identity Upgrades --- */
    /* Animated mesh background */
    body { background-attachment: fixed; }
    .mesh-bg { position: relative; }
    .mesh-bg::before {
      content: "";
      position: fixed; inset: -20vmax; z-index: -2;
      background:
        radial-gradient(40vmax 40vmax at 10% 10%, #ff8ad4 0%, transparent 60%),
        radial-gradient(45vmax 35vmax at 90% 20%, #8ab6ff 0%, transparent 60%),
        radial-gradient(35vmax 45vmax at 20% 90%, #b1ff8a 0%, transparent 60%),
        radial-gradient(50vmax 50vmax at 80% 80%, #ffd28a 0%, transparent 60%);
      filter: blur(40px) saturate(1.15);
      animation: meshShift 18s ease-in-out infinite alternate;
    }
    @keyframes meshShift {
      50% { transform: translate3d(2%, -1%, 0) scale(1.03); filter: blur(50px) saturate(1.2); }
      100% { transform: translate3d(-2%, 1%, 0) scale(1.04); }
    }
    /* Subtle noise film */
    .mesh-bg::after {
      content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0.05"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
      opacity: .15; mix-blend-mode: soft-light;
    }

    /* Neon grid backdrop for the board */
    .neon-grid {
      position: absolute; inset: 0; border-radius: 24px; overflow: hidden;
    }
    .neon-grid::before {
      content: ""; position: absolute; inset: 0;
      background:
        linear-gradient(transparent 98%, rgba(255,255,255,.12) 99%),
        linear-gradient(90deg, transparent 98%, rgba(255,255,255,.12) 99%);
      background-size: var(--cell) var(--cell), var(--cell) var(--cell);
      filter: drop-shadow(0 0 8px var(--glow));
      opacity: .35;
    }

    /* Tile styles: glassy, 3D tilt, neon ring focus */
    .tile { background: color-mix(in oklab, var(--tile), white 4%); box-shadow: inset 0 0 0 1px rgba(0,0,0,.04); backdrop-filter: saturate(1.2) blur(2px); }
    .tile-on { background: color-mix(in oklab, var(--tile-on), white 8%); box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); backdrop-filter: saturate(1.25) blur(2px); }
    .tile3d { transform-style: preserve-3d; transition: transform 180ms ease, box-shadow 200ms ease; }
    .tile3d:hover { transform: translateY(-2px) rotateX(1deg) rotateY(-1deg); box-shadow: 0 8px 24px var(--glow), inset 0 0 0 1px rgba(0,0,0,.06); }
    .tile3d:active { transform: translateY(0) scale(.98); }

    /* Neon animated border when focused */
    .focus-ring { position: relative; }
    .focus-ring::after {
      content: ""; position: absolute; inset: -2px; border-radius: 16px;
      background: conic-gradient(from 0deg, transparent, var(--primary), var(--accent), transparent 60%);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      padding: 2px; opacity: .0; transition: opacity .2s ease; filter: blur(.3px);
      animation: spinConic 2.8s linear infinite;
    }
    .focus-ring:focus-visible::after, .focus-ring.is-focused::after { opacity: .9; }
    @keyframes spinConic { to { transform: rotate(360deg); } }

    /* Ripple effect */
    .ripple-btn { position: relative; overflow: hidden; }
    .ripple-btn::after { content: ""; position: absolute; inset: 50% auto auto 50%; width: 0; height: 0; border-radius: 999px; background: currentColor; opacity: 0.15; transform: translate(-50%, -50%) scale(1); }
    .ripple-btn.rippling::after { animation: ripple .45s ease-out forwards; }
    @keyframes ripple { from { width: 0; height: 0; opacity: .25; } to { width: 220%; height: 220%; opacity: 0; } }

    /* SVG ink-stroke animation */
    .draw-line { stroke-dasharray: 10; stroke-dashoffset: 10; animation: dash 600ms ease forwards; filter: drop-shadow(0 0 6px var(--glow)); }
    @keyframes dash { to { stroke-dashoffset: 0; } }

    /* Smooth theme cross-fade */
    html, body, #root { transition: background 300ms ease, color 300ms ease; }
  `}</style>
));

StyleTag.displayName = 'StyleTag';
